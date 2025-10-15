// Importa as ferramentas necessárias do Deno (ambiente onde as Edge Functions rodam)
// e do Supabase para interagir com o banco de dados.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FIX: Declare Deno to resolve TypeScript errors in environments without Deno types.
declare const Deno: any;

interface BusinessHours {
    isEnabled: boolean;
    is24_7: boolean;
    days: {
        [key in number]?: {
            isOpen: boolean;
            startTime: string; // "HH:mm"
            endTime: string;   // "HH:mm"
        };
    };
}

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

    // 1. Busca todas as empresas com suas configurações de prospecção.
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("id, pipeline_stages, prospect_ai_settings");

    if (companiesError) throw companiesError;
    
    // Define o horário atual no fuso de São Paulo para a verificação.
    const now = new Date();
    const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dayOfWeek = saoPauloTime.getDay(); // 0 = Domingo, 1 = Segunda...
    const currentTimeInMinutes = saoPauloTime.getHours() * 60 + saoPauloTime.getMinutes();
    
    let totalLeadsReassigned = 0;

    // 2. Itera sobre cada empresa para verificar seu horário de funcionamento primeiro.
    for (const company of companies) {
      const settings = company.prospect_ai_settings;
      const businessHours: BusinessHours | undefined = settings?.business_hours;

      // --- VERIFICAÇÃO DE HORÁRIO DE FUNCIONAMENTO ---
      if (businessHours && businessHours.isEnabled && !businessHours.is24_7) {
        const todaySettings = businessHours.days[dayOfWeek];

        if (!todaySettings || !todaySettings.isOpen) {
          // A empresa está fechada hoje, pula para a próxima.
          continue;
        }
        
        const [startH, startM] = todaySettings.startTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;

        const [endH, endM] = todaySettings.endTime.split(':').map(Number);
        const endTimeInMinutes = endH * 60 + endM;

        if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
          // A empresa está fora do horário de expediente, pula para a próxima.
          continue;
        }
      }
      // --- Fim da Verificação de Horário ---
      
      // Se o código chegou aqui, a empresa está "aberta". Prossegue com as checagens de prazo.

      const { data: salespeople, error: salespeopleError } = await supabaseAdmin
        .from("team_members")
        .select("id, company_id, prospect_ai_settings")
        .eq("role", "Vendedor")
        .eq("company_id", company.id);
        
      if (salespeopleError || !salespeople) {
        console.error(`Error fetching salespeople for company ${company.id}:`, salespeopleError);
        continue;
      }

      const allOtherSalespeopleInCompany = salespeople.filter((sp: any) => sp.company_id === company.id);

      // 3. Itera sobre os vendedores da empresa que está aberta.
      for (const salesperson of salespeople) {
        const salespersonSettings: SalespersonSettings = salesperson.prospect_ai_settings;
        if (!salespersonSettings || !salespersonSettings.deadlines) continue;

        const companyStages = company.pipeline_stages;
        if (!Array.isArray(companyStages)) continue;

        // --- LÓGICA 1: VERIFICAR PRAZO DO PRIMEIRO CONTATO (LEADS NOVOS) ---
        const initialContactSettings = salespersonSettings.deadlines.initial_contact;
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
              } else if (overdueLeads.length > 0 && allOtherSalespeopleInCompany.length > 1) {
                   for (const lead of overdueLeads) {
                      let newSalespersonId: string | null = null;
                      const potentialTargets = allOtherSalespeopleInCompany.filter(sp => sp.id !== lead.salesperson_id);
                      if(potentialTargets.length === 0) continue;

                      if (initialContactSettings.reassignment_mode === "specific") {
                          newSalespersonId = initialContactSettings.reassignment_target_id;
                      } else { // "random"
                          const randomIndex = Math.floor(Math.random() * potentialTargets.length);
                          newSalespersonId = potentialTargets[randomIndex].id;
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