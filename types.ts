import {supabase} from './utils/supabase';

export type Feature = 'estoque_inteligente' | 'prospectai' | 'marketing' | 'disparador_automatico';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  date: string;
  invoiceUrl?: string;
}

export interface Vehicle {
  id?: string;
  companyId?: string;
  brand: string;
  model: string;
  category: string;
  color: string;
  plate: string;
  purchasePrice: number;
  announcedPrice: number;
  discount: number;
  entryDate: string;
  dailyCost: number;
  saleGoalDays: number;
  adCost: number;
  salespersonId?: string;
  imageUrl?: string;
  status?: 'available' | 'sold';
  saleDate?: string;
  description?: string;
  ipvaDueDate?: string;
  ipvaCost?: number;
  isPriority?: boolean;
  isAdActive?: boolean; // New field for ad status
  maintenance?: MaintenanceRecord[];

  // New detailed optional fields
  modelYear?: number;
  fabricationYear?: number;
  renavam?: string;
  mileage?: number;
  fuelType?: 'Gasolina' | 'Etanol' | 'Flex' | 'Diesel' | 'Híbrido' | 'Elétrico';
  transmission?: 'Manual' | 'Automático' | 'CVT';
  traction?: 'Dianteira' | 'Traseira' | '4x4';
  doors?: number;
  occupants?: number;
  chassis?: string;
  history?: string;
  revisions?: string;
  standardItems?: string;
  additionalAccessories?: string;
  documentStatus?: string;
}

export interface SalespersonProspectAISettings {
  deadlines: {
    initial_contact: {
      minutes: number;
      auto_reassign_enabled: boolean;
      reassignment_mode: 'random' | 'specific';
      reassignment_target_id: string | null;
    };
    first_feedback?: {
      minutes: number;
      auto_reassign_enabled: boolean;
      reassignment_mode: 'random' | 'specific';
      reassignment_target_id: string | null;
    };
  };
  hunter_goals?: {
    type: 'daily' | 'weekly' | 'monthly';
    value: number;
  };
}

export interface TeamMember {
  id: string;
  companyId: string;
  name: string;
  email: string;
  encrypted_password?: string;
  phone?: string;
  avatarUrl: string;
  monthlySalesGoal: number;
  role: 'Vendedor' | 'Gestor de Tráfego' | 'Gestor';
  prospectAISettings?: SalespersonProspectAISettings;
  isHunterModeActive?: boolean;
}

export interface BusinessHours {
    isEnabled: boolean;
    is24_7: boolean;
    // Day of week: 0 for Sunday, 1 for Monday, etc.
    days: {
        [key in 0 | 1 | 2 | 3 | 4 | 5 | 6]?: {
            isOpen: boolean;
            startTime: string; // "HH:mm"
            endTime: string;   // "HH:mm"
        };
    };
}

export interface ProspectAISettings {
  show_monthly_leads_kpi: {
    enabled: boolean;
    visible_to: 'all' | string[]; // 'all' or array of salesperson IDs
  };
  business_hours?: BusinessHours;
  overdue_leads_lock?: {
    enabled: boolean;
    apply_to: 'all' | string[]; // 'all' or array of salesperson IDs
    lock_after_time: string; // HH:mm format
  };
}

export interface Company {
  id: string;
  name: string;
  isActive: boolean;
  logoUrl: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  ownerEmail?: string;
  instagram?: string;
  ownerName?: string;
  ownerPhone?: string;
  monthlySalesGoal: number;
  monthlyAdBudget?: number;
  marketingDriveUrl?: string;
  visibleFields?: (keyof Vehicle)[];
  enabledFeatures?: Feature[];
  pipeline_stages: PipelineStage[];
  prospectAISettings?: ProspectAISettings;
  createdAt?: string;
}

export interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
  recipientRole: UserRole;
  userId?: string;
}

export interface MaterialRequest {
  id: string;
  vehicleId: string;
  requestDetails: string;
  assigneeId: string; // companyId or teamMemberId
  requesterId: string; // traffic manager's id
  status: 'pending' | 'completed';
  date: string;
}

export interface Reminder {
  id: string;
  category: string;
  message: string;
  assigneeId: string; // 'everyone' or a team member's ID
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  repetition: 'none' | 'daily' | 'weekly' | 'monthly';
  weekDays?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]; // Only if repetition is 'weekly'
  isActive: boolean;
  createdAt: string;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
}

export interface AdminNotification {
    id: string;
    message: string;
    date: string;
    read: boolean;
    type: 'new_company';
}

export type LogType = 
  | 'COMPANY_APPROVED'
  | 'COMPANY_DEACTIVATED'
  | 'COMPANY_PENDING'
  | 'COMPANY_DELETED'
  | 'ADMIN_LOGIN_SUCCESS'
  | 'USER_LOGIN_SUCCESS'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'REMINDER_CREATED'
  | 'REMINDER_UPDATED'
  | 'REMINDER_DELETED'
  | 'VEHICLE_CREATED'
  | 'VEHICLE_SOLD'
  | 'VEHICLE_DELETED';

// @-fix: Added missing LogEntry interface
export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  description: string;
  company_id?: string;
  user_id?: string;
  companyName?: string;
  userName?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  stageOrder: number;
  isFixed: boolean;
  isEnabled: boolean;
}

export interface ProspectAILead {
  id: string;
  createdAt: string;
  companyId: string;
  salespersonId: string;
  leadName: string;
  leadPhone?: string;
  interestVehicle?: string;
  stage_id: string;
  outcome?: 'convertido' | 'nao_convertido' | null;
  rawLeadData?: string;
  details?: {
    [key: string]: any;
    reassigned_from?: string;
    reassigned_to?: string;
    reassigned_at?: string;
    transferred_from?: string;
    transferred_to?: string;
    transferred_at?: string;
  };
  appointment_at?: string;
  feedback?: {
    text: string;
    images?: string[]; // URLs of uploaded images
    createdAt: string;
    stageId?: string;
  }[];
  prospected_at?: string;
  last_feedback_at?: string;
}

export interface HunterLead {
  id: string;
  createdAt: string;
  companyId: string;
  salespersonId: string | null;
  leadName: string;
  leadPhone: string;
  source: 'Base da Empresa' | 'Base Triad3' | 'Captado pelo Vendedor';
  stage_id: string;
  outcome?: 'convertido' | 'nao_convertido' | null;
  feedback: { text: string; createdAt: string; images?: string[]; stageId?: string; }[];
  lastActivity?: string;
  prospected_at?: string;
  appointment_at?: string;
  details?: { 
    [key: string]: any;
    transferred_from?: string;
    transferred_to?: string;
    transferred_at?: string;
  };
}


export interface GrupoEmpresarial {
  id: string;
  name: string;
  bannerUrl: string;
  responsibleName: string;
  responsiblePhotoUrl: string;
  accessEmail: string;
  encrypted_password?: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  companyIds: string[];
  createdAt?: string;
  isActive: boolean;
}

export interface MonitorSettings {
  id: string;
  prompt: string;
  api_key: string | null;
}

export interface MonitorChatMessage {
  id: string;
  user_id: string;
  sender: 'user' | 'monitor';
  message: string;
  created_at: string;
}

export type LiveAgentToneOfVoice = 'acolhedor' | 'consultivo' | 'tecnico' | 'empreendedor' | 'motivador' | 'humanizado';
export type LiveAgentServiceMode = 'consultivo' | 'comercial' | 'informativo' | 'suporte';

export interface LiveAgentConfig {
  id: string;
  companyId: string;
  
  // 1. Identificação
  agentName: string;
  companyProjectName: string;
  agentRole: string;

  // 2. Apresentação
  roleDescription: string;
  mission: string;
  toneOfVoice: LiveAgentToneOfVoice[];

  // 3. Fluxo
  mandatoryQuestions: string[];
  optionalQuestions: string[];
  greetingMessages: string;

  // 4. Regras
  doRules: string[];
  dontRules: string[];
  forbiddenWords: string;

  // 5. Exemplos
  interactionExamples: string;

  // 6. Resumo
  finalSummaryFormat: string;

  // 7. Notas Finais
  finalNotes: string;

  // 8. Opcionais
  serviceMode: LiveAgentServiceMode | null;

  updatedAt?: string;
}

export interface DailyReport {
  id: string;
  created_at: string;
  report_date: string; // YYYY-MM-DD
  company_id: string;
  report_content: string;
  raw_data?: any;
}


export type Theme = 'light' | 'dark';
export type View = 'admin' | 'dashboard' | 'grupos' | 'monitor_settings' | 'relatorios' | 'prospect_automations';
export type UserRole = 'admin' | 'company' | 'traffic_manager' | 'salesperson' | 'grupo_empresarial';