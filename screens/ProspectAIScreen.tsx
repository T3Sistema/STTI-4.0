import React, { useMemo, useState, useEffect } from 'react';
import Card from '../components/Card';
import { TeamMember, ProspectAILead, PipelineStage } from '../types';
import { useData } from '../hooks/useMockData';
import { LeadCard } from '../components/LeadCard';
import ConfirmationModal from '../components/ConfirmationModal';
import SalespersonProspectPerformanceScreen from './SalespersonProspectPerformanceScreen';
import { ChartBarIcon } from '../components/icons/ChartBarIcon';
import UserProfileDropdown from '../components/UserProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import Modal from '../components/Modal';
import UserProfileForm from '../components/forms/UserProfileForm';
import ChangePasswordForm from '../components/forms/ChangePasswordForm';
import { formatTimeUntil } from '../utils/dateUtils';
import ReassignLeadModal from '../components/modals/ReassignLeadModal';
import { ExclamationIcon } from '../components/icons/ExclamationIcon';
import { UserGroupIcon } from '../components/icons/UserGroupIcon';
import { CrosshairIcon } from '../components/icons/CrosshairIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import AgendaModal from '../components/AgendaModal';
import GoalProgressCard from '../components/GoalProgressCard';
import { SwitchHorizontalIcon } from '../components/icons/SwitchHorizontalIcon';
import { ToolboxIcon } from '../components/icons/ToolboxIcon';
import ToolboxViewer from '../components/ToolboxViewer';
import TransferLeadModal from '../components/modals/TransferLeadModal';

interface ProspectAIScreenProps {
    onBack: () => void;
    onSwitchToHunter?: () => void;
    user: TeamMember;
    onLogout: () => void;
    showBackButton?: boolean;
    isManagerView?: boolean;
    allSalespeople?: TeamMember[];
}

type Period = 'last_7_days' | 'last_30_days' | 'all' | 'custom';

// Função para definir as cores de cada estágio do pipeline
const getStageColorClasses = (stageName: string) => {
    switch (stageName) {
        case 'Leads Pendentes':
            return { bar: 'bg-yellow-500', badge: 'bg-yellow-500 text-black' };
        case 'Novos Leads':
            return { bar: 'bg-cyan-500', badge: 'bg-cyan-500 text-white' };
        case 'Primeira Tentativa':
            return { bar: 'bg-yellow-500', badge: 'bg-yellow-500 text-black' };
        case 'Segunda Tentativa':
            return { bar: 'bg-orange-500', badge: 'bg-orange-500 text-black' };
        case 'Terceira Tentativa':
            return { bar: 'bg-dark-stage-attempt3', badge: 'bg-dark-stage-attempt3 text-black' };
        case 'Agendado':
            return { bar: 'bg-blue-500', badge: 'bg-blue-500 text-white' };
        case 'Remanejados':
        case 'Round-Robin':
            return { bar: 'bg-purple-500', badge: 'bg-purple-500 text-white' };
        case 'Atendimentos Transferidos':
            return { bar: 'bg-indigo-500', badge: 'bg-indigo-500 text-white' };
        case 'Finalizados':
            return { bar: 'bg-slate-500', badge: 'bg-slate-500 text-white' };
        default:
            return { bar: 'bg-gray-500', badge: 'bg-gray-500 text-white' };
    }
};

const ProspectCard: React.FC<{ title: string; count: number; color: string; }> = ({ title, count, color }) => {
  return (
    <Card className="bg-[#1C222C] p-4 text-center animate-fade-in">
      <p className="text-sm font-medium text-dark-secondary min-h-[2.5rem] flex items-center justify-center">{title}</p>
      <p className="text-4xl font-bold mt-2" style={{ color }}>{count}</p>
    </Card>
  );
};

const MonthlyLeadsKpi: React.FC<{ companyId: string }> = ({ companyId }) => {
    const { prospectaiLeads } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const leadsForCompany = useMemo(() => 
        prospectaiLeads.filter(lead => lead.companyId === companyId),
    [prospectaiLeads, companyId]);

    const monthlyLeadsCount = useMemo(() => {
        const [year, month] = selectedDate.split('-').map(Number);
        return leadsForCompany.filter(lead => {
            const leadDate = new Date(lead.createdAt);
            return leadDate.getFullYear() === year && leadDate.getMonth() === month - 1;
        }).length;
    }, [leadsForCompany, selectedDate]);
    
    const monthOptions = useMemo(() => {
        if (leadsForCompany.length === 0) {
            const now = new Date();
            return [{ value: now.toISOString().slice(0, 7), label: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }];
        }
        const earliestDate = new Date(Math.min(...leadsForCompany.map(l => new Date(l.createdAt).getTime())));
        const latestDate = new Date();
        const options = [];
        let currentDate = latestDate;

        while (currentDate >= earliestDate) {
            options.push({
                value: currentDate.toISOString().slice(0, 7),
                label: currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
            });
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        return options;
    }, [leadsForCompany]);

    return (
        <Card className="p-4 text-center animate-fade-in flex flex-col justify-between">
            <div className="flex items-center justify-center gap-2">
                 <UserGroupIcon className="w-4 h-4 text-dark-secondary" />
                 <p className="text-sm font-medium text-dark-secondary">Leads da Empresa (Mês)</p>
            </div>
            <p className="text-4xl font-bold my-2 text-cyan-400">{monthlyLeadsCount}</p>
            <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs bg-dark-background border border-dark-border rounded-md px-2 py-1 text-dark-secondary focus:outline-none focus:ring-1 focus:ring-dark-primary"
            >
                {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </Card>
    );
};

const ProspectColumn: React.FC<{ title: string; count: number; children: React.ReactNode; }> = ({ title, count, children }) => {
  const { bar, badge } = getStageColorClasses(title);
  const finalTitle = title === 'Remanejados' ? 'Round-Robin' : title;

  return (
    <div className="w-full lg:w-80 flex-shrink-0 bg-dark-card rounded-xl flex flex-col overflow-hidden shadow-lg border border-dark-border/30">
        <div className="p-4">
            <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-white uppercase tracking-wide">{finalTitle}</h3>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${badge}`}>
                    {count}
                </div>
            </div>
        </div>
        <div className={`h-1.5 w-full ${bar}`}></div>
        <div className="p-4 space-y-4 overflow-y-auto flex-grow max-h-[calc(100vh-25rem)]">
            {children}
        </div>
    </div>
  );
};


const ProspectAIScreen: React.FC<ProspectAIScreenProps> = ({ onBack, onSwitchToHunter, user, onLogout, showBackButton = true, isManagerView = false, allSalespeople = [] }) => {
    const { 
        prospectaiLeads, 
        hunterLeads,
        updateProspectLeadStatus,
        reassignProspectLead,
        transferProspectLead,
        companies,
        notifications,
        markNotificationAsRead,
        addNotification,
        teamMembers,
        toolboxUrl,
    } = useData();
    const [prospectingLead, setProspectingLead] = useState<ProspectAILead | null>(null);
    const [isPerformanceView, setIsPerformanceView] = useState(false);
    const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [leadToReassign, setLeadToReassign] = useState<ProspectAILead | null>(null);
    const [leadToTransfer, setLeadToTransfer] = useState<ProspectAILead | null>(null);
    const [pendingLeads, setPendingLeads] = useState<ProspectAILead[]>([]);
    const [isProspectingLocked, setIsProspectingLocked] = useState(false);
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
    const [leadToReopen, setLeadToReopen] = useState<ProspectAILead | null>(null);
    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
    const [isToolboxOpen, setIsToolboxOpen] = useState(false);

    const [period, setPeriod] = useState<Period>('last_7_days');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
    });

    const activeCompany = useMemo(() => companies.find(c => c.id === user.companyId), [companies, user.companyId]);

    const handleSearchChange = (stageId: string, query: string) => {
        setSearchQueries(prev => ({ ...prev, [stageId]: query }));
    };
    
    // APPOINTMENT NOTIFICATION LOGIC
    useEffect(() => {
        if (!activeCompany) return;

        const NOTIFIED_APPOINTMENTS_KEY = `notified_appointments_${user.id}`;

        const checkAppointments = () => {
            const notifiedIds: string[] = JSON.parse(sessionStorage.getItem(NOTIFIED_APPOINTMENTS_KEY) || '[]');
            const agendadoStage = activeCompany.pipeline_stages.find(s => s.name === 'Agendado');

            if (!agendadoStage) return;

            const upcomingAppointments = prospectaiLeads.filter(lead => {
                if (lead.salespersonId !== user.id || lead.stage_id !== agendadoStage.id || !lead.appointment_at) {
                    return false;
                }
                const appointmentDate = new Date(lead.appointment_at);
                const now = new Date();
                const diffHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                
                return diffHours > 0 && diffHours <= 48;
            });

            const newNotifiedIds = [...notifiedIds];

            upcomingAppointments.forEach(lead => {
                if (!notifiedIds.includes(lead.id)) {
                    const timeUntil = formatTimeUntil(lead.appointment_at!);
                    const lastFeedback = lead.feedback && lead.feedback.length > 0 ? lead.feedback[lead.feedback.length - 1].text : null;

                    let message = `Lembrete: Agendamento com ${lead.leadName} ${timeUntil}.`;
                    if (lastFeedback) {
                        message += ` | Último feedback: "${lastFeedback}"`;
                    }
                    
                    addNotification(message, 'salesperson', user.id);
                    
                    newNotifiedIds.push(lead.id);
                }
            });

            sessionStorage.setItem(NOTIFIED_APPOINTMENTS_KEY, JSON.stringify(newNotifiedIds));
        };

        checkAppointments();
        const intervalId = setInterval(checkAppointments, 60000); 

        return () => clearInterval(intervalId);

    }, [user.id, user.companyId, prospectaiLeads, activeCompany, addNotification]);

    const myLeads = useMemo(() => {
        return prospectaiLeads.filter(lead => 
            lead.salespersonId === user.id || 
            lead.details?.reassigned_from === user.id ||
            lead.details?.transferred_from === user.id
        );
    }, [prospectaiLeads, user.id]);

    const myCompanyStages = useMemo(() => {
        const stages = activeCompany ? [...activeCompany.pipeline_stages] : [];
        // Adiciona a nova coluna se ela não existir para garantir a visualização
        if (!stages.some(s => s.name === 'Atendimentos Transferidos')) {
            stages.push({
                id: 'temp-transferred-id', // ID temporário
                name: 'Atendimentos Transferidos',
                stageOrder: 101,
                isFixed: true,
                isEnabled: true,
            });
        }
        return stages
            .filter(s => s.isEnabled)
            .sort((a, b) => a.stageOrder - b.stageOrder);
    }, [activeCompany]);
    
    // Logic to detect pending leads from previous days
    useEffect(() => {
        const lockSettings = activeCompany?.prospectAISettings?.overdue_leads_lock;

        if (!lockSettings?.enabled || isManagerView) {
            setIsProspectingLocked(false);
            return;
        }

        const appliesToUser = lockSettings.apply_to === 'all' || (Array.isArray(lockSettings.apply_to) && lockSettings.apply_to.includes(user.id));

        if (!appliesToUser) {
            setIsProspectingLocked(false);
            return;
        }

        // Check if the current time is past the lock time
        const lockTime = lockSettings.lock_after_time || '00:00';
        const [hours, minutes] = lockTime.split(':').map(Number);
        const now = new Date();
        const lockActivationTime = new Date();
        lockActivationTime.setHours(hours, minutes, 0, 0);

        if (now < lockActivationTime) {
            setIsProspectingLocked(false);
            return;
        }

        if (!myCompanyStages || myCompanyStages.length === 0) {
            setIsProspectingLocked(false);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nonActionableStageNames = ['Novos Leads', 'Finalizados', 'Remanejados', 'Agendado', 'Atendimentos Transferidos'];
        const actionableStageIds = myCompanyStages
            .filter(s => s.isEnabled && !nonActionableStageNames.includes(s.name))
            .map(s => s.id);

        const pending = myLeads.filter(lead => {
            if (!actionableStageIds.includes(lead.stage_id)) {
                return false;
            }

            const hasFeedback = lead.feedback && lead.feedback.length > 0;
            if (hasFeedback) {
                const latestFeedbackDate = new Date(lead.feedback[lead.feedback.length - 1].createdAt);
                return latestFeedbackDate < today;
            } else {
                const prospectDate = lead.prospected_at ? new Date(lead.prospected_at) : null;
                if (prospectDate) {
                    return prospectDate < today;
                }
                const creationDate = new Date(lead.createdAt);
                return creationDate < today;
            }
        });
        
        setPendingLeads(pending);
        setIsProspectingLocked(pending.length > 0);
    }, [myLeads, myCompanyStages, isManagerView, activeCompany, user.id]);


    const filteredLeads = useMemo(() => {
        if (period === 'all') return myLeads;

        let startDate: Date;
        let endDate: Date = new Date();
        endDate.setHours(23, 59, 59, 999);

        if (period === 'last_7_days') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'last_30_days') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
        } else { // custom
            if (!customRange.start || !customRange.end) return [];
            startDate = new Date(customRange.start + 'T00:00:00');
            endDate = new Date(customRange.end + 'T23:59:59.999');
        }

        return myLeads.filter(lead => {
            const leadDate = new Date(lead.createdAt);
            return leadDate >= startDate && leadDate <= endDate;
        });
    }, [myLeads, period, customRange]);

    const userNotifications = useMemo(() => notifications.filter(n => (n.recipientRole === 'salesperson' && !n.userId) || n.userId === user.id), [notifications, user.id]);

    const stagesByName = useMemo(() =>
        myCompanyStages.reduce((acc, stage) => {
            acc[stage.name] = stage;
            return acc;
        }, {} as Record<string, PipelineStage>),
        [myCompanyStages]
    );

    const categorizedLeads = useMemo(() => {
        const categories: Record<string, ProspectAILead[]> = {};
        myCompanyStages.forEach(stage => {
            categories[stage.id] = [];
        });

        const novoLeadStageId = stagesByName['Novos Leads']?.id;
        const remanejadoStageId = stagesByName['Remanejados']?.id;
        const transferredStageId = stagesByName['Atendimentos Transferidos']?.id;

        filteredLeads.forEach(lead => {
            if (lead.details?.transferred_from === user.id && transferredStageId) {
                categories[transferredStageId].push(lead);
            } else if (lead.details?.reassigned_from === user.id && remanejadoStageId) {
                categories[remanejadoStageId].push(lead);
            } else if (lead.salespersonId === user.id) {
                const leadStage = myCompanyStages.find(s => s.id === lead.stage_id);
                 if (leadStage?.name === 'Remanejados' && novoLeadStageId) {
                    categories[novoLeadStageId].push(lead);
                } else if (categories[lead.stage_id]) {
                    categories[lead.stage_id].push(lead);
                }
            }
        });
        return categories;
    }, [filteredLeads, user.id, myCompanyStages, stagesByName]);
    
    const hasLeadInProgress = useMemo(() => {
        const emContatoStage = stagesByName['Primeira Tentativa'];
        return emContatoStage && categorizedLeads[emContatoStage.id]?.length > 0;
    }, [categorizedLeads, stagesByName]);

    const counts = useMemo(() => {
        const getCount = (name: string) => {
            const stage = stagesByName[name];
            return stage ? categorizedLeads[stage.id]?.length || 0 : 0;
        };

        const convertedCount = (categorizedLeads[stagesByName['Finalizados']?.id] || []).filter(l => l.outcome === 'convertido').length;
        const notConvertedCount = (categorizedLeads[stagesByName['Finalizados']?.id] || []).filter(l => l.outcome === 'nao_convertido').length;

        return {
            total: filteredLeads.filter(l => l.salespersonId === user.id && !l.details?.transferred_from).length,
            converted: convertedCount,
            notConverted: notConvertedCount,
            reallocated: getCount('Remanejados'),
            new: getCount('Novos Leads'),
            contact: getCount('Primeira Tentativa'),
            secondAttempt: getCount('Segunda Tentativa'),
            thirdAttempt: getCount('Terceira Tentativa'),
            scheduled: getCount('Agendado'),
            finished: convertedCount + notConvertedCount,
        };
    }, [filteredLeads, categorizedLeads, stagesByName, user.id]);
    
    const kpiCardsToRender = useMemo(() => {
        if (!activeCompany) return [];
    
        const kpis: { title: string; count: number; color: string }[] = [];
    
        // Static KPIs as requested
        kpis.push({ title: 'Meus Leads Atribuídos', count: counts.total, color: '#00D1FF' });
        
        const remanejadosStage = myCompanyStages.find(s => s.name === 'Remanejados');
        if (remanejadosStage) {
            const count = categorizedLeads[remanejadosStage.id]?.length || 0;
            kpis.push({ title: 'Round-Robin', count, color: '#A78BFA' });
        }
    
        // Dynamic KPIs for other stages
        const dynamicStageColors = ['#FBBF24', '#F59E0B', '#8B5CF6', '#60A5FA', '#34D399', '#FB923C'];
        let colorIndex = 0;
        
        myCompanyStages.forEach(stage => {
            if (['Novos Leads', 'Finalizados', 'Remanejados', 'Atendimentos Transferidos'].includes(stage.name)) {
                return;
            }
            
            const count = categorizedLeads[stage.id]?.length || 0;
            kpis.push({
                title: stage.name,
                count: count,
                color: dynamicStageColors[colorIndex % dynamicStageColors.length]
            });
            colorIndex++;
        });
    
        return kpis;
    }, [activeCompany, myCompanyStages, counts, categorizedLeads]);

    const monthlyTotalConvertedLeads = useMemo(() => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const finalizadosStageId = myCompanyStages.find(s => s.name === 'Finalizados')?.id;
        if (!finalizadosStageId) return 0;
    
        // Converted FARM leads (from all of the user's farm leads)
        const convertedFarm = prospectaiLeads.filter(lead => {
            if (lead.salespersonId !== user.id || lead.stage_id !== finalizadosStageId || lead.outcome !== 'convertido') return false;
            const conversionDate = lead.last_feedback_at ? new Date(lead.last_feedback_at) : null;
            return conversionDate && conversionDate >= startOfMonth && conversionDate <= endOfMonth;
        }).length;
    
        // Converted HUNTER leads (from all of the user's hunter leads)
        const convertedHunter = hunterLeads.filter(lead => {
            if (lead.salespersonId !== user.id || lead.stage_id !== finalizadosStageId || lead.outcome !== 'convertido') return false;
            const conversionDate = lead.lastActivity ? new Date(lead.lastActivity) : null;
            return conversionDate && conversionDate >= startOfMonth && conversionDate <= endOfMonth;
        }).length;
    
        return convertedFarm + convertedHunter;
    }, [prospectaiLeads, hunterLeads, user.id, myCompanyStages]);

    const pendingLeadIds = useMemo(() => new Set(pendingLeads.map(l => l.id)), [pendingLeads]);

    const handleStartProspecting = async () => {
        if (prospectingLead) {
            const emContatoStage = stagesByName['Primeira Tentativa'];
            if(emContatoStage) {
                await updateProspectLeadStatus(prospectingLead.id, emContatoStage.id);
            }
            setProspectingLead(null);
        }
    };
    
    const handleConfirmReassignment = async (newOwnerId: string) => {
        if (leadToReassign) {
            await reassignProspectLead(leadToReassign.id, newOwnerId, leadToReassign.salespersonId);
            setLeadToReassign(null);
        }
    };
    
    const handleConfirmTransfer = async (newOwnerId: string, feedbackText: string, images: string[]) => {
        if (leadToTransfer) {
            await transferProspectLead(leadToTransfer.id, newOwnerId, leadToTransfer.salespersonId, { text: feedbackText, images });
            setLeadToTransfer(null);
        }
    };

    const handleReopenRequest = (lead: ProspectAILead) => {
        setLeadToReopen(lead);
    };

    const confirmReopenLead = async () => {
        if (leadToReopen) {
            const firstStage = myCompanyStages.find(s => s.name === 'Primeira Tentativa');
            if (firstStage) {
                await updateProspectLeadStatus(leadToReopen.id, firstStage.id);
            }
            setLeadToReopen(null);
        }
    };
    
    const placeholderCard = (
        <div className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center text-dark-secondary">
            Nenhum lead nesta etapa.
        </div>
    );
    
    const columnsToRender = myCompanyStages.filter(s => s.name !== 'Remanejados' && s.name !== 'Atendimentos Transferidos');
    const reallocatedColumn = myCompanyStages.find(s => s.name === 'Remanejados');
    const transferredColumn = myCompanyStages.find(s => s.name === 'Atendimentos Transferidos');

    const kpiSettings = activeCompany?.prospectAISettings?.show_monthly_leads_kpi;
    const showMonthlyKpi = kpiSettings?.enabled && (kpiSettings.visible_to === 'all' || kpiSettings.visible_to.includes(user.id));

    const periodOptions: { id: Period; label: string }[] = [
        { id: 'last_7_days', label: 'Últimos 7 dias' },
        { id: 'last_30_days', label: 'Últimos 30 dias' },
        { id: 'all', label: 'Todo o Período' },
        { id: 'custom', label: 'Personalizado' },
    ];

    const farmAppointments = useMemo(() => {
        const agendadoStage = myCompanyStages.find(s => s.name === 'Agendado');
        if (!agendadoStage) return [];
        return myLeads.filter(lead => lead.stage_id === agendadoStage.id && lead.appointment_at);
    }, [myLeads, myCompanyStages]);


    if (!activeCompany) {
        return <div>Carregando...</div>;
    }

    if (isPerformanceView) {
        return (
            <SalespersonProspectPerformanceScreen
                user={user}
                leads={myLeads}
                onBack={() => setIsPerformanceView(false)}
                allSalespeople={teamMembers}
            />
        );
    }

    return (
        <div className="animate-fade-in">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    {showBackButton && (
                        <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                            &larr; Voltar
                        </button>
                    )}
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Pipeline de Prospecção</h1>
                </div>
                 <div className="flex flex-wrap items-center justify-end gap-4">
                     {user.isHunterModeActive && onSwitchToHunter && (
                        <button
                            onClick={onSwitchToHunter}
                            className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm text-dark-primary"
                        >
                            <CrosshairIcon className="w-4 h-4" />
                            <span>Modo Hunter</span>
                        </button>
                    )}
                     <button
                        onClick={() => setIsAgendaModalOpen(true)}
                        className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span>Agenda</span>
                    </button>
                     <button
                        onClick={() => setIsPerformanceView(true)}
                        className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm"
                    >
                        <ChartBarIcon className="w-4 h-4" />
                        <span>Analisar Desempenho</span>
                    </button>
                    <button
                        onClick={() => toolboxUrl && setIsToolboxOpen(true)}
                        className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-dark-border"
                        disabled={!toolboxUrl}
                        title={!toolboxUrl ? "URL da ToolBox não configurada" : "Abrir ToolBox Triad3"}
                    >
                        <ToolboxIcon className="w-4 h-4" />
                        <span>ToolBox Triad3</span>
                    </button>
                    <NotificationBell
                        notifications={userNotifications}
                        onMarkAsRead={markNotificationAsRead}
                    />
                    <UserProfileDropdown
                        company={{ ...activeCompany, name: user.name, logoUrl: user.avatarUrl, email: user.email }}
                        onEditProfile={() => setEditProfileModalOpen(true)}
                        onChangePassword={() => setChangePasswordModalOpen(true)}
                        onLogout={onLogout}
                    />
                </div>
            </header>
            
            {user.prospectAISettings?.deadlines?.initial_contact?.auto_reassign_enabled && !isManagerView && (
              <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-4 mb-8 flex items-start gap-4 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mt-1">
                      <SwitchHorizontalIcon className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                      <h3 className="font-bold text-lg text-white">Modo de Remanejamento Automático Ativo</h3>
                      <p className="text-sm text-yellow-200 mt-1">
                          Atenção: Novos leads (modo Farm) não atendidos no prazo de <strong>{user.prospectAISettings.deadlines.initial_contact.minutes} minutos</strong> serão remanejados para outro vendedor.
                      </p>
                  </div>
              </div>
            )}
            
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <div className="bg-dark-card p-1 rounded-lg border border-dark-border flex flex-wrap items-center gap-1">
                    {periodOptions.map(opt => (
                        <button key={opt.id} onClick={() => setPeriod(opt.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === opt.id ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                {period === 'custom' && (
                    <div className="flex items-center gap-2 animate-fade-in bg-dark-card p-1 rounded-lg border border-dark-border">
                        <input type="date" value={customRange.start} onChange={(e) => setCustomRange(r => ({...r, start: e.target.value}))} className="filter-date-input"/>
                        <span className="text-dark-secondary text-xs">até</span>
                        <input type="date" value={customRange.end} onChange={(e) => setCustomRange(r => ({...r, end: e.target.value}))} className="filter-date-input"/>
                    </div>
                )}
            </div>

            {isProspectingLocked && (
                <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-4 mb-8 flex items-start gap-4 animate-fade-in">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mt-1">
                        <ExclamationIcon className="w-5 h-5 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">Ação Necessária</h3>
                        <p className="text-sm text-yellow-200 mt-1">
                            Você possui <strong>{pendingLeads.length} lead(s) pendente(s)</strong> de dias anteriores. É necessário registrar um feedback para cada um deles antes de poder prospectar novos leads.
                        </p>
                    </div>
                </div>
            )}

            {/* Top Row Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-6 mb-8">
                <GoalProgressCard 
                    title="Meta de Vendas (Mês)"
                    current={monthlyTotalConvertedLeads}
                    goal={user.monthlySalesGoal}
                />
                {showMonthlyKpi && <MonthlyLeadsKpi companyId={user.companyId} />}
                {kpiCardsToRender.map(kpi => (
                    <ProspectCard key={kpi.title} title={kpi.title} count={kpi.count} color={kpi.color} />
                ))}
            </div>


            {/* Kanban Columns */}
            <div className="flex lg:overflow-x-auto lg:space-x-6 pb-4 flex-col lg:flex-row gap-6 lg:gap-0">
                {pendingLeads.length > 0 && !isManagerView && (
                    <ProspectColumn title="Leads Pendentes" count={pendingLeads.length}>
                        {pendingLeads.map(lead => (
                            <LeadCard
                                key={`pending-${lead.id}`}
                                lead={lead}
                                isManagerView={isManagerView}
                                onReassign={setLeadToReassign}
                                onTransfer={setLeadToTransfer}
                                allSalespeople={teamMembers}
                                onReopenRequest={handleReopenRequest}
                                isPending={true}
                                currentUserId={user.id}
                            />
                        ))}
                    </ProspectColumn>
                )}
                 {columnsToRender.map(stage => {
                    const currentQuery = searchQueries[stage.id] || '';
                    let leadsForColumn = (categorizedLeads[stage.id] || []).filter(lead => 
                        !currentQuery ||
                        lead.leadName.toLowerCase().includes(currentQuery.toLowerCase()) ||
                        lead.leadPhone?.includes(currentQuery)
                    );
                    const isNovosLeadsColumn = stage.name === 'Novos Leads';

                    if (isNovosLeadsColumn) {
                        leadsForColumn.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    }

                    return (
                        <ProspectColumn key={stage.id} title={stage.name} count={leadsForColumn.length}>
                             <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={currentQuery}
                                    onChange={(e) => handleSearchChange(stage.id, e.target.value)}
                                    className="w-full bg-dark-background border border-dark-border rounded-lg pl-8 pr-2 py-1.5 text-sm"
                                />
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-secondary" />
                            </div>
                            {leadsForColumn.length > 0
                                ? leadsForColumn.map((lead, index) => (
                                    <LeadCard 
                                        key={lead.id} 
                                        lead={lead} 
                                        onClick={() => setProspectingLead(lead)} 
                                        isProspectingActionable={isNovosLeadsColumn}
                                        isDisabled={isNovosLeadsColumn && (hasLeadInProgress || isProspectingLocked || index > 0)} 
                                        isManagerView={isManagerView} 
                                        onReassign={setLeadToReassign}
                                        onTransfer={setLeadToTransfer} 
                                        allSalespeople={teamMembers}
                                        onReopenRequest={handleReopenRequest}
                                        isPending={pendingLeadIds.has(lead.id)}
                                        currentUserId={user.id}
                                    />
                                ))
                                : placeholderCard
                            }
                        </ProspectColumn>
                    );
                })}
                 {reallocatedColumn && (() => {
                    const reallocatedQuery = searchQueries[reallocatedColumn.id] || '';
                    const reallocatedLeads = (categorizedLeads[reallocatedColumn.id] || []).filter(lead =>
                        !reallocatedQuery ||
                        lead.leadName.toLowerCase().includes(reallocatedQuery.toLowerCase()) ||
                        lead.leadPhone?.includes(reallocatedQuery)
                    );
                    return (
                        <ProspectColumn title={reallocatedColumn.name} count={reallocatedLeads.length}>
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={reallocatedQuery}
                                    onChange={(e) => handleSearchChange(reallocatedColumn.id, e.target.value)}
                                    className="w-full bg-dark-background border border-dark-border rounded-lg pl-8 pr-2 py-1.5 text-sm"
                                />
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-secondary" />
                            </div>
                            {reallocatedLeads.length > 0
                                ? reallocatedLeads.map(lead => (
                                    <LeadCard 
                                        key={lead.id} 
                                        lead={lead} 
                                        isReassignedAwayView={true} 
                                        isManagerView={isManagerView} 
                                        allSalespeople={teamMembers}
                                        currentUserId={user.id}
                                    />
                                ))
                                : placeholderCard
                            }
                        </ProspectColumn>
                    );
                })()}
                {transferredColumn && (() => {
                    const transferredLeads = categorizedLeads[transferredColumn.id] || [];
                    return (
                        <ProspectColumn title={transferredColumn.name} count={transferredLeads.length}>
                            {transferredLeads.length > 0
                                ? transferredLeads.map(lead => (
                                    <LeadCard
                                        key={lead.id}
                                        lead={lead}
                                        isTransferredAwayView={true}
                                        isManagerView={isManagerView}
                                        allSalespeople={teamMembers}
                                        currentUserId={user.id}
                                    />
                                ))
                                : placeholderCard}
                        </ProspectColumn>
                    );
                })()}
            </div>

            <ConfirmationModal
                isOpen={!!prospectingLead}
                onClose={() => setProspectingLead(null)}
                onConfirm={handleStartProspecting}
                title="Iniciar Prospecção"
                confirmButtonText="Iniciar Prospecção"
                confirmButtonClass="bg-green-600 hover:bg-green-700"
            >
                Deseja mover o lead <strong className="text-dark-text">{prospectingLead?.leadName}</strong> para a etapa "Em Contato"?
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!leadToReopen}
                onClose={() => setLeadToReopen(null)}
                onConfirm={confirmReopenLead}
                title="Reabrir Atendimento"
                confirmButtonText="Sim, Reabrir"
                confirmButtonClass="bg-blue-600 hover:bg-blue-700"
            >
                Deseja reabrir o atendimento para o lead <strong className="text-dark-text">{leadToReopen?.leadName}</strong>? Ele voltará para a primeira etapa do funil.
            </ConfirmationModal>

             {leadToReassign && (
                <ReassignLeadModal
                    isOpen={!!leadToReassign}
                    onClose={() => setLeadToReassign(null)}
                    lead={leadToReassign}
                    salespeople={allSalespeople.filter(sp => sp.id !== leadToReassign.salespersonId)}
                    onConfirm={handleConfirmReassignment}
                />
            )}
            
            {leadToTransfer && (
                <TransferLeadModal
                    isOpen={!!leadToTransfer}
                    onClose={() => setLeadToTransfer(null)}
                    lead={leadToTransfer}
                    salespeople={allSalespeople.filter(sp => sp.id !== leadToTransfer.salespersonId)}
                    onConfirm={handleConfirmTransfer}
                />
            )}

            <Modal isOpen={isEditProfileModalOpen} onClose={() => setEditProfileModalOpen(false)}>
                <UserProfileForm initialData={user} onClose={() => setEditProfileModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}>
                <ChangePasswordForm onClose={() => setChangePasswordModalOpen(false)} />
            </Modal>

            <AgendaModal isOpen={isAgendaModalOpen} onClose={() => setIsAgendaModalOpen(false)} appointments={farmAppointments} />

            {isToolboxOpen && toolboxUrl && (
                <ToolboxViewer url={toolboxUrl} onClose={() => setIsToolboxOpen(false)} />
            )}

            <style>{`
                .filter-date-input { background-color: #10182C; border: 1px solid #243049; color: #E0E0E0; padding: 0.375rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 500; color-scheme: dark; }
                .filter-date-input::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
            `}</style>
        </div>
    );
};

export default ProspectAIScreen;