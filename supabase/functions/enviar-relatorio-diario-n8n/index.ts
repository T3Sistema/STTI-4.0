import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
declare const Deno: any;

interface Feedback {
  text: string;
  createdAt: string;
}

interface Atendimento {
  leadName: string;
  tipo: 'Farm' | 'Hunter';
  feedbacks: Feedback[];
}

interface ColaboradorData {
  id: string;
  name: string;
  atendimentosDoDia: Atendimento[];
}

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Buscar a URL do webhook do n8n
    const { data: webhookData, error: webhookError } = await supabaseAdmin
      .from("n8n_webhooks")
      .select("url")
      .eq("webhook_name", "RELATORIO_DIARIO_PROSPECCAO")
      .single();

    if (webhookError || !webhookData?.url) {
      throw new Error("Webhook 'RELATORIO_DIARIO_PROSPECCAO' não encontrado ou URL inválida.");
    }
    const n8nWebhookUrl = webhookData.url;

    // 2. Definir o período de 24 horas
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const reportDate = now.toISOString().split('T')[0];

    // 3. Buscar todas as empresas ativas
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("is_active", true);

    if (companiesError) throw companiesError;

    // 4. Processar cada empresa
    for (const company of companies) {
      console.log(`Processando empresa: ${company.name} (${company.id})`);

      // 5. Buscar todos os vendedores da empresa
      const { data: salespeople, error: salespeopleError } = await supabaseAdmin
        .from("team_members")
        .select("id, name")
        .eq("company_id", company.id)
        .eq("role", "Vendedor");
        
      if (salespeopleError) {
        console.error(`Erro ao buscar vendedores para a empresa ${company.name}:`, salespeopleError);
        continue;
      }
      
      const colaboradoresMap: Map<string, ColaboradorData> = new Map();
      salespeople.forEach(sp => {
        colaboradoresMap.set(sp.id, {
          id: sp.id,
          name: sp.name,
          atendimentosDoDia: [],
        });
      });

      // 6. Buscar leads do ProspectAI (Farm) com atividade nas últimas 24h
      const { data: farmLeads, error: farmLeadsError } = await supabaseAdmin
        .from("prospectai")
        .select("salesperson_id, lead_name, feedback")
        .eq("company_id", company.id)
        .gt("last_feedback_at", yesterday.toISOString());
        
      if (farmLeadsError) {
        console.error(`Erro ao buscar leads Farm para a empresa ${company.name}:`, farmLeadsError);
      } else {
        farmLeads.forEach(lead => {
          const colaborador = colaboradoresMap.get(lead.salesperson_id);
          if (colaborador && lead.feedback) {
            const feedbacksDoDia = lead.feedback.filter((fb: Feedback) => new Date(fb.createdAt) > yesterday);
            if (feedbacksDoDia.length > 0) {
              colaborador.atendimentosDoDia.push({
                leadName: lead.lead_name,
                tipo: 'Farm',
                feedbacks: feedbacksDoDia,
              });
            }
          }
        });
      }

      // 7. Buscar leads do Hunter com atividade nas últimas 24h
      const { data: hunterLeads, error: hunterLeadsError } = await supabaseAdmin
        .from("hunter_leads")
        .select("salesperson_id, lead_name, feedback")
        .eq("company_id", company.id)
        .gt("last_activity", yesterday.toISOString());
        
      if (hunterLeadsError) {
        console.error(`Erro ao buscar leads Hunter para a empresa ${company.name}:`, hunterLeadsError);
      } else {
        hunterLeads.forEach(lead => {
          const colaborador = colaboradoresMap.get(lead.salesperson_id);
          if (colaborador && lead.feedback) {
            const feedbacksDoDia = lead.feedback.filter((fb: Feedback) => new Date(fb.createdAt) > yesterday);
            if (feedbacksDoDia.length > 0) {
              colaborador.atendimentosDoDia.push({
                leadName: lead.lead_name,
                tipo: 'Hunter',
                feedbacks: feedbacksDoDia,
              });
            }
          }
        });
      }

      // 8. Montar e enviar o payload para o n8n
      const payload = {
        companyId: company.id,
        companyName: company.name,
        reportDate: reportDate,
        colaboradores: Array.from(colaboradoresMap.values()),
      };
      
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(`Erro ao enviar dados para o n8n para a empresa ${company.name}: ${response.statusText}`);
        } else {
          console.log(`Relatório da empresa ${company.name} enviado com sucesso para o n8n.`);
        }
      } catch (e) {
        console.error(`Falha na requisição fetch para o n8n (Empresa: ${company.name}):`, e);
      }
    }

    return new Response(
      JSON.stringify({ message: "Processo de envio de relatórios concluído." }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Erro geral na função:", err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
