// Importa as ferramentas necessárias do Deno (ambiente onde as Edge Functions rodam)
// e do Supabase para interagir com o banco de dados.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @-fix: Declare Deno to resolve TypeScript errors in environments without Deno types.
declare const Deno: any;

// Define a interface para as configurações de prazo para garantir a tipagem do código.
interface SalespersonSettings {
  deadlines: {
    initial_contact: {
      minutes: number;
      auto_reassign_enabled: boolean;
      reassignment_mode: "random" | "specific";
      reassignment_target_id: string | null;
    };
    first_feedback?: {
      minutes: number;
      auto_reassign_enabled: boolean;
      reassignment_mode: "random" | "specific";
      reassignment_target_id: string | null;
    };
  };
}

// A função principal que será executada quando a Edge Function for chamada.
serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Busca todas as empresas para ter acesso ao pipeline_stages de cada uma.
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("id, pipeline_stages");

    if (companiesError) throw companiesError;
    
    const companyStageMap = new Map(companies.map(c => [c.id, c.pipeline_stages]));

    // 2. Busca todos os vendedores com suas configurações individuais.
    const { data: salespeople, error: salespeopleError } = await supabaseAdmin
        .from("team_members")
        .select("id, company_id, prospect_ai_settings")
        .eq("role", "Vendedor");
    
    if(salespeopleError) throw salespeopleError;

    let totalLeadsReassigned = 0;

    // 3. Itera sobre cada vendedor para verificar seus leads.
    for (const salesperson of salespeople) {
      const settings: SalespersonSettings = salesperson.prospect_ai_settings;
      if (!settings || !settings.deadlines) continue;

      const companyStages = companyStageMap.get(salesperson.company_id);
      if (!Array.isArray(companyStages)) continue;
      
      const allOtherSalespeopleInCompany = salespeople.filter(sp => sp.company_id === salesperson.company_id && sp.id !== salesperson.id);

      // --- LÓGICA 1: VERIFICAR PRAZO DO PRIMEIRO CONTATO (LEADS NOVOS) ---
      const initialContactSettings = settings.deadlines.initial_contact;
      if (initialContactSettings?.auto_reassign_enabled) {
        const novosLeadsStage = companyStages.find((stage: any) => stage.name === "Novos Leads");
        if (novosLeadsStage) {
            const timeLimit = new Date(Date.now() - initialContactSettings.minutes * 60 * 1000).toISOString();
            const { data: overdueLeads, error: leadsError } = await supabaseAdmin
                .from("prospectai")
                .select("id, salesperson_id, details")
                .eq("salesperson_id", salesperson.id)
                .eq("stage_id", novosLeadsStage.id)
                .lt("created_at", timeLimit);
            
            if (leadsError) {
                console.error(`Error fetching overdue initial leads for salesperson ${salesperson.id}:`, leadsError);
            } else if (overdueLeads.length > 0 && allOtherSalespeopleInCompany.length > 0) {
                 for (const lead of overdueLeads) {
                    let newSalespersonId: string | null = null;
                    if (initialContactSettings.reassignment_mode === "specific") {
                        newSalespersonId = initialContactSettings.reassignment_target_id;
                    } else { // "random"
                        const randomIndex = Math.floor(Math.random() * allOtherSalespeopleInCompany.length);
                        newSalespersonId = allOtherSalespeopleInCompany[randomIndex].id;
                    }

                    if (!newSalespersonId || newSalespersonId === lead.salesperson_id) continue;

                    const newDetails = { ...(lead.details || {}), reassigned_by_system: true, reassigned_from: lead.salesperson_id, reassigned_to: newSalespersonId, reassigned_at: new Date().toISOString(), reason: "Initial contact deadline missed." };
                    const { error: updateError } = await supabaseAdmin.from("prospectai").update({ salesperson_id: newSalespersonId, details: newDetails }).eq("id", lead.id);

                    if (updateError) console.error(`Error reassigning initial lead ${lead.id}:`, updateError);
                    else totalLeadsReassigned++;
                }
            }
        }
      }

      // --- LÓGICA 2: VERIFICAR PRAZO DO PRIMEIRO FEEDBACK (EM "PRIMEIRA TENTATIVA") ---
      const firstFeedbackSettings = settings.deadlines.first_feedback;
      if (firstFeedbackSettings?.auto_reassign_enabled) {
        const primeiraTentativaStage = companyStages.find((stage: any) => stage.name === "Primeira Tentativa");
        if (primeiraTentativaStage) {
            const timeLimit = new Date(Date.now() - firstFeedbackSettings.minutes * 60 * 1000).toISOString();
            const { data: overdueFeedbackLeads, error: feedbackLeadsError } = await supabaseAdmin
                .from("prospectai")
                .select("id, salesperson_id, details")
                .eq("salesperson_id", salesperson.id)
                .eq("stage_id", primeiraTentativaStage.id)
                .lt("prospected_at", timeLimit) // Baseado em quando a prospecção começou
                .or("feedback.is.null,feedback.eq.[]"); // Sem nenhum feedback ainda

            if (feedbackLeadsError) {
                console.error(`Error fetching overdue feedback leads for salesperson ${salesperson.id}:`, feedbackLeadsError);
            } else if (overdueFeedbackLeads.length > 0 && allOtherSalespeopleInCompany.length > 0) {
                for (const lead of overdueFeedbackLeads) {
                    let newSalespersonId: string | null = null;
                    if (firstFeedbackSettings.reassignment_mode === "specific") {
                        newSalespersonId = firstFeedbackSettings.reassignment_target_id;
                    } else { // "random"
                        const randomIndex = Math.floor(Math.random() * allOtherSalespeopleInCompany.length);
                        newSalespersonId = allOtherSalespeopleInCompany[randomIndex].id;
                    }

                    if (!newSalespersonId || newSalespersonId === lead.salesperson_id) continue;

                    const newDetails = { ...(lead.details || {}), reassigned_by_system: true, reassigned_from: lead.salesperson_id, reassigned_to: newSalespersonId, reassigned_at: new Date().toISOString(), reason: "First feedback deadline missed." };
                    const { error: updateError } = await supabaseAdmin.from("prospectai").update({ salesperson_id: newSalespersonId, details: newDetails }).eq("id", lead.id);

                    if (updateError) console.error(`Error reassigning feedback lead ${lead.id}:`, updateError);
                    else totalLeadsReassigned++;
                }
            }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Verification complete. Reassigned ${totalLeadsReassigned} leads.` }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});