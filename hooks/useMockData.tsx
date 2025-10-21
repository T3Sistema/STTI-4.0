import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { Company, Vehicle, TeamMember, Notification, UserRole, MaterialRequest, Reminder, AdminUser, AdminNotification, LogEntry, LogType, MaintenanceRecord, ProspectAILead, GrupoEmpresarial, PipelineStage, SalespersonProspectAISettings, HunterLead, MonitorSettings, MonitorChatMessage, BusinessHours, ProspectAISettings, LiveAgentConfig, DailyReport } from '../types';

// DATA CONTEXT
interface DataContextType {
    isLoading: boolean;
    companies: Company[];
    vehicles: Vehicle[];
    teamMembers: TeamMember[];
    reminders: Reminder[];
    maintenanceRecords: MaintenanceRecord[];
    deactivatedAdVehicleIds: Set<string>;
    notifications: Notification[];
    materialRequests: MaterialRequest[];
    adminUsers: AdminUser[];
    adminNotifications: AdminNotification[];
    logs: LogEntry[];
    prospectaiLeads: ProspectAILead[];
    hunterLeads: HunterLead[];
    gruposEmpresariais: GrupoEmpresarial[];
    monitorSettings: MonitorSettings | null;
    monitorChatHistory: MonitorChatMessage[];
    liveAgentConfigs: LiveAgentConfig[];
    dailyReports: DailyReport[];
    toolboxUrl: string | null;
    updateCompanyStatus: (id: string, isActive: boolean) => Promise<void>;
    addCompany: (companyData: Omit<Company, 'id' | 'isActive' | 'monthlySalesGoal' | 'pipeline_stages'>, password: string) => Promise<void>;
    updateCompany: (company: Company) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;
    addVehicle: (vehicle: Omit<Vehicle, 'id'> & { maintenance: MaintenanceRecord[] }) => Promise<void>;
    updateVehicle: (vehicle: Vehicle & { maintenance: MaintenanceRecord[] }) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
    addTeamMember: (teamMember: Omit<TeamMember, 'id' | 'companyId' | 'avatarUrl' | 'encrypted_password'>, companyId: string) => Promise<void>;
    updateTeamMember: (teamMember: TeamMember) => Promise<void>;
    deleteTeamMember: (id: string) => Promise<void>;
    addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => Promise<void>;
    updateReminder: (reminder: Reminder) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;
    markVehicleAsSold: (id: string) => Promise<void>;
    assignSalesperson: (vehicleId: string, salespersonId: string | null) => Promise<void>;
    toggleVehiclePriority: (id: string) => Promise<void>;
    toggleVehicleAdStatus: (id: string) => Promise<void>;
    markAdAsDeactivated: (vehicleId: string) => void;
    addNotification: (message: string, recipientRole: UserRole, userId?: string) => void;
    markNotificationAsRead: (id: string) => void;
    addMaterialRequest: (request: Omit<MaterialRequest, 'id' | 'date' | 'status'>) => void;
    addAdminUser: (user: Omit<AdminUser, 'id'> & { password?: string }) => Promise<void>;
    updateAdminUser: (user: AdminUser) => Promise<void>;
    deleteAdminUser: (id: string) => Promise<void>;
    addAdminNotification: (message: string, type: AdminNotification['type']) => void;
    markAdminNotificationAsRead: (id: string) => void;
    logActivity: (type: LogType, description: string, details?: { companyId?: string; userId?: string; }) => Promise<void>;
    updateUserPassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    updateAdminPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string; }>;
    requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; }>;
    resetPasswordWithToken: (token: string, newPassword: string) => Promise<{ success: boolean; message: string; }>;
    getN8nWebhook: (name: string) => Promise<string | null>;
    updateN8nWebhook: (name: string, url: string) => Promise<void>;
    updateGrupoUserPassword: (groupId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string; }>;
    updateGrupoUserProfile: (groupId: string, data: { bannerUrl: string; responsiblePhotoUrl: string; }) => Promise<GrupoEmpresarial | null>;
    updateProspectLeadStatus: (leadId: string, newStageId: string, details?: Record<string, any>) => Promise<void>;
    updateProspectLead: (leadId: string, updates: Partial<ProspectAILead>) => Promise<void>;
    reassignProspectLead: (leadId: string, newSalespersonId: string, originalSalespersonId: string) => Promise<void>;
    addProspectLeadFeedback: (leadId: string, feedbackText: string, images: string[]) => Promise<void>;
    transferProspectLead: (leadId: string, newSalespersonId: string, originalSalespersonId: string, feedback: { text: string, images: string[] }) => Promise<void>;
    addHunterLeadAction: (lead: HunterLead, feedbackText: string, images: string[], targetStageId: string, outcome?: 'convertido' | 'nao_convertido' | null, appointment_at?: string) => Promise<void>;
    transferHunterLead: (leadId: string, newSalespersonId: string, originalSalespersonId: string, feedback: { text: string, images: string[] }) => Promise<void>;
    reassignHunterLead: (leadId: string, newSalespersonId: string, originalSalespersonId: string | null) => Promise<void>;
    addGrupoEmpresarial: (grupo: Omit<GrupoEmpresarial, 'id' | 'companyIds' | 'createdAt' | 'isActive'>, password: string) => Promise<void>;
    updateGrupoEmpresarial: (grupo: Omit<GrupoEmpresarial, 'companyIds'>) => Promise<void>;
    updateGrupoCompanies: (groupId: string, companyIds: string[]) => Promise<void>;
    updateGrupoEmpresarialStatus: (groupId: string, isActive: boolean) => Promise<void>;
    addPipelineStage: (companyId: string, stageData: Omit<PipelineStage, 'id' | 'isFixed' | 'isEnabled'>) => Promise<void>;
    updatePipelineStage: (companyId: string, stage: Partial<PipelineStage> & { id: string }) => Promise<void>;
    deletePipelineStage: (companyId: string, stageId: string) => Promise<{ success: boolean; message?: string }>;
    uploadHunterLeads: (leads: any[]) => Promise<void>;
    addHunterLead: (leadData: { name: string; phone: string; companyId: string; salespersonId: string; details: Record<string, string>; }) => Promise<void>;
    updateHunterLead: (leadId: string, updates: any) => Promise<HunterLead>;
    updateMonitorSettings: (settings: Omit<MonitorSettings, 'id'>) => Promise<void>;
    addMonitorChatMessage: (message: Omit<MonitorChatMessage, 'id' | 'created_at'>) => Promise<void>;
    saveLiveAgentConfig: (config: Omit<LiveAgentConfig, 'id' | 'updatedAt'>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper function to convert data URL to a File object
const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) { return null; }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { return null; }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// Helper functions to map from DB snake_case to client camelCase
const mapVehicleFromDB = (v: any): Vehicle => ({
    id: v.id,
    companyId: v.company_id,
    brand: v.brand,
    model: v.model,
    category: v.category,
    color: v.color,
    plate: v.plate,
    purchasePrice: v.purchase_price,
    announcedPrice: v.announced_price,
    discount: v.discount,
    entryDate: v.entry_date,
    dailyCost: v.daily_cost,
    saleGoalDays: v.sale_goal_days,
    adCost: v.ad_cost,
    salespersonId: v.salesperson_id,
    imageUrl: v.image_url,
    status: v.status,
    saleDate: v.sale_date,
    description: v.description,
    ipvaDueDate: v.ipva_due_date,
    ipvaCost: v.ipva_cost,
    isPriority: v.is_priority,
    isAdActive: v.is_ad_active,
    modelYear: v.model_year,
    fabricationYear: v.fabrication_year,
    renavam: v.renavam,
    mileage: v.mileage,
    fuelType: v.fuel_type,
    transmission: v.transmission,
    traction: v.traction,
    doors: v.doors,
    occupants: v.occupants,
    chassis: v.chassis,
    history: v.history,
    revisions: v.revisions,
    standardItems: v.standard_items,
    additionalAccessories: v.additional_accessories,
    documentStatus: v.document_status,
});

const defaultSalespersonSettings: SalespersonProspectAISettings = {
    deadlines: {
        initial_contact: {
            minutes: 60,
            auto_reassign_enabled: false,
            reassignment_mode: 'random',
            reassignment_target_id: null,
        },
        first_feedback: {
            minutes: 240, // 4 hours
            auto_reassign_enabled: false,
            reassignment_mode: 'random',
            reassignment_target_id: null,
        }
    },
};


const mapTeamMemberFromDB = (tm: any): TeamMember => ({
    id: tm.id,
    companyId: tm.company_id,
    name: tm.name,
    email: tm.email,
    phone: tm.phone,
    avatarUrl: tm.avatar_url,
    monthlySalesGoal: tm.monthly_sales_goal,
    role: tm.role,
    prospectAISettings: {
        ...defaultSalespersonSettings,
        ...(tm.prospect_ai_settings || {}),
        deadlines: {
            ...defaultSalespersonSettings.deadlines,
            ...((tm.prospect_ai_settings && tm.prospect_ai_settings.deadlines) || {}),
        },
    },
    isHunterModeActive: tm.is_hunter_mode_active ?? false,
});

const mapProspectFromDB = (p: any): ProspectAILead => ({
    id: p.id,
    createdAt: p.created_at,
    companyId: p.company_id,
    salespersonId: p.salesperson_id,
    leadName: p.lead_name,
    leadPhone: p.lead_phone,
    interestVehicle: p.interest_vehicle,
    stage_id: p.stage_id,
    outcome: p.outcome,
    rawLeadData: p.raw_lead_data,
    details: p.details,
    appointment_at: p.appointment_at,
    feedback: p.feedback,
    prospected_at: p.prospected_at,
    last_feedback_at: p.last_feedback_at,
});

const mapHunterLeadFromDB = (hl: any): HunterLead => ({
    id: hl.id,
    createdAt: hl.created_at,
    companyId: hl.company_id,
    salespersonId: hl.salesperson_id,
    leadName: hl.lead_name,
    leadPhone: hl.lead_phone,
    source: hl.source,
    stage_id: hl.stage_id,
    outcome: hl.outcome,
    feedback: hl.feedback || [],
    lastActivity: hl.last_activity,
    prospected_at: hl.prospected_at,
    appointment_at: hl.appointment_at,
    details: hl.details,
});

const mapGrupoFromDB = (g: any): GrupoEmpresarial => ({
    id: g.id,
    name: g.name,
    bannerUrl: g.banner_url,
    responsibleName: g.responsible_name,
    responsiblePhotoUrl: g.responsible_photo_url,
    accessEmail: g.access_email,
    phone: g.phone,
    birthDate: g.birth_date,
    companyIds: g.company_ids || [],
    createdAt: g.created_at,
    isActive: g.is_active === null ? true : g.is_active,
});

const mapTeamMemberToDB = (tm: TeamMember) => ({
    name: tm.name,
    email: tm.email,
    phone: tm.phone,
    avatar_url: tm.avatarUrl,
    monthly_sales_goal: tm.monthlySalesGoal,
    role: tm.role,
    prospect_ai_settings: tm.prospectAISettings,
    is_hunter_mode_active: tm.isHunterModeActive,
});

const defaultBusinessHours: BusinessHours = {
    isEnabled: false,
    is24_7: false,
    days: {
        0: { isOpen: false, startTime: '09:00', endTime: '18:00' }, // Sunday
        1: { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Monday
        2: { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Tuesday
        3: { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Wednesday
        4: { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Thursday
        5: { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Friday
        6: { isOpen: false, startTime: '09:00', endTime: '18:00' }, // Saturday
    }
};

const defaultCompanyProspectAISettings: ProspectAISettings = {
  show_monthly_leads_kpi: { enabled: false, visible_to: [] },
  business_hours: defaultBusinessHours,
  overdue_leads_lock: { enabled: false, apply_to: 'all', lock_after_time: '08:00' },
};

const mapCompanyFromDB = (c: any): Company => ({
    id: c.id,
    name: c.name,
    isActive: c.is_active,
    logoUrl: c.logo_url,
    cnpj: c.cnpj,
    phone: c.phone,
    email: c.email,
    instagram: c.instagram,
    ownerName: c.owner_name,
    ownerPhone: c.owner_phone,
    ownerEmail: c.owner_email,
    monthlySalesGoal: c.monthly_sales_goal,
    monthlyAdBudget: c.monthly_ad_budget,
    marketingDriveUrl: c.marketing_drive_url,
    visibleFields: c.visible_fields,
    enabledFeatures: c.enabled_features || ['estoque_inteligente', 'prospectai', 'marketing'], // Default all for backwards compatibility
    pipeline_stages: c.pipeline_stages || [],
    prospectAISettings: {
        ...defaultCompanyProspectAISettings,
        ...(c.prospect_ai_settings || {}),
        business_hours: {
            ...defaultBusinessHours,
            ...((c.prospect_ai_settings && c.prospect_ai_settings.business_hours) || {}),
            days: {
                ...defaultBusinessHours.days,
                ...((c.prospect_ai_settings && c.prospect_ai_settings.business_hours && c.prospect_ai_settings.business_hours.days) || {})
            }
        },
        overdue_leads_lock: {
            ...defaultCompanyProspectAISettings.overdue_leads_lock,
            ...((c.prospect_ai_settings && c.prospect_ai_settings.overdue_leads_lock) || {}),
        }
    },
    createdAt: c.created_at,
});

const mapMaintenanceFromDB = (m: any): MaintenanceRecord => ({
    id: m.id,
    vehicleId: m.vehicle_id,
    description: m.description,
    cost: m.cost,
    date: m.date,
    invoiceUrl: m.invoice_url
});

const mapLiveAgentConfigFromDB = (c: any): LiveAgentConfig => ({
    id: c.id,
    companyId: c.company_id,
    // Section 1
    agentName: c.agent_name || '',
    companyProjectName: c.company_project_name || '',
    agentRole: c.agent_role || '',
    // Section 2
    roleDescription: c.role_description || '',
    mission: c.mission || '',
    toneOfVoice: c.tone_of_voice || [],
    // Section 3
    mandatoryQuestions: c.mandatory_questions || [],
    optionalQuestions: c.optional_questions || [],
    greetingMessages: c.greeting_messages || '',
    // Section 4
    doRules: c.do_rules || [],
    dontRules: c.dont_rules || [],
    forbiddenWords: c.forbidden_words || '',
    // Section 5
    interactionExamples: c.interaction_examples || '',
    // Section 6
    finalSummaryFormat: c.final_summary_format || '',
    // Section 7
    finalNotes: c.final_notes || '',
    // Section 8
    serviceMode: c.service_mode || null,
    updatedAt: c.updated_at,
});


const defaultPipelineStages: PipelineStage[] = [
  { id: crypto.randomUUID(), name: 'Novos Leads', stageOrder: 0, isFixed: true, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Primeira Tentativa', stageOrder: 1, isFixed: false, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Segunda Tentativa', stageOrder: 2, isFixed: false, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Terceira Tentativa', stageOrder: 3, isFixed: false, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Em Negociação', stageOrder: 4, isFixed: false, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Agendado', stageOrder: 5, isFixed: false, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Finalizados', stageOrder: 99, isFixed: true, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Remanejados', stageOrder: 100, isFixed: true, isEnabled: true },
  { id: crypto.randomUUID(), name: 'Atendimentos Transferidos', stageOrder: 101, isFixed: true, isEnabled: true },
];


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [prospectaiLeads, setProspectaiLeads] = useState<ProspectAILead[]>([]);
    const [hunterLeads, setHunterLeads] = useState<HunterLead[]>([]);
    const [gruposEmpresariais, setGruposEmpresariais] = useState<GrupoEmpresarial[]>([]);
    const [monitorSettings, setMonitorSettings] = useState<MonitorSettings | null>(null);
    const [monitorChatHistory, setMonitorChatHistory] = useState<MonitorChatMessage[]>([]);
    const [liveAgentConfigs, setLiveAgentConfigs] = useState<LiveAgentConfig[]>([]);
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [toolboxUrl, setToolboxUrl] = useState<string | null>(null);

    // Client-side only state for now
    const [deactivatedAdVehicleIds, setDeactivatedAdVehicleIds] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);

    const addAdminNotification = (message: string, type: AdminNotification['type']) => {
        const newNotification: AdminNotification = {
            id: crypto.randomUUID(),
            message,
            type,
            date: new Date().toISOString(),
            read: false
        };
        setAdminNotifications(prev => [newNotification, ...prev]);
    };

    const markAdminNotificationAsRead = (id: string) => {
        setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    // Fetch initial data and set up realtime subscriptions
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [
                    { data: companiesData, error: companiesError },
                    { data: teamMembersData, error: teamMembersError },
                    { data: vehiclesData, error: vehiclesError },
                    { data: maintenanceData, error: maintenanceError },
                    { data: remindersData, error: remindersError },
                    { data: logsData, error: logsError },
                    { data: adminUsersData, error: adminUsersError },
                    { data: prospectaiData, error: prospectaiError },
                    { data: hunterLeadsData, error: hunterLeadsError },
                    { data: gruposData, error: gruposError },
                    { data: monitorSettingsData, error: monitorSettingsError },
                    { data: monitorChatHistoryData, error: monitorChatHistoryError },
                    { data: toolboxConfigData, error: toolboxConfigError },
                    { data: liveAgentConfigsData, error: liveAgentConfigsError },
                    { data: dailyReportsData, error: dailyReportsError },
                ] = await Promise.all([
                    supabase.from('companies').select('*').order('created_at', { ascending: true }),
                    supabase.from('team_members').select('*'), // Fetch all fields including settings
                    supabase.from('vehicles').select('*'),
                    supabase.from('maintenance_records').select('*'),
                    supabase.from('reminders').select('*'),
                    supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(200),
                    supabase.from('admin_users').select('id, name, email'),
                    supabase.from('prospectai').select('*').order('created_at', { ascending: false }),
                    supabase.from('hunter_leads').select('*').order('created_at', { ascending: false }),
                    supabase.from('grupos_empresariais').select('*').order('created_at', { ascending: true }),
                    supabase.from('monitor_settings').select('*').single(),
                    supabase.from('monitor_chat_history').select('*').order('created_at', { ascending: true }),
                    supabase.from('toolbox_config').select('url').single(),
                    supabase.from('live_agent_configs').select('*'),
                    supabase.from('daily_reports').select('*').order('report_date', { ascending: false }),
                ]);

                if (companiesError) throw companiesError;
                if (teamMembersError) throw teamMembersError;
                if (vehiclesError) throw vehiclesError;
                if (maintenanceError) throw maintenanceError;
                if (remindersError) throw remindersError;
                if (logsError) throw logsError;
                if (adminUsersError) throw adminUsersError;
                if (prospectaiError) throw prospectaiError;
                if (hunterLeadsError) throw hunterLeadsError;
                if (gruposError) throw gruposError;
                if (monitorSettingsError) throw monitorSettingsError;
                if (monitorChatHistoryError) throw monitorChatHistoryError;
                if (liveAgentConfigsError) throw liveAgentConfigsError;
                if (dailyReportsError) throw dailyReportsError;
                if (toolboxConfigError && toolboxConfigError.code !== 'PGRST116') {
                    console.error("Error fetching toolbox config:", toolboxConfigError);
                }
                
                // MAP DB snake_case to client camelCase
                const mappedCompanies: Company[] = (companiesData || []).map(mapCompanyFromDB);
                const mappedTeamMembers: TeamMember[] = (teamMembersData || []).map(mapTeamMemberFromDB);
                const mappedVehicles: Vehicle[] = (vehiclesData || []).map(mapVehicleFromDB);
                const mappedMaintenance: MaintenanceRecord[] = (maintenanceData || []).map(mapMaintenanceFromDB);
                const mappedProspects: ProspectAILead[] = (prospectaiData || []).map(mapProspectFromDB);
                const mappedHunterLeads: HunterLead[] = (hunterLeadsData || []).map(mapHunterLeadFromDB);
                const mappedGrupos: GrupoEmpresarial[] = (gruposData || []).map(mapGrupoFromDB);
                const mappedLiveAgentConfigs: LiveAgentConfig[] = (liveAgentConfigsData || []).map(mapLiveAgentConfigFromDB);

                const enrichedVehicles = mappedVehicles.map(vehicle => ({
                    ...vehicle,
                    maintenance: mappedMaintenance.filter(mr => mr.vehicleId === vehicle.id),
                }));

                setCompanies(mappedCompanies || []);
                setTeamMembers(mappedTeamMembers || []);
                setVehicles(enrichedVehicles);
                setMaintenanceRecords(mappedMaintenance || []);
                setReminders(remindersData || []);
                setAdminUsers(adminUsersData || []);
                setProspectaiLeads(mappedProspects || []);
                setHunterLeads(mappedHunterLeads || []);
                setGruposEmpresariais(mappedGrupos || []);
                setMonitorSettings(monitorSettingsData || null);
                setMonitorChatHistory(monitorChatHistoryData || []);
                setLiveAgentConfigs(mappedLiveAgentConfigs || []);
                setDailyReports(dailyReportsData || []);
                setToolboxUrl(toolboxConfigData?.url || null);
                
                const enrichedLogs = (logsData || []).map((log: any) => ({
                    ...log,
                    companyName: (mappedCompanies || []).find(c => c.id === log.company_id)?.name,
                    userName: (mappedTeamMembers || []).find((tm: any) => tm.id === log.user_id)?.name,
                }));
                setLogs(enrichedLogs);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        
        // --- REALTIME SUBSCRIPTIONS ---

        const handleInsert = (setter: any, mapper?: (payload: any) => any, prepend = false) => (payload: any) => {
            const newItem = mapper ? mapper(payload.new) : payload.new;
            setter((prev: any[]) => {
                if (prev.some(item => item.id === newItem.id)) return prev;
                return prepend ? [newItem, ...prev] : [...prev, newItem];
            });
        };

        const handleUpdate = (setter: any, mapper?: (payload: any) => any) => (payload: any) => {
            const updatedItem = mapper ? mapper(payload.new) : payload.new;
            setter((prev: any[]) => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        };

        const handleDelete = (setter: any) => (payload: any) => {
            setter((prev: any[]) => prev.filter(item => item.id !== payload.old.id));
        };

        const createSubscription = (channelName: string, table: string, setter: any, mapper?: (payload: any) => any, prependOnInsert = false) => {
            return supabase.channel(channelName)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, handleInsert(setter, mapper, prependOnInsert))
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, handleUpdate(setter, mapper))
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, handleDelete(setter))
                .subscribe();
        };

        const teamMemberSubscription = createSubscription('realtime:team_members', 'team_members', setTeamMembers, mapTeamMemberFromDB);
        const companiesSubscription = createSubscription('realtime:companies', 'companies', setCompanies, mapCompanyFromDB);
        const prospectaiSubscription = createSubscription('realtime:prospectai', 'prospectai', setProspectaiLeads, mapProspectFromDB, true);
        const hunterLeadsSubscription = createSubscription('realtime:hunter_leads', 'hunter_leads', setHunterLeads, mapHunterLeadFromDB, true);
        const remindersSubscription = createSubscription('realtime:reminders', 'reminders', setReminders);
        const gruposSubscription = createSubscription('realtime:grupos_empresariais', 'grupos_empresariais', setGruposEmpresariais, mapGrupoFromDB);
        const chatSubscription = createSubscription('realtime:monitor_chat_history', 'monitor_chat_history', setMonitorChatHistory);
        const liveAgentConfigsSubscription = createSubscription('realtime:live_agent_configs', 'live_agent_configs', setLiveAgentConfigs, mapLiveAgentConfigFromDB);
        const dailyReportsSubscription = createSubscription('realtime:daily_reports', 'daily_reports', setDailyReports, undefined, true);
        
        const vehiclesSubscription = supabase.channel('realtime:vehicles')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicles' }, (payload) => {
                const newVehicle = mapVehicleFromDB(payload.new);
                newVehicle.maintenance = [];
                setVehicles(prev => [...prev.filter(v => v.id !== newVehicle.id), newVehicle]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicles' }, (payload) => {
                const updatedVehicle = mapVehicleFromDB(payload.new);
                setVehicles(prev => prev.map(v => 
                    v.id === updatedVehicle.id ? { ...updatedVehicle, maintenance: v.maintenance } : v
                ));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vehicles' }, (payload) => {
                setVehicles(prev => prev.filter(v => v.id !== payload.old.id));
            })
            .subscribe();

        const maintenanceSubscription = supabase.channel('realtime:maintenance_records')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newRecord = mapMaintenanceFromDB(payload.new);
                    setMaintenanceRecords(prev => [...prev.filter(r => r.id !== newRecord.id), newRecord]);
                    setVehicles(prev => prev.map(v => v.id === newRecord.vehicleId ? { ...v, maintenance: [...(v.maintenance || []), newRecord] } : v));
                } else if (payload.eventType === 'UPDATE') {
                    const updatedRecord = mapMaintenanceFromDB(payload.new);
                    setMaintenanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
                    setVehicles(prev => prev.map(v => v.id === updatedRecord.vehicleId ? { ...v, maintenance: (v.maintenance || []).map(m => m.id === updatedRecord.id ? updatedRecord : m) } : v));
                } else if (payload.eventType === 'DELETE') {
                    const deletedRecord = payload.old as { id: string, vehicle_id: string };
                    setMaintenanceRecords(prev => prev.filter(r => r.id !== deletedRecord.id));
                    setVehicles(prev => prev.map(v => v.id === deletedRecord.vehicle_id ? { ...v, maintenance: (v.maintenance || []).filter(m => m.id !== deletedRecord.id) } : v));
                }
            })
            .subscribe();
        
        const logsSubscription = supabase.channel('realtime:logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
                const newLog: LogEntry = payload.new as LogEntry;
                setLogs(prev => [newLog, ...prev.filter(l => l.id !== newLog.id)]);
            }).subscribe();
        
        const monitorSettingsSubscription = supabase.channel('realtime:monitor_settings')
             .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'monitor_settings' }, (payload) => {
                setMonitorSettings(payload.new as MonitorSettings);
             }).subscribe();

        const toolboxSubscription = supabase.channel('realtime:toolbox_config')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'toolbox_config' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setToolboxUrl((payload.new as { url: string }).url);
                } else if (payload.eventType === 'DELETE') {
                    setToolboxUrl(null);
                }
            }).subscribe();

        // Cleanup subscriptions on component unmount
        return () => {
          supabase.removeChannel(teamMemberSubscription);
          supabase.removeChannel(companiesSubscription);
          supabase.removeChannel(prospectaiSubscription);
          supabase.removeChannel(hunterLeadsSubscription);
          supabase.removeChannel(remindersSubscription);
          supabase.removeChannel(gruposSubscription);
          supabase.removeChannel(chatSubscription);
          supabase.removeChannel(vehiclesSubscription);
          supabase.removeChannel(maintenanceSubscription);
          supabase.removeChannel(logsSubscription);
          supabase.removeChannel(monitorSettingsSubscription);
          supabase.removeChannel(toolboxSubscription);
          supabase.removeChannel(liveAgentConfigsSubscription);
          supabase.removeChannel(dailyReportsSubscription);
        };
    }, []);

    const logActivity = async (type: LogType, description: string, details: { companyId?: string, userId?: string } = {}) => {
        const company = companies.find(c => c.id === details.companyId);
        const user = teamMembers.find(tm => tm.id === details.userId);

        const newLog = {
            type,
            description,
            company_id: company?.id,
            user_id: user?.id,
        };

        const { data, error } = await supabase.from('logs').insert(newLog).select();
        
        if (error) {
            console.error("Error logging activity:", error);
            return;
        }
        
        if (!data || data.length === 0) return;

        // The realtime subscription will handle updating the state, so we don't need to do it here.
    };

    const updateCompanyStatus = async (id: string, isActive: boolean) => {
        const company = companies.find(c => c.id === id);
        if (!company) return;

        // Optimistic UI update is no longer needed as realtime handles it.
        const { data, error } = await supabase.from('companies').update({ is_active: isActive }).eq('id', id).select().single();
        
        if (error) {
            console.error("Error updating company status:", error);
            alert("Falha ao atualizar status. Verifique suas permissões de banco de dados (RLS).");
            return;
        }

        if (data) {
            setCompanies(prev => prev.map(c => c.id === id ? { ...c, isActive } : c));
        }

        await logActivity(
            isActive ? 'COMPANY_APPROVED' : 'COMPANY_DEACTIVATED',
            `Empresa ${company.name} foi ${isActive ? 'aprovada' : 'desativada'}.`,
            { companyId: id }
        );
    };

    const addCompany = async (companyData: Omit<Company, 'id' | 'isActive' | 'monthlySalesGoal' | 'pipeline_stages'>, password: string) => {
        // 1. Upload logo if provided
        let finalLogoUrl = companyData.logoUrl;
        if (companyData.logoUrl && companyData.logoUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(companyData.logoUrl, `logo-${Date.now()}`);
            if (file) {
                const filePath = `public/company-logos/${crypto.randomUUID()}`;
                const { error: uploadError } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (uploadError) {
                    console.error("Error uploading logo:", uploadError);
                } else {
                    const { data: urlData } = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath);
                    finalLogoUrl = urlData.publicUrl;
                }
            }
        }
        
        // 2. Insert company into public.companies table
        const newCompanyData = {
            name: companyData.name,
            logo_url: finalLogoUrl,
            cnpj: companyData.cnpj,
            phone: companyData.phone,
            email: companyData.email,
            instagram: companyData.instagram,
            owner_name: companyData.ownerName,
            owner_phone: companyData.ownerPhone,
            owner_email: companyData.ownerEmail,
            is_active: false,
            monthly_sales_goal: 10,
            enabled_features: companyData.enabledFeatures,
            prospect_ai_settings: defaultCompanyProspectAISettings,
            pipeline_stages: defaultPipelineStages,
        };

        const { data, error } = await supabase.from('companies').insert(newCompanyData).select().single();
        
        if (error) {
            console.error("Error adding company:", error);
            // This re-throws the error to be caught in the form component
            if (error.code === '23502' && error.message.includes('pipeline_stages')) {
                 throw new Error('Ocorreu um erro interno: o pipeline de prospecção não foi definido. Contate o suporte.');
            }
            throw new Error("Não foi possível registrar a empresa no banco de dados.");
        }
        
        const companyId = data.id;

        // 3. Insert the main user (Gestor) into public.team_members
        const newTeamMember = {
            id: crypto.randomUUID(), // Using crypto.randomUUID for new users
            company_id: companyId,
            name: companyData.ownerName || 'Gestor Principal',
            email: companyData.ownerEmail,
            encrypted_password: password, // Storing password directly (as per original logic)
            role: 'Gestor' as const,
            avatar_url: 'https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/molduras/Screenshot%202025-08-25%20182827.png',
        };
        
        const { error: teamMemberError } = await supabase.from('team_members').insert(newTeamMember).select().single();

        if (teamMemberError) {
            console.error("Error adding initial team member:", teamMemberError);
            await supabase.from('companies').delete().eq('id', companyId);
            throw new Error("Não foi possível criar o perfil do gestor.");
        }

        setCompanies(prev => [...prev, mapCompanyFromDB(data)]);
        addAdminNotification(`Nova empresa cadastrada: ${data.name}.`, 'new_company');
        await logActivity('COMPANY_PENDING', `Empresa ${data.name} cadastrada e aguardando aprovação.`, { companyId: data.id });
    };

    const updateCompany = async (updatedCompany: Company) => {
        const { id, ...companyData } = updatedCompany;
        let finalLogoUrl = companyData.logoUrl;

        if (companyData.logoUrl && companyData.logoUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(companyData.logoUrl, `logo-${Date.now()}`);
            if (file) {
                const filePath = `public/company-logos/${crypto.randomUUID()}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('estoqueinteligentetriad3')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Error uploading new logo:", uploadError);
                    const oldCompany = companies.find(c => c.id === id);
                    finalLogoUrl = oldCompany ? oldCompany.logoUrl : '';
                } else {
                    const { data: urlData } = supabase.storage
                        .from('estoqueinteligentetriad3')
                        .getPublicUrl(filePath);
                    finalLogoUrl = urlData.publicUrl;
                }
            }
        }
        
        const companyUpdateData = {
            name: companyData.name,
            is_active: companyData.isActive,
            logo_url: finalLogoUrl,
            cnpj: companyData.cnpj,
            phone: companyData.phone,
            email: companyData.email,
            owner_email: companyData.ownerEmail,
            instagram: companyData.instagram,
            owner_name: companyData.ownerName,
            owner_phone: companyData.ownerPhone,
            monthly_sales_goal: companyData.monthlySalesGoal,
            monthly_ad_budget: companyData.monthlyAdBudget,
            marketing_drive_url: companyData.marketingDriveUrl,
            visible_fields: companyData.visibleFields,
            enabled_features: companyData.enabledFeatures,
            pipeline_stages: companyData.pipeline_stages,
            prospect_ai_settings: companyData.prospectAISettings,
        };

        const { data, error } = await supabase.from('companies').update(companyUpdateData).eq('id', id).select().single();
        
        if (error) {
            console.error("Error updating company:", error);
            return;
        }
        
        if (data) {
            setCompanies(prev => prev.map(c => c.id === id ? mapCompanyFromDB(data) : c));
        }
    };

    const deleteCompany = async (id: string) => {
        const companyToDelete = companies.find(c => c.id === id);
        if(!companyToDelete) return;
        
        await logActivity('COMPANY_DELETED', `Empresa ${companyToDelete.name} e todos os seus dados foram removidos.`, { companyId: id });
        
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) {
            console.error("Error deleting company:", error);
            return;
        }
        setCompanies(prev => prev.filter(c => c.id !== id));
    };

    const addVehicle = async (vehicleData: Omit<Vehicle, 'id'> & { maintenance: MaintenanceRecord[] }) => {
        const { maintenance, ...vehicle } = vehicleData;
        let finalImageUrl = vehicle.imageUrl;

        if (vehicle.imageUrl && vehicle.imageUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(vehicle.imageUrl, `vehicle-${Date.now()}`);
            if (file) {
                const filePath = `public/vehicle-images/${crypto.randomUUID()}`;
                const { error: uploadError } = await supabase.storage
                    .from('estoqueinteligentetriad3')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Error uploading vehicle image:", uploadError);
                    finalImageUrl = '';
                } else {
                    const { data: urlData } = supabase.storage
                        .from('estoqueinteligentetriad3')
                        .getPublicUrl(filePath);
                    finalImageUrl = urlData.publicUrl;
                }
            }
        }

        const newVehicleData = {
            company_id: vehicle.companyId, brand: vehicle.brand, model: vehicle.model,
            category: vehicle.category, color: vehicle.color, plate: vehicle.plate,
            purchase_price: vehicle.purchasePrice, announced_price: vehicle.announcedPrice,
            discount: vehicle.discount, entry_date: vehicle.entryDate,
            daily_cost: vehicle.dailyCost, sale_goal_days: vehicle.saleGoalDays,
            ad_cost: vehicle.adCost, image_url: finalImageUrl, description: vehicle.description,
            ipva_due_date: vehicle.ipvaDueDate, ipva_cost: vehicle.ipvaCost,
            model_year: vehicle.modelYear, fabrication_year: vehicle.fabricationYear,
            renavam: vehicle.renavam, mileage: vehicle.mileage, fuel_type: vehicle.fuelType,
            transmission: vehicle.transmission, traction: vehicle.traction, doors: vehicle.doors,
            occupants: vehicle.occupants, chassis: vehicle.chassis, history: vehicle.history,
            revisions: vehicle.revisions, standard_items: vehicle.standardItems,
            additional_accessories: vehicle.additionalAccessories, document_status: vehicle.documentStatus,
            is_ad_active: false,
        };

        const { data: vehicleResult, error: vehicleError } = await supabase
            .from('vehicles').insert(newVehicleData).select().single();

        if (vehicleError) return console.error("Error adding vehicle:", vehicleError);

        const newVehicleId = vehicleResult.id;

        if (maintenance && maintenance.length > 0) {
            const maintenanceToInsert = maintenance.map(m => ({
                vehicle_id: newVehicleId, description: m.description, cost: m.cost,
                date: new Date().toISOString(), invoice_url: m.invoiceUrl,
            }));

            const { data: maintenanceResult, error: maintenanceError } = await supabase
                .from('maintenance_records').insert(maintenanceToInsert).select();
            
            if (maintenanceError) console.error("Error adding maintenance:", maintenanceError);

            const newVehicle = { ...mapVehicleFromDB(vehicleResult), maintenance: maintenanceResult.map(mapMaintenanceFromDB) };
            setVehicles(prev => [...prev, newVehicle]);

        } else {
             setVehicles(prev => [...prev, { ...mapVehicleFromDB(vehicleResult), maintenance: [] }]);
        }
        
        await logActivity('VEHICLE_CREATED', `Veículo ${vehicle.brand} ${vehicle.model} cadastrado.`, { companyId: vehicle.companyId });
    };

    const updateVehicle = async (vehicleData: Vehicle & { maintenance: MaintenanceRecord[] }) => {
        const { maintenance, id, ...vehicle } = vehicleData;
        let finalImageUrl = vehicle.imageUrl;

        if (vehicle.imageUrl && vehicle.imageUrl.startsWith('data:image/')) {
             const file = dataURLtoFile(vehicle.imageUrl, `vehicle-${Date.now()}`);
            if (file) {
                const filePath = `public/vehicle-images/${crypto.randomUUID()}`;
                const { error: uploadError } = await supabase.storage
                    .from('estoqueinteligentetriad3')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Error uploading vehicle image:", uploadError);
                    const oldVehicle = vehicles.find(v => v.id === id);
                    finalImageUrl = oldVehicle ? oldVehicle.imageUrl : '';
                } else {
                    const { data: urlData } = supabase.storage
                        .from('estoqueinteligentetriad3')
                        .getPublicUrl(filePath);
                    finalImageUrl = urlData.publicUrl;
                }
            }
        }

        const vehicleUpdateData = {
            company_id: vehicle.companyId, brand: vehicle.brand, model: vehicle.model,
            category: vehicle.category, color: vehicle.color, plate: vehicle.plate,
            purchase_price: vehicle.purchasePrice, announced_price: vehicle.announcedPrice,
            discount: vehicle.discount, entry_date: vehicle.entryDate,
            daily_cost: vehicle.dailyCost, sale_goal_days: vehicle.saleGoalDays,
            ad_cost: vehicle.adCost, salesperson_id: vehicle.salespersonId,
            image_url: finalImageUrl, status: vehicle.status, sale_date: vehicle.saleDate,
            description: vehicle.description, ipva_due_date: vehicle.ipvaDueDate,
            ipva_cost: vehicle.ipvaCost, is_priority: vehicle.isPriority,
            is_ad_active: vehicle.isAdActive, model_year: vehicle.modelYear,
            fabrication_year: vehicle.fabricationYear, renavam: vehicle.renavam,
            mileage: vehicle.mileage, fuel_type: vehicle.fuelType,
            transmission: vehicle.transmission, traction: vehicle.traction, doors: vehicle.doors,
            occupants: vehicle.occupants, chassis: vehicle.chassis, history: vehicle.history,
            revisions: vehicle.revisions, standard_items: vehicle.standardItems,
            additional_accessories: vehicle.additionalAccessories,
            document_status: vehicle.documentStatus,
        };

        const { data, error: vehicleError } = await supabase.from('vehicles').update(vehicleUpdateData).eq('id', id!).select().single();
        if (vehicleError) return console.error("Error updating vehicle:", vehicleError);

        const { error: deleteError } = await supabase.from('maintenance_records').delete().eq('vehicle_id', id!);
        if (deleteError) console.error("Error deleting old maintenance:", deleteError);
        
        let newMaintenance: MaintenanceRecord[] = [];
        if (maintenance && maintenance.length > 0) {
            const maintenanceToInsert = maintenance.map(m => ({
                vehicle_id: id, description: m.description, cost: m.cost,
                date: m.date, invoice_url: m.invoiceUrl,
            }));
            const { data: maintenanceResult, error: insertError } = await supabase.from('maintenance_records').insert(maintenanceToInsert).select();
            if (insertError) console.error("Error inserting new maintenance:", insertError);
            else if (maintenanceResult) newMaintenance = maintenanceResult.map(mapMaintenanceFromDB);
        }

        if (data) {
            setVehicles(prev => prev.map(v => v.id === id ? { ...mapVehicleFromDB(data), maintenance: newMaintenance } : v));
        }
    };

    const deleteVehicle = async (id: string) => {
        const vehicleToDelete = vehicles.find(v => v.id === id);
        if (!vehicleToDelete) return;

        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) return console.error("Error deleting vehicle:", error);
        
        setVehicles(prev => prev.filter(v => v.id !== id));
        await logActivity('VEHICLE_DELETED', `Veículo ${vehicleToDelete.brand} ${vehicleToDelete.model} removido.`, { companyId: vehicleToDelete.companyId });
    };

    const addTeamMember = async (teamMemberData: Omit<TeamMember, 'id' | 'companyId' | 'avatarUrl' | 'encrypted_password'>, companyId: string) => {
        const avatarUrl = 'https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/molduras/Screenshot%202025-08-25%20182827.png';
        const newMemberData = {
            id: crypto.randomUUID(),
            company_id: companyId,
            name: teamMemberData.name,
            email: teamMemberData.email,
            phone: teamMemberData.phone,
            monthly_sales_goal: teamMemberData.monthlySalesGoal,
            role: teamMemberData.role,
            avatar_url: avatarUrl,
            encrypted_password: '123',
            is_hunter_mode_active: false,
        };

        const { data, error } = await supabase.from('team_members').insert(newMemberData).select().single();
        if (error) {
            console.error("Error adding team member:", error);
            return;
        }

        if (data) {
            setTeamMembers(prev => [...prev, mapTeamMemberFromDB(data)]);
        }
        await logActivity('USER_CREATED', `Novo membro da equipe adicionado: ${teamMemberData.name}.`, { companyId });
    };

    const updateTeamMember = async (teamMember: TeamMember) => {
        let finalAvatarUrl = teamMember.avatarUrl;

        // Check if a new avatar (base64) was provided and upload it
        if (teamMember.avatarUrl && teamMember.avatarUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(teamMember.avatarUrl, `avatar-${teamMember.id}-${Date.now()}`);
            if (file) {
                const filePath = `public/avatars/${teamMember.id}/${crypto.randomUUID()}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('estoqueinteligentetriad3')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Error uploading new avatar:", uploadError);
                    const oldMember = teamMembers.find(tm => tm.id === teamMember.id);
                    finalAvatarUrl = oldMember ? oldMember.avatarUrl : ''; 
                } else {
                    const { data: urlData } = supabase.storage
                        .from('estoqueinteligentetriad3')
                        .getPublicUrl(filePath);
                    finalAvatarUrl = urlData.publicUrl;
                }
            }
        }

        const teamMemberWithFinalAvatar = { ...teamMember, avatarUrl: finalAvatarUrl };
        const updateData = mapTeamMemberToDB(teamMemberWithFinalAvatar);
        const { data, error } = await supabase.from('team_members').update(updateData).eq('id', teamMember.id).select().single();
        
        if (error) {
            console.error("Error updating team member:", error);
            return;
        }
        
        if (data) {
            setTeamMembers(prev => prev.map(tm => tm.id === teamMember.id ? mapTeamMemberFromDB(data) : tm));
        }
        await logActivity('USER_UPDATED', `Dados do membro ${teamMember.name} atualizados.`, { companyId: teamMember.companyId, userId: teamMember.id });
    };

    const deleteTeamMember = async (id: string) => {
        const memberToDelete = teamMembers.find(tm => tm.id === id);
        if (!memberToDelete) return;
        
        if (memberToDelete.role === 'Gestor') {
            alert('Não é possível excluir um usuário com o cargo de Gestor.');
            return;
        }

        const { error } = await supabase.from('team_members').delete().eq('id', id);
        if (error) {
            console.error("Error deleting team member:", error);
            return;
        }
        
        setTeamMembers(prev => prev.filter(tm => tm.id !== id));
        await logActivity('USER_DELETED', `Membro ${memberToDelete.name} foi removido.`, { companyId: memberToDelete.companyId });
    };

    const markVehicleAsSold = async (id: string) => {
        const vehicleToSell = vehicles.find(v => v.id === id);
        if (!vehicleToSell) return;

        const saleDate = new Date().toISOString();
        const { data, error } = await supabase.from('vehicles').update({ status: 'sold', sale_date: saleDate }).eq('id', id).select().single();
        if (error) return console.error("Error marking as sold:", error);

        if (data) {
            setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: 'sold', saleDate } : v));
        }
        await logActivity('VEHICLE_SOLD', `Veículo ${vehicleToSell.brand} ${vehicleToSell.model} vendido.`, { companyId: vehicleToSell.companyId });
    };

    const assignSalesperson = async (vehicleId: string, salespersonId: string | null) => {
        const { data, error } = await supabase.from('vehicles').update({ salesperson_id: salespersonId }).eq('id', vehicleId).select().single();
        if (error) return console.error("Error assigning salesperson:", error);

        if (data) {
            setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, salespersonId } : v));
        }
    };

    const toggleVehiclePriority = async (id: string) => {
        const vehicle = vehicles.find(v => v.id === id);
        if (!vehicle) return;
        const newPriority = !vehicle.isPriority;
        const { data, error } = await supabase.from('vehicles').update({ is_priority: newPriority }).eq('id', id).select().single();
        if (error) return console.error("Error toggling priority:", error);

        if (data) {
            setVehicles(prev => prev.map(v => v.id === id ? { ...v, isPriority: newPriority } : v));
        }
    };

    const toggleVehicleAdStatus = async (id: string) => {
        const vehicle = vehicles.find(v => v.id === id);
        if (!vehicle) return;
        const newAdStatus = !vehicle.isAdActive;
        const { data, error } = await supabase.from('vehicles').update({ is_ad_active: newAdStatus }).eq('id', id).select().single();
        if (error) return console.error("Error toggling ad status:", error);
        
        if (data) {
            setVehicles(prev => prev.map(v => v.id === id ? { ...v, isAdActive: newAdStatus } : v));
        }
    };
    
    const updateUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
        const { data: user, error: fetchError } = await supabase
            .from('team_members')
            .select('encrypted_password')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return { success: false, message: 'Usuário não encontrado.' };
        }
        if (user.encrypted_password !== currentPassword) {
            return { success: false, message: 'A senha atual está incorreta.' };
        }
        const { error: updateError } = await supabase
            .from('team_members')
            .update({ encrypted_password: newPassword })
            .eq('id', userId);

        if (updateError) {
            return { success: false, message: 'Não foi possível alterar a senha.' };
        }
        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    const updateAdminPassword = async (currentPassword: string, newPassword: string) => {
        const adminUserStr = sessionStorage.getItem('adminUser');
        if (!adminUserStr) {
            return { success: false, message: 'Sessão de administrador inválida.' };
        }
        const adminUser: AdminUser = JSON.parse(adminUserStr);
        const adminId = adminUser.id;

        const { data: user, error: fetchError } = await supabase
            .from('admin_users')
            .select('encrypted_password')
            .eq('id', adminId)
            .single();

        if (fetchError || !user) {
            console.error("Error fetching admin user:", fetchError);
            return { success: false, message: 'Não foi possível verificar o administrador.' };
        }

        if (user.encrypted_password !== currentPassword) {
            return { success: false, message: 'A senha atual está incorreta.' };
        }

        const { data: updatedData, error: updateError } = await supabase
            .from('admin_users')
            .update({ encrypted_password: newPassword })
            .eq('id', adminId)
            .select();

        if (updateError || !updatedData || updatedData.length === 0) {
            console.error("Error updating admin password:", updateError);
            return { success: false, message: 'Ocorreu um erro ao atualizar a senha. Verifique suas permissões ou contate o suporte.' };
        }

        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    const requestPasswordReset = async (email: string): Promise<{ success: boolean, message?: string }> => {
        const { data, error } = await supabase.rpc('handle_password_reset', { user_email: email });

        if (error) {
            console.error('Error calling password reset function:', error);
            return { success: false, message: 'Erro ao processar a solicitação. Tente novamente mais tarde.' };
        }
        return { success: true };
    };

    const resetPasswordWithToken = async (token: string, newPassword: string): Promise<{ success: boolean, message: string }> => {
        const { data, error } = await supabase.rpc('reset_password_with_token', {
            p_token: token,
            p_new_password: newPassword,
        });
    
        if (error) {
            console.error('Error calling reset password function:', error);
            return { success: false, message: 'Ocorreu um erro ao tentar redefinir a senha. Tente novamente.' };
        }
        
        return data;
    };

    const getN8nWebhook = async (name: string): Promise<string | null> => {
        const { data, error } = await supabase.from('n8n_webhooks').select('url').eq('webhook_name', name).single();
        if (error || !data) {
            // It's not an error if it doesn't exist, just return null
            if (error && error.code !== 'PGRST116') {
                 console.error('Error fetching webhook:', error);
            }
            return null;
        }
        return data.url;
    };

    const updateN8nWebhook = async (name: string, url: string): Promise<void> => {
        const { error } = await supabase.from('n8n_webhooks').upsert({ webhook_name: name, url }, { onConflict: 'webhook_name' });
        if (error) {
            console.error('Error updating webhook:', error);
            throw new Error('Não foi possível salvar o webhook.');
        }
    };

    const addAdminUser = async (userData: Omit<AdminUser, 'id'> & { password?: string }) => {
        const { data, error } = await supabase.rpc('create_admin_user', {
            new_name: userData.name,
            new_email: userData.email,
            new_password: userData.password,
        });

        if (error) {
            console.error("Error adding admin user:", error);
            return;
        }
        
        // RPCs that return a table/SETOF return an array.
        // The function is designed to return a single row in an array.
        if (data && data.length > 0) {
            const newUser: AdminUser = data[0];
            setAdminUsers(prev => [...prev, newUser]);
        }
    };

    const updateProspectLeadStatus = async (leadId: string, newStageId: string, newDetails?: Record<string, any>) => {
        const leadToUpdate = prospectaiLeads.find(l => l.id === leadId);
        if (!leadToUpdate) {
            console.error("Lead not found for update");
            return;
        }

        const company = companies.find(c => c.id === leadToUpdate.companyId);
        if (!company) {
             console.error("Company not found for lead");
            return;
        }

        const newStage = company.pipeline_stages.find(s => s.id === newStageId);
        if (!newStage) {
            console.error("Stage not found for update");
            return;
        }

        const updatePayload: {
            stage_id: string;
            outcome?: 'convertido' | 'nao_convertido' | null;
            prospected_at?: string;
            details?: any;
            appointment_at?: string | null;
        } = { stage_id: newStageId };

        if (newStage.name === 'Primeira Tentativa' && !leadToUpdate.prospected_at) {
            updatePayload.prospected_at = new Date().toISOString();
        }

        const currentDetails = leadToUpdate.details || {};
        if (currentDetails.appointment_date) {
            delete currentDetails.appointment_date;
        }
        updatePayload.details = currentDetails;

        if (newStage.name === 'Finalizados') {
            if (newDetails?.outcome === 'convertido') {
                updatePayload.outcome = 'convertido';
            } else if (newDetails?.outcome === 'nao_convertido') {
                updatePayload.outcome = 'nao_convertido';
            }
        } else {
            updatePayload.outcome = null;
        }

        if (newStage.name === 'Agendado' && newDetails?.appointment_date) {
            // A data/hora local é recebida e convertida para o formato ISO (UTC) antes de ser enviada.
            // Isso garante que o fuso horário seja tratado corretamente pelo banco de dados.
            updatePayload.appointment_at = new Date(newDetails.appointment_date).toISOString();
        } else if (newStage.name !== 'Agendado') {
            updatePayload.appointment_at = null;
        }

        if (Object.keys(updatePayload.details).length === 0) {
            updatePayload.details = null;
        }

        const { data, error } = await supabase
            .from('prospectai')
            .update(updatePayload)
            .eq('id', leadId)
            .select()
            .single();

        if (error) {
            console.error("Error updating lead status:", error);
            return;
        }

        if (data) {
            const updatedLead = mapProspectFromDB(data);
            setProspectaiLeads(prevLeads =>
                prevLeads.map(lead => (lead.id === updatedLead.id ? updatedLead : lead))
            );
        }
    };

    const updateProspectLead = async (leadId: string, updates: Partial<ProspectAILead>) => {
        // FIX: Map camelCase properties from the type to snake_case for the database.
        const dbUpdates: { [key: string]: any } = {};
        if (updates.leadName !== undefined) dbUpdates.lead_name = updates.leadName;
        // Adicione outros mapeamentos se necessário

        const { data, error } = await supabase.from('prospectai').update(dbUpdates).eq('id', leadId).select().single();
        if (error) {
            console.error("Error updating prospect lead:", error);
            return;
        }
        if (data) {
            setProspectaiLeads(prev => prev.map(l => l.id === leadId ? mapProspectFromDB(data) : l));
        }
    };

    const reassignProspectLead = async (leadId: string, newSalespersonId: string, originalSalespersonId: string) => {
        const leadToUpdate = prospectaiLeads.find(l => l.id === leadId);
        if (!leadToUpdate) return;
        
        const company = companies.find(c => c.id === leadToUpdate.companyId);
        if (!company) {
            console.error("Could not find company for lead.");
            return;
        }

        const novoLeadStage = company.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novoLeadStage) {
            console.error("Could not find 'Novos Leads' stage for company.");
            return;
        }

        const newDetails = {
            ...(leadToUpdate.details || {}),
            reassigned_from: originalSalespersonId,
            reassigned_to: newSalespersonId,
            reassigned_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('prospectai')
            .update({ 
                salesperson_id: newSalespersonId,
                stage_id: novoLeadStage.id,
                details: newDetails,
                // Reset lead state for the new owner
                prospected_at: null,
                last_feedback_at: null,
                feedback: [],
                outcome: null,
                appointment_at: null,
            })
            .eq('id', leadId)
            .select()
            .single();

        if (error) { console.error("Error reassigning lead:", error); return; }
        
        if (data) {
            setProspectaiLeads(prev => prev.map(l => l.id === leadId ? mapProspectFromDB(data) : l));
        }
    };

    const transferProspectLead = async (leadId: string, newSalespersonId: string, originalSalespersonId: string, feedback: { text: string, images: string[] }) => {
        const leadToUpdate = prospectaiLeads.find(l => l.id === leadId);
        if (!leadToUpdate) return;

        const company = companies.find(c => c.id === leadToUpdate.companyId);
        if (!company) {
            console.error("Could not find company for lead.");
            return;
        }

        const novosLeadsStage = company.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novosLeadsStage) {
            console.error("Could not find 'Novos Leads' stage for company.");
            return;
        }

        const imageUrls: string[] = [];
        for (const imageBase64 of feedback.images) {
            const file = dataURLtoFile(imageBase64, `transfer-feedback-${leadId}-${Date.now()}`);
            if (file) {
                const filePath = `public/feedback-images/${leadId}/${crypto.randomUUID()}`;
                const { error: uploadError } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath);
                    imageUrls.push(urlData.publicUrl);
                }
            }
        }
        
        const now = new Date().toISOString();
        const newFeedbackEntry = {
            text: feedback.text,
            images: imageUrls,
            createdAt: now,
            stageId: leadToUpdate.stage_id,
        };
        const updatedFeedback = [...(leadToUpdate.feedback || []), newFeedbackEntry];

        const newDetails = {
            ...(leadToUpdate.details || {}),
            transferred_from: originalSalespersonId,
            transferred_to: newSalespersonId,
            transferred_at: now,
        };

        const { data, error } = await supabase
            .from('prospectai')
            .update({ 
                salesperson_id: newSalespersonId,
                stage_id: novosLeadsStage.id,
                details: newDetails,
                feedback: updatedFeedback,
                last_feedback_at: now,
                prospected_at: null,
                appointment_at: null,
                outcome: null
            })
            .eq('id', leadId)
            .select()
            .single();

        if (error) { console.error("Error transferring lead:", error); return; }

        if (data) {
            setProspectaiLeads(prev => prev.map(l => l.id === leadId ? mapProspectFromDB(data) : l));
        }
    };
    
    const addProspectLeadFeedback = async (leadId: string, feedbackText: string, images: string[]) => {
        try {
            const imageUrls: string[] = [];
            for (const imageBase64 of images) {
                const file = dataURLtoFile(imageBase64, `feedback-${leadId}-${Date.now()}`);
                if (file) {
                    const filePath = `public/feedback-images/${leadId}/${crypto.randomUUID()}`;
                    const { error: uploadError } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                    
                    if (uploadError) {
                        console.error("Error uploading feedback image:", uploadError);
                    } else {
                        const { data: urlData } = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath);
                        imageUrls.push(urlData.publicUrl);
                    }
                }
            }

            const { data: currentLeadData, error: fetchError } = await supabase
                .from('prospectai')
                .select('feedback, stage_id')
                .eq('id', leadId)
                .single();

            if (fetchError) throw fetchError;

            const currentFeedback = currentLeadData.feedback || [];
            const newFeedback = {
                text: feedbackText,
                images: imageUrls,
                createdAt: new Date().toISOString(),
                stageId: currentLeadData.stage_id,
            };

            const updatedFeedback = [...currentFeedback, newFeedback];
            const updatePayload = {
                feedback: updatedFeedback,
                last_feedback_at: new Date().toISOString(),
            };

            const { data, error: updateError } = await supabase
                .from('prospectai')
                .update(updatePayload)
                .eq('id', leadId)
                .select()
                .single();

            if (updateError) throw updateError;
            
            if (data) {
                setProspectaiLeads(prev => prev.map(l => l.id === leadId ? mapProspectFromDB(data) : l));
            }

        } catch (error) {
            console.error("Failed to add feedback:", error);
        }
    };
    
    const addGrupoEmpresarial = async (grupoData: Omit<GrupoEmpresarial, 'id' | 'companyIds' | 'createdAt' | 'isActive'>, password: string) => {
        let finalBannerUrl = grupoData.bannerUrl;
        if (grupoData.bannerUrl && grupoData.bannerUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(grupoData.bannerUrl, `banner-${Date.now()}`);
            if (file) {
                const filePath = `public/grupos-empresariais/${crypto.randomUUID()}`;
                const { error } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (error) console.error('Error uploading banner:', error);
                else finalBannerUrl = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath).data.publicUrl;
            }
        }

        let finalPhotoUrl = grupoData.responsiblePhotoUrl;
        if (grupoData.responsiblePhotoUrl && grupoData.responsiblePhotoUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(grupoData.responsiblePhotoUrl, `photo-${Date.now()}`);
            if (file) {
                const filePath = `public/grupos-empresariais/${crypto.randomUUID()}`;
                const { error } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (error) console.error('Error uploading photo:', error);
                else finalPhotoUrl = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath).data.publicUrl;
            }
        }

        const newGrupo = {
            name: grupoData.name,
            banner_url: finalBannerUrl,
            responsible_name: grupoData.responsibleName,
            responsible_photo_url: finalPhotoUrl,
            access_email: grupoData.accessEmail,
            encrypted_password: password,
            phone: grupoData.phone,
            birth_date: grupoData.birthDate,
            company_ids: [],
            is_active: true,
        };

        const { data, error } = await supabase.from('grupos_empresariais').insert(newGrupo).select().single();
        if (error) return console.error("Error adding grupo:", error);

        if(data) {
            setGruposEmpresariais(prev => [...prev, mapGrupoFromDB(data)]);
        }
    };

    const updateGrupoEmpresarial = async (grupo: Omit<GrupoEmpresarial, 'companyIds'>) => {
        let finalBannerUrl = grupo.bannerUrl;
        if (grupo.bannerUrl && grupo.bannerUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(grupo.bannerUrl, `banner-${grupo.id}-${Date.now()}`);
            if (file) {
                const filePath = `public/grupos-empresariais/${crypto.randomUUID()}`;
                const { error } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (error) console.error('Error uploading new banner:', error);
                else finalBannerUrl = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath).data.publicUrl;
            }
        }

        let finalPhotoUrl = grupo.responsiblePhotoUrl;
        if (grupo.responsiblePhotoUrl && grupo.responsiblePhotoUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(grupo.responsiblePhotoUrl, `photo-${grupo.id}-${Date.now()}`);
            if (file) {
                const filePath = `public/grupos-empresariais/${crypto.randomUUID()}`;
                const { error } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (error) console.error('Error uploading new photo:', error);
                else finalPhotoUrl = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath).data.publicUrl;
            }
        }

        const updateData = {
            name: grupo.name,
            banner_url: finalBannerUrl,
            responsible_name: grupo.responsibleName,
            responsible_photo_url: finalPhotoUrl,
            access_email: grupo.accessEmail,
            phone: grupo.phone,
            birth_date: grupo.birthDate,
            is_active: grupo.isActive,
        };

        const { data, error } = await supabase.from('grupos_empresariais').update(updateData).eq('id', grupo.id).select().single();
        if (error) return console.error("Error updating grupo:", error);
        
        if(data) {
            setGruposEmpresariais(prev => prev.map(g => g.id === grupo.id ? mapGrupoFromDB(data) : g));
        }
    };

    const updateGrupoCompanies = async (groupId: string, companyIds: string[]) => {
        const { data, error } = await supabase.from('grupos_empresariais').update({ company_ids: companyIds }).eq('id', groupId).select().single();
        if (error) return console.error("Error updating grupo companies:", error);
        
        if(data) {
            setGruposEmpresariais(prev => prev.map(g => g.id === groupId ? mapGrupoFromDB(data) : g));
        }
    };

    const updateGrupoEmpresarialStatus = async (groupId: string, isActive: boolean) => {
        const { data, error } = await supabase.from('grupos_empresariais').update({ is_active: isActive }).eq('id', groupId).select().single();
        if (error) {
            console.error("Error updating grupo status:", error);
            return;
        }
         if(data) {
            setGruposEmpresariais(prev => prev.map(g => g.id === groupId ? mapGrupoFromDB(data) : g));
        }
    };

    const updateGrupoUserProfile = async (groupId: string, data: { bannerUrl: string, responsiblePhotoUrl: string }): Promise<GrupoEmpresarial | null> => {
        let finalBannerUrl = data.bannerUrl;
        if (data.bannerUrl && data.bannerUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(data.bannerUrl, `banner-${groupId}-${Date.now()}`);
            if (file) {
                const filePath = `public/grupos-empresariais/${crypto.randomUUID()}`;
                const { error } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (error) console.error('Error uploading banner:', error);
                else finalBannerUrl = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath).data.publicUrl;
            }
        }

        let finalPhotoUrl = data.responsiblePhotoUrl;
        if (data.responsiblePhotoUrl && data.responsiblePhotoUrl.startsWith('data:image/')) {
            const file = dataURLtoFile(data.responsiblePhotoUrl, `photo-${groupId}-${Date.now()}`);
            if (file) {
                const filePath = `public/grupos-empresariais/${crypto.randomUUID()}`;
                const { error } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (error) console.error('Error uploading photo:', error);
                else finalPhotoUrl = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath).data.publicUrl;
            }
        }

        const updateData = {
            banner_url: finalBannerUrl,
            responsible_photo_url: finalPhotoUrl,
        };

        const { data: updatedData, error } = await supabase.from('grupos_empresariais').update(updateData).eq('id', groupId).select().single();
        if (error) {
            console.error("Error updating grupo profile:", error);
            return null;
        }

        const mappedUser = mapGrupoFromDB(updatedData);
        setGruposEmpresariais(prev => prev.map(g => g.id === groupId ? mappedUser : g));
        return mappedUser;
    };

    const updateGrupoUserPassword = async (groupId: string, currentPassword: string, newPassword: string) => {
        const { data: user, error: fetchError } = await supabase
            .from('grupos_empresariais')
            .select('encrypted_password')
            .eq('id', groupId)
            .single();

        if (fetchError || !user) {
            return { success: false, message: 'Usuário não encontrado.' };
        }
        if (user.encrypted_password !== currentPassword) {
            return { success: false, message: 'A senha atual está incorreta.' };
        }
        const { error: updateError } = await supabase
            .from('grupos_empresariais')
            .update({ encrypted_password: newPassword })
            .eq('id', groupId);

        if (updateError) {
            return { success: false, message: 'Não foi possível alterar a senha.' };
        }
        return { success: true, message: 'Senha alterada com sucesso!' };
    };

    const addNotification = (message: string, recipientRole: UserRole, userId?: string) => {
        const newNotification: Notification = {
            id: crypto.randomUUID(),
            message,
            recipientRole,
            userId,
            date: new Date().toISOString(),
            read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
    };
    
    const addPipelineStage = async (companyId: string, stageData: Omit<PipelineStage, 'id' | 'isFixed' | 'isEnabled'>) => {
        const company = companies.find(c => c.id === companyId);
        if (!company) return;

        const newStage: PipelineStage = {
            id: crypto.randomUUID(),
            name: stageData.name,
            stageOrder: stageData.stageOrder,
            isFixed: false,
            isEnabled: true,
        };
        
        const newStages = [...company.pipeline_stages, newStage].sort((a, b) => a.stageOrder - b.stageOrder);
        
        const { data, error } = await supabase
            .from('companies')
            .update({ pipeline_stages: newStages })
            .eq('id', companyId)
            .select('pipeline_stages')
            .single();

        if (error) {
            console.error("Error adding pipeline stage:", error);
            return;
        }

        if(data) {
           setCompanies(prev => prev.map(c => c.id === companyId ? {...c, pipeline_stages: data.pipeline_stages} : c));
        }
    };

    const updatePipelineStage = async (companyId: string, stage: Partial<PipelineStage> & { id: string }) => {
        const company = companies.find(c => c.id === companyId);
        if (!company) return;

        const newStages = company.pipeline_stages.map(s => 
            s.id === stage.id ? { ...s, ...stage } : s
        );

        const { data, error } = await supabase
            .from('companies')
            .update({ pipeline_stages: newStages })
            .eq('id', companyId)
            .select('pipeline_stages')
            .single();

        if (error) {
            console.error("Error updating pipeline stage:", error);
            return;
        }
        
        if (data) {
             setCompanies(prev => prev.map(c => c.id === companyId ? {...c, pipeline_stages: data.pipeline_stages} : c));
        }
    };

    const deletePipelineStage = async (companyId: string, stageId: string): Promise<{ success: boolean; message?: string }> => {
        const { count, error: countError } = await supabase
            .from('prospectai')
            .select('*', { count: 'exact', head: true })
            .eq('stage_id', stageId);

        if (countError) {
            console.error("Error checking for leads in stage:", countError);
            return { success: false, message: 'Não foi possível verificar os leads na etapa.' };
        }

        if (count !== null && count > 0) {
            return { success: false, message: `Não é possível excluir. Existem ${count} leads nesta etapa. Mova-os primeiro.` };
        }

        const company = companies.find(c => c.id === companyId);
        if (!company) {
            return { success: false, message: 'Empresa não encontrada.' };
        }

        const newStages = company.pipeline_stages.filter(s => s.id !== stageId);

        const { data, error } = await supabase.from('companies').update({ pipeline_stages: newStages }).eq('id', companyId).select().single();

        if (error) {
            console.error("Error deleting pipeline stage:", error);
            return { success: false, message: 'Erro ao excluir a etapa do banco de dados.' };
        }
        
        if (data) {
             setCompanies(prev => prev.map(c => c.id === companyId ? mapCompanyFromDB(data) : c));
        }
        return { success: true };
    };

    const uploadHunterLeads = async (leads: any[]) => {
      const { data, error } = await supabase.from('hunter_leads').insert(leads).select();
      if (error) {
        console.error("Error uploading hunter leads:", error);
        throw error;
      }
      if (data) {
        setHunterLeads(prev => [...data.map(mapHunterLeadFromDB), ...prev]);
      }
    };

    const addHunterLead = async (leadData: { name: string; phone: string; companyId: string; salespersonId: string; details: Record<string, string>; }) => {
        const { name, phone, companyId, salespersonId, details } = leadData;
        const company = companies.find(c => c.id === companyId);
        if (!company) {
            throw new Error("Empresa não encontrada para adicionar o lead.");
        }

        const novosLeadsStage = company.pipeline_stages.find(s => s.name === 'Novos Leads');

        if (!novosLeadsStage) {
            throw new Error("Pipeline não configurado corretamente. Etapa 'Novos Leads' não encontrada.");
        }

        // Leads criados pelo vendedor agora sempre vão para a etapa "Novos Leads"
        const targetStageId = novosLeadsStage.id;
        const prospectedAt = null;

        const now = new Date().toISOString();
        const newLeadData = {
            company_id: companyId,
            salesperson_id: salespersonId,
            lead_name: name,
            lead_phone: phone,
            source: 'Captado pelo Vendedor' as const,
            stage_id: targetStageId,
            prospected_at: prospectedAt,
            last_activity: now,
            feedback: [],
            details: details,
        };
        const { data, error } = await supabase.from('hunter_leads').insert(newLeadData).select().single();
        if (error) {
            console.error("Error adding hunter lead:", error);
            throw error;
        }
        if (data) {
            setHunterLeads(prev => [mapHunterLeadFromDB(data), ...prev]);
        }
    };

    const updateHunterLead = async (leadId: string, updates: any): Promise<HunterLead> => {
      const { data, error } = await supabase.from('hunter_leads').update(updates).eq('id', leadId).select().single();
      if (error) {
        console.error("Error updating hunter lead:", error);
        throw error;
      }
      
      const updatedLead = mapHunterLeadFromDB(data);
      setHunterLeads(prevLeads =>
        prevLeads.map(lead => (lead.id === updatedLead.id ? updatedLead : lead))
      );

      return updatedLead;
    };
    
    const addHunterLeadAction = async (lead: HunterLead, feedbackText: string, images: string[], targetStageId: string, outcome?: 'convertido' | 'nao_convertido' | null, appointment_at?: string) => {
        try {
            const imageUrls: string[] = [];
            for (const imageBase64 of images) {
                const file = dataURLtoFile(imageBase64, `feedback-hunter-${lead.id}-${Date.now()}`);
                if (file) {
                    const filePath = `public/feedback-images/${lead.id}/${crypto.randomUUID()}`;
                    const { error: uploadError } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                    
                    if (uploadError) {
                        console.error("Error uploading feedback image:", uploadError);
                    } else {
                        const { data: urlData } = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath);
                        imageUrls.push(urlData.publicUrl);
                    }
                }
            }
            
            const newFeedbackEntry = {
                text: feedbackText,
                images: imageUrls,
                createdAt: new Date().toISOString(),
                stageId: lead.stage_id,
            };
            
            const updatedFeedback = [...(lead.feedback || []), newFeedbackEntry];

            const updatePayload: any = {
                stage_id: targetStageId,
                last_activity: new Date().toISOString(),
                feedback: updatedFeedback,
                outcome: outcome || null,
                // A data/hora local é recebida (se existir) e convertida para o formato ISO (UTC).
                // Isso garante o armazenamento correto do fuso horário no banco de dados.
                appointment_at: appointment_at ? new Date(appointment_at).toISOString() : null,
            };
            
            await updateHunterLead(lead.id, updatePayload);
        } catch(error) {
            console.error("Failed to add hunter lead action:", error);
        }
    };
    
    const transferHunterLead = async (leadId: string, newSalespersonId: string, originalSalespersonId: string, feedback: { text: string, images: string[] }) => {
        const leadToUpdate = hunterLeads.find(l => l.id === leadId);
        if (!leadToUpdate) return;

        const company = companies.find(c => c.id === leadToUpdate.companyId);
        if (!company) {
            console.error("Could not find company for lead.");
            return;
        }

        const novosLeadsStage = company.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novosLeadsStage) {
            console.error("Could not find 'Novos Leads' stage for company.");
            return;
        }
        
        const imageUrls: string[] = [];
        for (const imageBase64 of feedback.images) {
            const file = dataURLtoFile(imageBase64, `transfer-feedback-${leadId}-${Date.now()}`);
            if (file) {
                const filePath = `public/feedback-images/${leadId}/${crypto.randomUUID()}`;
                const { error: uploadError } = await supabase.storage.from('estoqueinteligentetriad3').upload(filePath, file);
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('estoqueinteligentetriad3').getPublicUrl(filePath);
                    imageUrls.push(urlData.publicUrl);
                }
            }
        }
        
        const now = new Date().toISOString();
        const newFeedbackEntry = {
            text: feedback.text,
            images: imageUrls,
            createdAt: now,
            stageId: leadToUpdate.stage_id,
        };
        const updatedFeedback = [...(leadToUpdate.feedback || []), newFeedbackEntry];

        const newDetails = {
            ...(leadToUpdate.details || {}),
            transferred_from: originalSalespersonId,
            transferred_to: newSalespersonId,
            transferred_at: now,
        };

        const { data, error } = await supabase
            .from('hunter_leads')
            .update({ 
                salesperson_id: newSalespersonId,
                stage_id: novosLeadsStage.id,
                details: newDetails,
                feedback: updatedFeedback,
                last_activity: now,
                prospected_at: null,
                appointment_at: null,
                outcome: null
            })
            .eq('id', leadId)
            .select()
            .single();

        if (error) { console.error("Error transferring hunter lead:", error); return; }

        if (data) {
            setHunterLeads(prev => prev.map(l => l.id === leadId ? mapHunterLeadFromDB(data) : l));
        }
    };
    
    const reassignHunterLead = async (leadId: string, newSalespersonId: string, originalSalespersonId: string | null) => {
        const leadToUpdate = hunterLeads.find(l => l.id === leadId);
        if (!leadToUpdate) return;
        
        const company = companies.find(c => c.id === leadToUpdate.companyId);
        if (!company) {
            console.error("Could not find company for lead.");
            return;
        }

        const novoLeadStage = company.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novoLeadStage) {
            console.error("Could not find 'Novos Leads' stage for company.");
            return;
        }

        const newDetails = {
            ...(leadToUpdate.details || {}),
            reassigned_from: originalSalespersonId,
            reassigned_to: newSalespersonId,
            reassigned_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('hunter_leads')
            .update({ 
                salesperson_id: newSalespersonId,
                stage_id: novoLeadStage.id,
                details: newDetails,
                // Reset lead state
                prospected_at: null,
                last_activity: new Date().toISOString(), // update last activity
                feedback: [],
                outcome: null,
                appointment_at: null,
            })
            .eq('id', leadId)
            .select()
            .single();

        if (error) { console.error("Error reassigning hunter lead:", error); return; }
        
        if (data) {
            setHunterLeads(prev => prev.map(l => l.id === leadId ? mapHunterLeadFromDB(data) : l));
        }
    };

    const updateMonitorSettings = async (settings: Omit<MonitorSettings, 'id'>) => {
        if (!monitorSettings) return;
        const { data, error } = await supabase.from('monitor_settings').update(settings).eq('id', monitorSettings.id).select().single();
        if (error) {
            console.error("Error updating monitor settings:", error);
            throw new Error("Falha ao atualizar as configurações. Verifique as permissões do banco de dados.");
        }
        if (data) {
            setMonitorSettings(data as MonitorSettings);
        }
    };

    const addMonitorChatMessage = async (messageData: Omit<MonitorChatMessage, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('monitor_chat_history')
            .insert(messageData)
            .select()
            .single();
        
        if (error) {
            console.error("Error adding chat message:", error);
            return;
        }
        if (data) {
            setMonitorChatHistory(prev => [...prev, data]);
        }
    };
    
    const saveLiveAgentConfig = async (config: Omit<LiveAgentConfig, 'id' | 'updatedAt'>) => {
        const dbData = {
            id: config.companyId, // Using companyId as the primary key
            company_id: config.companyId,
            agent_name: config.agentName,
            company_project_name: config.companyProjectName,
            agent_role: config.agentRole,
            role_description: config.roleDescription,
            mission: config.mission,
            tone_of_voice: config.toneOfVoice,
            mandatory_questions: config.mandatoryQuestions,
            optional_questions: config.optionalQuestions,
            greeting_messages: config.greetingMessages,
            do_rules: config.doRules,
            dont_rules: config.dontRules,
            forbidden_words: config.forbiddenWords,
            interaction_examples: config.interactionExamples,
            final_summary_format: config.finalSummaryFormat,
            final_notes: config.finalNotes,
            service_mode: config.serviceMode,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('live_agent_configs').upsert(dbData, { onConflict: 'id' });

        if (error) {
            console.error("Error saving Live Agent config:", error);
            throw new Error("Não foi possível salvar a configuração do Agente LIVE.");
        }
    };

    const value: DataContextType = {
        isLoading,
        companies,
        vehicles,
        teamMembers,
        reminders,
        maintenanceRecords,
        deactivatedAdVehicleIds,
        notifications,
        materialRequests,
        adminUsers,
        adminNotifications,
        logs,
        prospectaiLeads,
        hunterLeads,
        gruposEmpresariais,
        monitorSettings,
        monitorChatHistory,
        liveAgentConfigs,
        dailyReports,
        toolboxUrl,
        updateCompanyStatus,
        addCompany,
        updateCompany,
        deleteCompany,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        markVehicleAsSold,
        assignSalesperson,
        toggleVehiclePriority,
        toggleVehicleAdStatus,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        // Mocked functions for brevity in this response
        addReminder: async () => console.log('addReminder not implemented'),
        updateReminder: async () => console.log('updateReminder not implemented'),
        deleteReminder: async () => console.log('deleteReminder not implemented'),
        markAdAsDeactivated: () => console.log('markAdAsDeactivated not implemented'),
        addNotification,
        markNotificationAsRead: () => console.log('markNotificationAsRead not implemented'),
        addMaterialRequest: () => console.log('addMaterialRequest not implemented'),
        addAdminUser,
        updateAdminUser: async () => console.log('updateAdminUser not implemented'),
        deleteAdminUser: async () => console.log('deleteAdminUser not implemented'),
        addAdminNotification,
        markAdminNotificationAsRead,
        logActivity,
        updateUserPassword,
        updateAdminPassword,
        requestPasswordReset,
        resetPasswordWithToken,
        getN8nWebhook,
        updateN8nWebhook,
        updateGrupoUserPassword,
        updateGrupoUserProfile,
        updateProspectLeadStatus,
        updateProspectLead,
        reassignProspectLead,
        addProspectLeadFeedback,
        transferProspectLead,
        addHunterLeadAction,
        transferHunterLead,
        reassignHunterLead,
        addGrupoEmpresarial,
        updateGrupoEmpresarial,
        updateGrupoCompanies,
        updateGrupoEmpresarialStatus,
        addPipelineStage,
        updatePipelineStage,
        deletePipelineStage,
        uploadHunterLeads,
        addHunterLead,
        updateHunterLead,
        updateMonitorSettings,
        addMonitorChatMessage,
        saveLiveAgentConfig,
    };


    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
