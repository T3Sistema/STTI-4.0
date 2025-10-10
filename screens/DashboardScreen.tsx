import React, { useState, useMemo, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { useData } from '../hooks/useMockData';
import { Vehicle, TeamMember, Company, ProspectAILead, HunterLead, PipelineStage } from '../types';
import KpiCard from '../components/KpiCard';
import VehicleCard from '../components/VehicleCard';
import TaskListCard from '../components/TaskListCard';
import { getDaysInStock, formatTimeUntil, formatDuration } from '../utils/dateUtils';
import { calculateTotalLoss, formatCurrency } from '../utils/calculationUtils';
import Modal from '../components/Modal';
import VehicleForm from '../components/forms/VehicleForm';
import ConfirmationModal from '../components/ConfirmationModal';
import AssignSalespersonModal from '../components/AssignSalespersonModal';
import SalesGoalKpiCard from '../components/SalesGoalKpiCard';
import FilterBar, { AdvancedFilters } from '../components/FilterBar';
import CompanyForm from '../components/forms/CompanyForm';
import UserProfileDropdown from '../components/UserProfileDropdown';
import ChangePasswordForm from '../components/forms/ChangePasswordForm';
import NotificationBell from '../components/NotificationBell';
import MarketingRequestModal from '../components/MarketingRequestModal';
import ImageLightbox from '../components/ImageLightbox';
import SalesAnalysisScreen from './SalesAnalysisScreen';
import LembrAIScreen from './LembrAIScreen';
import SalesTeamManagement from '../components/SalesTeamManagement';
import ProspectAIScreen from './ProspectAIScreen';
import Card from '../components/Card';
import { CogIcon } from '../components/icons/CogIcon';
import ProspectAISettingsScreen from './ProspectAISettingsScreen';
import { FilterIcon } from '../components/icons/FilterIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import PipelineSettingsScreen from './PipelineSettingsScreen';
import { CrosshairIcon } from '../components/icons/CrosshairIcon';
import HunterSettingsScreen from './HunterSettingsScreen';
import CompanyProspectPerformanceScreen from './CompanyProspectPerformanceScreen';
import { BullseyeIcon } from '../components/icons/BullseyeIcon';
import GoalSettingsScreen from './GoalSettingsScreen';
import { ToolboxIcon } from '../components/icons/ToolboxIcon';
import ToolboxViewer from '../components/ToolboxViewer';
import BusinessHoursSettingsScreen from './BusinessHoursSettingsScreen';
import { PhoneIcon } from '../components/icons/PhoneIcon';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from '../components/icons/ChatBubbleOvalLeftEllipsisIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { UserCircleIcon } from '../components/icons/UserCircleIcon';
import { LockIcon } from '../components/icons/LockIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { XIcon } from '../components/icons/XIcon';
import SalespersonHunterPerformanceScreen from './SalespersonHunterPerformanceScreen';
import { SearchIcon } from '../components/icons/SearchIcon';
import { ArrowPathIcon } from '../components/icons/ArrowPathIcon';
import GoalProgressCard from '../components/GoalProgressCard';
import { PlusIcon } from '../components/icons/PlusIcon';
import AddHunterLeadForm from '../components/forms/AddHunterLeadForm';
import { SwitchHorizontalIcon } from '../components/icons/SwitchHorizontalIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { ChartBarIcon } from '../components/icons/ChartBarIcon';


// --- HUNTER MODE COMPONENTS (Copied from SalespersonDashboardScreen.tsx for reusability without creating new files) ---

const getStageColorClasses = (stageName: string) => {
    switch (stageName) {
        case 'Novos Leads':
            return { bar: 'bg-dark-stage-new', badge: 'bg-dark-stage-new text-white' };
        case 'Primeira Tentativa':
            return { bar: 'bg-dark-stage-attempt1', badge: 'bg-dark-stage-attempt1 text-black' };
        case 'Segunda Tentativa':
            return { bar: 'bg-dark-stage-attempt2', badge: 'bg-dark-stage-attempt2 text-black' };
        case 'Terceira Tentativa':
            return { bar: 'bg-dark-stage-attempt3', badge: 'bg-dark-stage-attempt3 text-black' };
        case 'Agendado':
            return { bar: 'bg-dark-stage-scheduled', badge: 'bg-dark-stage-scheduled text-white' };
        case 'Remanejados':
        case 'Round-Robin':
            return { bar: 'bg-purple-500', badge: 'bg-purple-500 text-white' };
        case 'Finalizados':
            return { bar: 'bg-slate-500', badge: 'bg-slate-500 text-white' };
        default:
            return { bar: 'bg-gray-500', badge: 'bg-gray-500 text-white' };
    }
};

const getFeedbackSentiment = (text: string | undefined): 'positive' | 'negative' | 'neutral' => {
    if (!text) return 'neutral';
    const lowerText = text.toLowerCase();
    const positiveKeywords = ['agendou', 'consegui', 'interesse', 'positivo', 'marcado', 'agendado', 'confirmou', 'convertido'];
    const negativeKeywords = ['não quer', 'sem interesse', 'bloqueou', 'não tem', 'desistiu', 'recusou', 'não responde'];

    if (positiveKeywords.some(kw => lowerText.includes(kw))) return 'positive';
    if (negativeKeywords.some(kw => lowerText.includes(kw))) return 'negative';
    return 'neutral';
};

const feedbackColorClasses = {
    positive: 'bg-green-500/10 border-green-500/30 text-green-300',
    negative: 'bg-red-500/10 border-red-500/30 text-red-300',
    neutral: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
};

const HunterProspectCard: React.FC<{ title: string; count: number; color: string; }> = ({ title, count, color }) => (
    <Card className="bg-[#1C222C] p-4 text-center animate-fade-in">
        <p className="text-sm font-medium text-dark-secondary min-h-[2.5rem] flex items-center justify-center">{title}</p>
        <p className="text-4xl font-bold mt-2" style={{ color }}>{count}</p>
    </Card>
);

const HunterActionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    lead: HunterLead;
    stages: PipelineStage[];
    onAction: (lead: HunterLead, feedbackText: string, images: string[], targetStageId: string, outcome?: 'convertido' | 'nao_convertido' | null, appointment_at?: string) => Promise<void>;
}> = ({ isOpen, onClose, lead, stages, onAction }) => {
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    
    const currentStage = stages.find(s => s.id === lead.stage_id);
    const nextStage = stages.find(s => s.stageOrder > (currentStage?.stageOrder || 0) && !s.isFixed);

    useEffect(() => {
        if (!isOpen) {
            setFeedbackText('');
            setFeedbackImages([]);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setFeedbackImages(prev => [...prev, reader.result as string]);
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setFeedbackImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handlePerformAction = async (targetStageName: string, outcome?: 'convertido' | 'nao_convertido' | null, appointmentDateTime?: string) => {
        if (!feedbackText.trim()) {
            alert('Por favor, registre um feedback antes de finalizar.');
            return;
        }
        
        const targetStage = stages.find(s => s.name === targetStageName);
        if (!targetStage) {
            alert(`Erro: A etapa "${targetStageName}" não foi encontrada no pipeline.`);
            return;
        }
        
        setIsSubmitting(true);
        await onAction(lead, feedbackText, feedbackImages, targetStage.id, outcome, appointmentDateTime);
        onClose();
    };
    
    const handleOpenAppointmentModal = () => {
        const today = new Date();
        const defaultAppointmentTime = new Date(today.getTime() + 60 * 60 * 1000);
        setAppointmentDate(defaultAppointmentTime.toISOString().split('T')[0]);
        setAppointmentTime(defaultAppointmentTime.toTimeString().split(' ')[0].substring(0, 5));
        setIsAppointmentModalOpen(true);
    };

    const handleConfirmAppointment = (e: FormEvent) => {
        e.preventDefault();
        const appointmentDateTime = `${appointmentDate}T${appointmentTime}`;
        handlePerformAction('Agendado', undefined, appointmentDateTime);
        setIsAppointmentModalOpen(false);
    };

    return (
        <>
            <Modal isOpen={isOpen && !isAppointmentModalOpen} onClose={onClose}>
                 <div className="p-2 space-y-4">
                    <h2 className="text-2xl font-bold text-center">Registrar Ação</h2>
                    <div className="p-4 bg-dark-background rounded-lg border border-dark-border text-center">
                        <h3 className="text-2xl font-bold text-dark-primary">{lead.leadName}</h3>
                        <p className="text-dark-secondary mt-1">{lead.leadPhone}</p>
                    </div>
                     <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-dark-secondary mb-2">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
                            Feedback do Contato (Obrigatório)
                        </label>
                        <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm bg-dark-background border border-dark-border rounded-md" placeholder="Descreva o resultado do contato..."/>
                    </div>
                     <div>
                        <label htmlFor={`hunter-image-upload-${lead.id}`} className="w-full cursor-pointer text-center bg-dark-background hover:bg-dark-border/50 border border-dark-border text-dark-text font-medium py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2">
                            <UploadIcon className="w-4 h-4"/>
                            <span>Adicionar Imagens (Print)</span>
                        </label>
                        <input id={`hunter-image-upload-${lead.id}`} type="file" multiple className="sr-only" onChange={handleImageChange} accept="image/*" />
                    </div>
                    {feedbackImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {feedbackImages.map((imgSrc, index) => (
                                <div key={index} className="relative group">
                                    <img src={imgSrc} alt={`Preview ${index}`} className="w-full h-16 object-cover rounded-md" />
                                    <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                     <div className="pt-4 border-t border-dark-border">
                        <h4 className="text-center text-sm font-bold text-dark-secondary mb-3">Próximas Ações</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {nextStage && (
                                <button onClick={() => handlePerformAction(nextStage.name)} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 sm:col-span-2">
                                    <ArrowRightIcon className="w-5 h-5"/> Mover para {nextStage.name}
                                </button>
                            )}
                            <button onClick={handleOpenAppointmentModal} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
                                <CalendarIcon className="w-5 h-5"/> Agendar
                            </button>
                            <button onClick={() => handlePerformAction('Finalizados', 'convertido')} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-green-500/20 text-green-300 hover:bg-green-500/30">
                                <CheckCircleIcon className="w-5 h-5"/> Lead convertido
                            </button>
                            <button onClick={() => handlePerformAction('Finalizados', 'nao_convertido')} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-red-500/20 text-red-300 hover:bg-red-500/30 sm:col-span-2">
                                <XCircleIcon className="w-5 h-5"/> Lead não convertido
                            </button>
                        </div>
                    </div>
                </div>
                <style>{`.action-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; font-bold; padding: 1rem 0.5rem; border-radius: 0.5rem; transition: background-color 0.2s; text-align: center; opacity: 1; } .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }`}</style>
            </Modal>
             <Modal isOpen={isAppointmentModalOpen} onClose={() => setIsAppointmentModalOpen(false)}>
                <form onSubmit={handleConfirmAppointment} className="space-y-4">
                    <h2 className="text-2xl font-bold text-center">Agendar Atendimento</h2>
                    <p className="text-center text-dark-secondary">Selecione a data e hora para o lead <strong className="text-dark-text">{lead.leadName}</strong>.</p>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-secondary mb-1">Data</label>
                            <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required className="input-style" min={new Date().toISOString().split('T')[0]}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-secondary mb-1">Hora</label>
                            <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} required className="input-style"/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsAppointmentModalOpen(false)} className="px-4 py-2 rounded-md bg-dark-border/50 hover:bg-dark-border font-bold">Cancelar</button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-dark-primary text-dark-background font-bold hover:opacity-90">Agendar</button>
                    </div>
                    <style>{`.input-style { width: 100%; padding: 0.5rem 0.75rem; background-color: #0A0F1E; border: 1px solid #243049; border-radius: 0.375rem; color: #E0E0E0; }.input-style::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }`}</style>
                </form>
            </Modal>
        </>
    );
};

const HunterLeadCard: React.FC<{ 
    lead: HunterLead; 
    isNewLead: boolean;
    stageName: string;
    onStartProspecting: () => void;
    onOpenActions: () => void;
    isDisabled?: boolean;
    isFinalized?: boolean;
    onReopen?: () => void;
}> = ({ lead, isNewLead, stageName, onStartProspecting, onOpenActions, isDisabled = false, isFinalized = false, onReopen }) => {
    const { updateHunterLead } = useData();
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(lead.leadName);
    
    const handleCopyPhone = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(lead.leadPhone);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
    };

    const handleClick = () => {
        if (isEditingName) return;
        if (isDisabled) return;
        if (isNewLead) {
            onStartProspecting();
        } else if (isFinalized) {
            onReopen?.();
        } else {
            onOpenActions();
        }
    };

    const handleSaveName = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (newName.trim() === '' || newName.trim() === lead.leadName) {
            setIsEditingName(false);
            setNewName(lead.leadName);
            return;
        }
        await updateHunterLead(lead.id, { lead_name: newName.trim() });
        setIsEditingName(false);
    };

    const lastFeedback = lead.feedback?.length > 0 ? lead.feedback[lead.feedback.length - 1] : null;
    const sentiment = getFeedbackSentiment(lastFeedback?.text);
    const isNameEditable = lead.leadName.toLowerCase() === 'sem nome';

    let borderColorClass = 'border-dark-border';
    if (isFinalized) {
        if (lead.outcome === 'convertido') borderColorClass = 'border-dark-success';
        else if (lead.outcome === 'nao_convertido') borderColorClass = 'border-dark-error';
        else borderColorClass = 'border-dark-secondary';
    } else {
        switch (stageName) {
            case 'Novos Leads': borderColorClass = 'border-dark-stage-new'; break;
            case 'Primeira Tentativa': borderColorClass = 'border-dark-stage-attempt1'; break;
            case 'Segunda Tentativa': borderColorClass = 'border-dark-stage-attempt2'; break;
            case 'Terceira Tentativa': borderColorClass = 'border-dark-stage-attempt3'; break;
            case 'Agendado': borderColorClass = 'border-dark-stage-scheduled'; break;
            default: borderColorClass = 'border-dark-border'; break;
        }
    }

    return (
        <Card 
            className={`p-4 transition-all duration-300 relative border-2 ${borderColorClass} ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-dark-card-active hover:shadow-glow'}`}
            onClick={handleClick}
        >
             {isDisabled && isNewLead && (
                <div className="absolute top-2 right-2 p-1 bg-dark-background/80 rounded-full" title="Prospecção bloqueada. Finalize o lead em andamento ou o anterior na fila.">
                    <LockIcon className="w-4 h-4 text-dark-secondary" />
                </div>
            )}
            <div className="space-y-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-background border border-dark-border flex items-center justify-center">
                            <UserCircleIcon className="w-6 h-6 text-dark-primary" />
                        </div>
                        <div>
                            {isEditingName ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveName(e); } else if (e.key === 'Escape') { e.preventDefault(); setIsEditingName(false); setNewName(lead.leadName); }}} className="bg-dark-background border-b border-dark-primary text-sm font-semibold text-dark-text focus:outline-none w-32" autoFocus />
                                    <button onClick={handleSaveName} className="p-1 text-green-400 hover:bg-dark-border rounded-full"><CheckIcon className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsEditingName(false); setNewName(lead.leadName); }} className="p-1 text-red-400 hover:bg-dark-border rounded-full"><XIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold leading-normal text-dark-text">{lead.leadName}</h4>
                                    {isNameEditable && ( <button onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} className="text-dark-secondary hover:text-dark-primary"><PencilIcon className="w-3 h-3" /></button> )}
                                </div>
                            )}
                            <p className="text-xs leading-normal text-dark-secondary">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
                {!isNewLead && !isFinalized && (
                    <div className="space-y-3 pt-3 border-t border-dark-border">
                        <div className="flex items-center justify-between gap-2 text-sm text-dark-secondary">
                            <div className="flex items-center gap-2">
                                <PhoneIcon className="w-4 h-4" />
                                <span className="text-sm font-normal leading-normal text-dark-text">{lead.leadPhone}</span>
                            </div>
                            <button onClick={handleCopyPhone} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md transition-colors ${isCopied ? 'bg-green-500/20 text-green-400' : 'bg-dark-border/50 hover:bg-dark-border'}`}>
                                {isCopied ? <CheckIcon className="w-3 h-3"/> : <ClipboardIcon className="w-3 h-3" />}
                                {isCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                        {lastFeedback && ( <div className={`p-2 rounded-lg border text-xs ${feedbackColorClasses[sentiment]}`}><p className="font-bold uppercase tracking-wider mb-1 text-[10px]">Último Feedback:</p><p className="italic text-white/90 truncate text-sm">"{lastFeedback.text}"</p></div> )}
                    </div>
                )}
                 {isFinalized && !isNewLead && ( <div className="pt-3 border-t border-dark-border text-center space-y-2"><p className={`text-sm font-bold ${lead.outcome === 'convertido' ? 'text-green-400' : 'text-red-400'}`}>{lead.outcome === 'convertido' ? 'Convertido' : 'Não Convertido'}</p><button className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"><ArrowPathIcon className="w-4 h-4" /> Reabrir Atendimento</button></div>)}
            </div>
        </Card>
    );
};

const HunterProspectColumn: React.FC<{ title: string; count: number; children: React.ReactNode; }> = ({ title, count, children }) => {
    const { bar, badge } = getStageColorClasses(title);
    return (
      <div className="w-full md:w-80 flex-shrink-0 bg-dark-card rounded-xl flex flex-col overflow-hidden shadow-lg border border-dark-border/30">
          <div className="p-4"><div className="flex justify-between items-center"><h3 className="text-base font-semibold text-white uppercase tracking-wide">{title}</h3><div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${badge}`}>{count}</div></div></div>
          <div className={`h-1.5 w-full ${bar}`}></div>
          <div className="p-4 space-y-4 overflow-y-auto flex-grow max-h-[calc(100vh-25rem)]">{children}</div>
      </div>
    );
};

type Period = 'last_7_days' | 'last_30_days' | 'all' | 'custom';

const HunterScreen: React.FC<{ user: TeamMember, activeCompany: Company }> = ({ user, activeCompany }) => {
    const { hunterLeads, prospectaiLeads, updateHunterLead, addHunterLeadAction, teamMembers, addHunterLead, toolboxUrl } = useData();
    const [selectedLead, setSelectedLead] = useState<HunterLead | null>(null);
    const [leadToProspect, setLeadToProspect] = useState<HunterLead | null>(null);
    const [isPerformanceView, setIsPerformanceView] = useState(false);
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
    const [leadToReopen, setLeadToReopen] = useState<HunterLead | null>(null);
    const [period, setPeriod] = useState<Period>('last_7_days');
    const [customRange, setCustomRange] = useState({ start: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) });
    const [isAddLeadModalOpen, setAddLeadModalOpen] = useState(false);
    const [isToolboxOpen, setIsToolboxOpen] = useState(false);

    const handleSearchChange = (stageId: string, query: string) => setSearchQueries(prev => ({ ...prev, [stageId]: query }));
    const companyPipeline = useMemo(() => activeCompany.pipeline_stages.filter(s => s.isEnabled).sort((a, b) => a.stageOrder - b.stageOrder), [activeCompany]);
    const myLeads = useMemo(() => {
        const baseLeads = hunterLeads.filter(lead => lead.salespersonId === user.id);
        if (period === 'all') return baseLeads;
        let startDate: Date, endDate: Date = new Date();
        endDate.setHours(23, 59, 59, 999);
        if (period === 'last_7_days') { startDate = new Date(); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0, 0, 0, 0); }
        else if (period === 'last_30_days') { startDate = new Date(); startDate.setDate(startDate.getDate() - 29); startDate.setHours(0, 0, 0, 0); }
        else { if (!customRange.start || !customRange.end) return []; startDate = new Date(customRange.start + 'T00:00:00'); endDate = new Date(customRange.end + 'T23:59:59.999'); }
        return baseLeads.filter(lead => { const leadDate = new Date(lead.createdAt); return leadDate >= startDate && leadDate <= endDate; });
    }, [hunterLeads, user.id, period, customRange]);
    const categorizedLeads = useMemo(() => { const c: Record<string, HunterLead[]> = {}; companyPipeline.forEach(s => { c[s.id] = []; }); myLeads.forEach(l => { if (c[l.stage_id]) c[l.stage_id].push(l); }); return c; }, [myLeads, companyPipeline]);
    const hasLeadInProgress = useMemo(() => { const s = companyPipeline.find(s => s.name === 'Primeira Tentativa'); return !!s && (categorizedLeads[s.id]?.length || 0) > 0; }, [categorizedLeads, companyPipeline]);
    const counts = useMemo(() => {
        const r: Record<string, number> = {}; let activeTotal = 0;
        companyPipeline.forEach(s => { const count = categorizedLeads[s.id]?.length || 0; r[s.name] = count; if (s.name === 'Finalizados') { r['Convertidos'] = (categorizedLeads[s.id] || []).filter(l => l.outcome === 'convertido').length; r['Não Convertidos'] = (categorizedLeads[s.id] || []).filter(l => l.outcome === 'nao_convertido').length; } else if (!s.isFixed || s.name === 'Novos Leads') { activeTotal += count; }});
        r['Meus Leads Ativos'] = activeTotal; return r;
    }, [categorizedLeads, companyPipeline]);
    const kpiCardsToRender = useMemo(() => {
        const kpis: { title: string; count: number; color: string }[] = []; const dynColors = ['#FBBF24', '#F59E0B', '#8B5CF6', '#60A5FA', '#34D399', '#FB923C']; let cIdx = 0;
        const staticOrder = ['Meus Leads Ativos', 'Convertidos', 'Não Convertidos', 'Agendados', 'Novos Leads']; const staticColors: Record<string, string> = { 'Meus Leads Ativos': '#00D1FF', 'Convertidos': '#22C55E', 'Não Convertidos': '#EF4444', 'Agendados': '#60A5FA', 'Novos Leads': '#FBBF24' };
        staticOrder.forEach(t => { if (counts[t] !== undefined) kpis.push({ title: t, count: counts[t], color: staticColors[t] }); });
        companyPipeline.forEach(s => { if (!s.isFixed && !staticOrder.includes(s.name)) { kpis.push({ title: s.name, count: counts[s.name] || 0, color: dynColors[cIdx++ % dynColors.length] }); } });
        return kpis;
    }, [counts, companyPipeline]);
    const monthlyTotalConvertedLeads = useMemo(() => {
        const today = new Date(); const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); endOfMonth.setHours(23, 59, 59, 999);
        const finalizadosStageId = companyPipeline.find(s => s.name === 'Finalizados')?.id; if (!finalizadosStageId) return 0;
        const convertedHunter = hunterLeads.filter(l => { if (l.salespersonId !== user.id || l.stage_id !== finalizadosStageId || l.outcome !== 'convertido') return false; const d = l.lastActivity ? new Date(l.lastActivity) : null; return d && d >= startOfMonth && d <= endOfMonth; }).length;
        const convertedFarm = prospectaiLeads.filter(l => { if (l.salespersonId !== user.id || l.stage_id !== finalizadosStageId || l.outcome !== 'convertido') return false; const d = l.last_feedback_at ? new Date(l.last_feedback_at) : null; return d && d >= startOfMonth && d <= endOfMonth; }).length;
        return convertedFarm + convertedHunter;
    }, [hunterLeads, prospectaiLeads, user.id, companyPipeline]);
    const hunterGoal = user.prospectAISettings?.hunter_goals;
    const prospectedLeadsInPeriod = useMemo(() => myLeads.filter(l => l.prospected_at).length, [myLeads]);
    const handleStartProspectingConfirm = async () => { if (!leadToProspect) return; const s = companyPipeline.find(s => s.name === 'Primeira Tentativa') || companyPipeline.find(s => !s.isFixed && s.stageOrder > 0); if (s) { await updateHunterLead(leadToProspect.id, { stage_id: s.id, prospected_at: new Date().toISOString(), last_activity: new Date().toISOString() }); } else { console.error("Pipeline config error"); alert("Erro de configuração do Pipeline."); } setLeadToProspect(null); };
    const confirmReopenLead = async () => { if (!leadToReopen) return; const s = companyPipeline.find(s => s.name === 'Primeira Tentativa'); if (s) await updateHunterLead(leadToReopen.id, { stage_id: s.id, outcome: null }); setLeadToReopen(null); };
    const periodOptions: { id: Period; label: string }[] = [{ id: 'last_7_days', label: 'Últimos 7 dias' }, { id: 'last_30_days', label: 'Últimos 30 dias' }, { id: 'all', label: 'Todo o Período' }, { id: 'custom', label: 'Personalizado' }];
    const handleAddOwnLead = async (name: string, phone: string) => { await addHunterLead({ name, phone, companyId: activeCompany.id, salespersonId: user.id }); alert('Lead cadastrado!'); };
    if (isPerformanceView) { const allMyLeads = hunterLeads.filter(l => l.salespersonId === user.id); return <SalespersonHunterPerformanceScreen user={user} leads={allMyLeads} onBack={() => setIsPerformanceView(false)} allSalespeople={teamMembers} />; }
    if (myLeads.length === 0 && period === 'all') { return ( <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border mt-8"><CheckCircleIcon className="w-16 h-16 mx-auto text-green-400" /><h3 className="text-2xl font-bold text-dark-text mt-4">Fila Vazia</h3><p className="text-dark-secondary mt-2 max-w-md mx-auto">Você não possui leads. Aguarde o gestor distribuir uma nova base ou cadastre um lead.</p><button onClick={() => setAddLeadModalOpen(true)} className="mt-6 flex items-center gap-2 bg-dark-primary text-dark-background px-4 py-2 rounded-lg hover:opacity-90 font-bold text-sm mx-auto"><PlusIcon className="w-4 h-4" /> Cadastrar Lead</button><Modal isOpen={isAddLeadModalOpen} onClose={() => setAddLeadModalOpen(false)}><AddHunterLeadForm onSave={handleAddOwnLead} onClose={() => setAddLeadModalOpen(false)} /></Modal></div> ); }
    return (
        <div className="mt-8">
            {user.prospectAISettings?.deadlines?.initial_contact?.auto_reassign_enabled && (
                <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-4 mb-8 flex items-start gap-4 animate-fade-in">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mt-1">
                        <SwitchHorizontalIcon className="w-5 h-5 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">Modo de Remanejamento Automático Ativo</h3>
                        <p className="text-sm text-yellow-200 mt-1">
                            Lembrete: As regras de prospecção para novos leads (modo Farm) estão ativas. Leads não atendidos em <strong>{user.prospectAISettings.deadlines.initial_contact.minutes} minutos</strong> serão remanejados.
                        </p>
                    </div>
                </div>
            )}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                <div className="flex items-center gap-3">
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
                    <button
                        onClick={() => setAddLeadModalOpen(true)}
                        className="flex items-center gap-2 bg-dark-primary text-dark-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-bold text-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Cadastrar Lead</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-6 mb-8">
                 <GoalProgressCard 
                    title="Meta de Vendas (Mês)"
                    current={monthlyTotalConvertedLeads}
                    goal={user.monthlySalesGoal}
                />
                {hunterGoal && hunterGoal.value > 0 && (
                    <GoalProgressCard 
                        title={`Meta Prospecção (${hunterGoal.type === 'daily' ? 'Diária' : hunterGoal.type === 'weekly' ? 'Semanal' : 'Mensal'})`}
                        current={prospectedLeadsInPeriod}
                        goal={hunterGoal.value}
                    />
                )}
                {kpiCardsToRender.map(kpi => (
                    <HunterProspectCard key={kpi.title} title={kpi.title} count={kpi.count} color={kpi.color} />
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:overflow-x-auto md:space-x-6 md:pb-4 gap-6 md:gap-0">
                 {companyPipeline.filter(s => s.name !== 'Remanejados').map(stage => {
                    const currentQuery = searchQueries[stage.id] || '';
                    const isNewLeadColumn = stage.name === 'Novos Leads';
                    
                    let leadsForColumn = (categorizedLeads[stage.id] || []).filter(lead => 
                        !currentQuery || 
                        lead.leadName.toLowerCase().includes(currentQuery.toLowerCase()) ||
                        lead.leadPhone.includes(currentQuery)
                    );

                    if (isNewLeadColumn) {
                        leadsForColumn.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    }

                    return (
                        <HunterProspectColumn key={stage.id} title={stage.name} count={leadsForColumn.length}>
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
                                    <HunterLeadCard 
                                        key={lead.id} 
                                        lead={lead}
                                        isNewLead={isNewLeadColumn}
                                        stageName={stage.name}
                                        onStartProspecting={() => setLeadToProspect(lead)}
                                        onOpenActions={() => setSelectedLead(lead)}
                                        onReopen={() => setLeadToReopen(lead)}
                                        isDisabled={isNewLeadColumn && (hasLeadInProgress || index > 0)}
                                        isFinalized={stage.name === 'Finalizados'}
                                    />
                                ))
                                : <div className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center text-dark-secondary">Nenhum lead nesta etapa.</div>
                            }
                        </HunterProspectColumn>
                    )
                })}
            </div>

            {selectedLead && (
                <HunterActionModal 
                    isOpen={!!selectedLead}
                    onClose={() => setSelectedLead(null)}
                    lead={selectedLead}
                    stages={companyPipeline}
                    onAction={addHunterLeadAction}
                />
            )}

            <ConfirmationModal
                isOpen={!!leadToProspect}
                onClose={() => setLeadToProspect(null)}
                onConfirm={handleStartProspectingConfirm}
                title="Iniciar Prospecção"
                confirmButtonText="Iniciar"
                confirmButtonClass="bg-green-600 hover:bg-green-700"
            >
                Deseja iniciar a prospecção do lead <strong className="text-dark-text">{leadToProspect?.leadName}</strong>?
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
             <Modal isOpen={isAddLeadModalOpen} onClose={() => setAddLeadModalOpen(false)}>
                <AddHunterLeadForm
                    onSave={handleAddOwnLead}
                    onClose={() => setAddLeadModalOpen(false)}
                />
            </Modal>
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


// --- END OF COPIED COMPONENTS ---

interface DashboardScreenProps {
  onLogout: () => void;
  companyId: string;
}

type StockView = 'available' | 'sold';

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onLogout, companyId }) => {
    const { 
        companies, vehicles, teamMembers, notifications, prospectaiLeads, hunterLeads,
        updateCompany, updateTeamMember,
        deleteVehicle, deleteTeamMember,
        markVehicleAsSold, assignSalesperson,
        toggleVehiclePriority, addNotification,
        markNotificationAsRead,
        toolboxUrl,
    } = useData();
    
    // View State
    const [currentView, setCurrentView] = useState<'dashboard' | 'salesAnalysis' | 'lembrAI' | 'prospectAI' | 'prospectAnalysis'>('dashboard');
    const [stockView, setStockView] = useState<StockView>('available');
    
    // Modal States
    const [isVehicleModalOpen, setVehicleModalOpen] = useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isCompanyModalOpen, setCompanyModalOpen] = useState(false);
    const [isTeamModalOpen, setTeamModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isMarketingModalOpen, setMarketingModalOpen] = useState(false);
    const [vehicleToAssign, setVehicleToAssign] = useState<Vehicle | null>(null);
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [isToolboxOpen, setIsToolboxOpen] = useState(false);

    // Data States for CRUD
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
    const [deletingItemId, setDeletingItemId] = useState<{id: string; type: 'vehicle' | 'teamMember'} | null>(null);
    const [selectedProspectUser, setSelectedProspectUser] = useState<TeamMember | null>(null);

    // New states for ProspectAI settings view and manager's prospect view
    const [prospectAIView, setProspectAIView] = useState<'overview' | 'settings_choice' | 'pipeline_settings' | 'deadline_settings_list' | 'deadline_settings_form' | 'hunter_settings' | 'goal_settings' | 'automations_choice' | 'business_hours_settings'>('overview');
    const [selectedSalespersonForSettings, setSelectedSalespersonForSettings] = useState<TeamMember | null>(null);
    const [prospectViewForSelectedUser, setProspectViewForSelectedUser] = useState<'farm' | 'hunter'>('farm');


    // Filter States
    const [filters, setFilters] = useState<AdvancedFilters>({
        salespersonIds: [],
        stockDays: [],
        priceRanges: [],
        modelNames: [],
    });
    const [isOverdueFilterActive, setOverdueFilterActive] = useState(false);
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<string | null>(null);
    const [highlightedVehicleId, setHighlightedVehicleId] = useState<string | null>(null);
    const highlightTimeoutRef = useRef<number | null>(null);
    const [isPriorityFilterActive, setPriorityFilterActive] = useState(false);


    // Active company data
    const activeCompany = companies.find(c => c.id === companyId);
    
    if (!activeCompany) {
        return <div>Carregando dados da empresa...</div>;
    }
    
    const companyFeatures = activeCompany?.enabledFeatures || [];

    useEffect(() => {
        if (companyFeatures && companyFeatures.length === 1) {
            const singleFeature = companyFeatures[0];
            if (singleFeature === 'prospectai') {
                setCurrentView('prospectAI');
            }
        }
    }, [activeCompany, companyFeatures]);
    
    useEffect(() => {
        if (currentView !== 'prospectAI') {
            setProspectAIView('overview');
        }
    }, [currentView]);

    const companyTeamMembers = teamMembers.filter(s => s.companyId === activeCompany?.id);
    const companySalespeople = companyTeamMembers.filter(tm => tm.role === 'Vendedor');
    const userNotifications = notifications.filter(n => n.recipientRole === 'company');

    const salespersonFilteredVehicles = useMemo(() => {
        const allCompanyVehicles = vehicles.filter(v => v.companyId === activeCompany?.id);
        if (!selectedSalespersonId) {
            return allCompanyVehicles;
        }
        return allCompanyVehicles.filter(v => v.salespersonId === selectedSalespersonId);
    }, [vehicles, activeCompany?.id, selectedSalespersonId]);
    
    const availableVehicles = salespersonFilteredVehicles.filter(v => v.status !== 'sold');
    const soldVehicles = salespersonFilteredVehicles.filter(v => v.status === 'sold').sort((a, b) => new Date(b.saleDate!).getTime() - new Date(a.saleDate!).getTime());

    const soldVehiclesThisMonth = soldVehicles.filter(v => {
        if (!v.saleDate) return false;
        const saleDate = new Date(v.saleDate);
        const today = new Date();
        return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
    });

    const priorityVehicles = availableVehicles.filter(v => v.isPriority || getDaysInStock(v.entryDate) > v.saleGoalDays);
    const totalLoss = availableVehicles.reduce((sum, v) => sum + calculateTotalLoss(v), 0);
    const totalAdBudget = availableVehicles.reduce((sum, v) => sum + v.adCost, 0);

    const newVehiclesThisMonth = useMemo(() => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return availableVehicles.filter(v => {
            const entryDate = new Date(v.entryDate);
            return entryDate >= startOfMonth && entryDate <= today;
        }).length;
    }, [availableVehicles]);
    
    const stockTrend = newVehiclesThisMonth > 0 ? `+${newVehiclesThisMonth} este mês` : "Nenhuma alteração";
    
    const lossTrendLastWeek = useMemo(() => {
        return availableVehicles.reduce((sum, v) => {
            const dailyLoss = v.dailyCost + v.adCost;
            const daysInStock = getDaysInStock(v.entryDate);
            const lossForThisVehicle = dailyLoss * Math.min(daysInStock, 7);
            return sum + lossForThisVehicle;
        }, 0);
    }, [availableVehicles]);

    const lossTrend = lossTrendLastWeek > 0 ? `+${formatCurrency(lossTrendLastWeek)} sem.` : "Nenhuma alteração";
    
    const salesGoalProps = useMemo(() => {
        const selectedSalesperson = companySalespeople.find(s => s.id === selectedSalespersonId);
        
        if (selectedSalesperson) {
            return {
                title: `Meta de Vendas de ${selectedSalesperson.name.split(' ')[0]}`,
                currentValue: soldVehiclesThisMonth.length,
                goalValue: availableVehicles.length,
            };
        }
        
        return {
            title: "Meta de Vendas Mensal",
            currentValue: soldVehiclesThisMonth.length,
            goalValue: availableVehicles.length,
        };
    }, [selectedSalespersonId, companySalespeople, soldVehiclesThisMonth, availableVehicles]);


    const filteredVehicles = useMemo(() => {
        if (isPriorityFilterActive) {
            return priorityVehicles;
        }

        let vehiclesToFilter = [...availableVehicles];

        if (isOverdueFilterActive) {
            vehiclesToFilter = vehiclesToFilter.filter(v => getDaysInStock(v.entryDate) > 30);
        }

        const { salespersonIds, stockDays, priceRanges, modelNames } = filters;
        
        if (salespersonIds.length > 0) {
            vehiclesToFilter = vehiclesToFilter.filter(v => 
                (salespersonIds.includes('unassigned') && !v.salespersonId) || 
                (v.salespersonId && salespersonIds.includes(v.salespersonId))
            );
        }

        if (modelNames.length > 0) {
            vehiclesToFilter = vehiclesToFilter.filter(v => modelNames.includes(v.model));
        }

        if (stockDays.length > 0) {
            vehiclesToFilter = vehiclesToFilter.filter(v => {
                const days = getDaysInStock(v.entryDate);
                return stockDays.some(range => {
                    if (range === '0-15') return days <= 15;
                    if (range === '16-30') return days > 15 && days <= 30;
                    if (range === '31-60') return days > 30 && days <= 60;
                    if (range === '60+') return days > 60;
                    return false;
                });
            });
        }
        
        if (priceRanges.length > 0) {
            vehiclesToFilter = vehiclesToFilter.filter(v => {
                const price = v.announcedPrice;
                return priceRanges.some(range => {
                    if (range === '0-50000') return price <= 50000;
                    if (range === '50001-100000') return price > 50000 && price <= 100000;
                    if (range === '100001-150000') return price > 100000 && price <= 150000;
                    if (range === '150001+') return price > 150000;
                    return false;
                });
            });
        }
        
        return vehiclesToFilter;

    }, [availableVehicles, priorityVehicles, filters, isOverdueFilterActive, isPriorityFilterActive]);


    const handleAddVehicle = () => {
        setEditingVehicle(undefined);
        setVehicleModalOpen(true);
    };

    const handleEditVehicle = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setVehicleModalOpen(true);
    };
    
    const handleDeleteRequest = (id: string, type: 'vehicle' | 'teamMember') => {
        setDeletingItemId({ id, type });
        setConfirmModalOpen(true);
    };

    const confirmDeletion = () => {
        if (!deletingItemId) return;

        if (deletingItemId.type === 'vehicle') {
            deleteVehicle(deletingItemId.id);
        } else {
            deleteTeamMember(deletingItemId.id);
        }
        
        setConfirmModalOpen(false);
        setDeletingItemId(null);
    };

    const handleSaveAssignment = (salespersonId: string | null) => {
        if (vehicleToAssign?.id) {
            assignSalesperson(vehicleToAssign.id, salespersonId);
        }
        setVehicleToAssign(null);
    };

    const handlePriorityVehicleClick = (vehicleId: string) => {
        setStockView('available');
        setTimeout(() => {
            const element = document.getElementById(`vehicle-card-${vehicleId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedVehicleId(vehicleId);

                if (highlightTimeoutRef.current) {
                    clearTimeout(highlightTimeoutRef.current);
                }

                highlightTimeoutRef.current = window.setTimeout(() => {
                    setHighlightedVehicleId(null);
                }, 2500);
            }
        }, 100);
    };

    const handlePriorityFilterToggle = () => {
        if (stockView === 'sold') setStockView('available');
        setPriorityFilterActive(prev => !prev);
    };

    const vehiclesToDisplay = stockView === 'available' ? filteredVehicles : soldVehicles;
    const title = useMemo(() => {
        if (stockView === 'sold') return 'Histórico de Veículos Vendidos';
        if (isPriorityFilterActive) return 'Veículos Prioritários em Estoque';
        return 'Estoque de Veículos';
    }, [stockView, isPriorityFilterActive]);

    if (currentView === 'salesAnalysis') {
        return (
             <SalesAnalysisScreen 
                onBack={() => setCurrentView('dashboard')}
                company={activeCompany}
                salespeople={companySalespeople}
                vehicles={vehicles.filter(v => v.companyId === activeCompany.id)}
                updateCompany={updateCompany}
                updateSalesperson={updateTeamMember}
             />
        );
    }
    
    if (currentView === 'lembrAI') {
        return (
            <LembrAIScreen onBack={() => setCurrentView('dashboard')} companyId={activeCompany.id} />
        );
    }

    if (currentView === 'prospectAnalysis') {
        return (
            <CompanyProspectPerformanceScreen
                onBack={() => setCurrentView('prospectAI')}
                company={activeCompany}
                salespeople={companySalespeople}
                prospectaiLeads={prospectaiLeads.filter(l => l.companyId === companyId)}
                hunterLeads={hunterLeads.filter(l => l.companyId === companyId)}
            />
        );
    }
    
    if (selectedProspectUser) {
        return (
            <div className="animate-fade-in">
                <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <button onClick={() => setSelectedProspectUser(null)} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                            &larr; Voltar para Visão Geral
                        </button>
                        <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Pipeline de {selectedProspectUser.name.split(' ')[0]}</h1>
                    </div>
                    <div className="bg-dark-card p-1 rounded-lg border border-dark-border flex flex-wrap items-center gap-1">
                        <button
                            onClick={() => setProspectViewForSelectedUser('farm')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${prospectViewForSelectedUser === 'farm' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}
                        >
                            Modo Farm
                        </button>
                        {selectedProspectUser.isHunterModeActive && (
                            <button
                                onClick={() => setProspectViewForSelectedUser('hunter')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${prospectViewForSelectedUser === 'hunter' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}
                            >
                                Modo Hunter
                            </button>
                        )}
                    </div>
                </header>

                {prospectViewForSelectedUser === 'farm' ? (
                    <ProspectAIScreen
                        user={selectedProspectUser}
                        onBack={() => setSelectedProspectUser(null)}
                        onLogout={onLogout}
                        showBackButton={false}
                        isManagerView={true}
                        allSalespeople={companySalespeople}
                    />
                ) : (
                    <HunterScreen user={selectedProspectUser} activeCompany={activeCompany} />
                )}
            </div>
        );
    }


     if (currentView === 'prospectAI') {
        if (prospectAIView === 'automations_choice') {
            return (
                <div className="animate-fade-in">
                     <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                        <div>
                            <button onClick={() => setProspectAIView('settings_choice')} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                                &larr; Voltar para Configurações
                            </button>
                            <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Prazos e Automações</h1>
                        </div>
                    </header>
                    <p className="text-dark-secondary mb-8 text-center text-lg">Selecione o que você deseja configurar.</p>
                     <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card
                            className="p-6 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50 flex flex-col items-center justify-center gap-4"
                            onClick={() => setProspectAIView('deadline_settings_list')}
                        >
                            <ClockIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Prazos dos Vendedores</h4>
                            <p className="text-sm text-dark-secondary">Defina os tempos de resposta e regras de remanejamento para a equipe.</p>
                        </Card>
                        <Card
                            className="p-6 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50 flex flex-col items-center justify-center gap-4"
                            onClick={() => setProspectAIView('business_hours_settings')}
                        >
                            <ClockIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Horário de Funcionamento</h4>
                            <p className="text-sm text-dark-secondary">Configure o expediente para que os remanejamentos automáticos só ocorram em horário comercial.</p>
                        </Card>
                    </div>
                </div>
            );
        }

        if (prospectAIView === 'business_hours_settings') {
            return (
                <BusinessHoursSettingsScreen
                    companyId={activeCompany.id}
                    onBack={() => setProspectAIView('automations_choice')}
                />
            );
        }
        
        if (prospectAIView === 'deadline_settings_list') {
            return (
                <div className="animate-fade-in">
                    <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                         <div>
                            <button onClick={() => setProspectAIView('automations_choice')} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                                &larr; Voltar
                            </button>
                            <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Prazos dos Vendedores</h1>
                        </div>
                    </header>
                    <p className="text-dark-secondary mb-8">Selecione um vendedor para configurar seus prazos de prospecção e regras de remanejamento automático.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {companySalespeople.map(sp => (
                            <Card
                                key={sp.id}
                                className="p-5 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50"
                                onClick={() => {
                                    setSelectedSalespersonForSettings(sp);
                                    setProspectAIView('deadline_settings_form');
                                }}
                            >
                                <img src={sp.avatarUrl} alt={sp.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-dark-border" />
                                <h4 className="font-bold text-dark-text">{sp.name}</h4>
                                <p className="text-sm text-dark-secondary">{sp.role}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            );
        }

        if (prospectAIView === 'deadline_settings_form' && selectedSalespersonForSettings) {
            return (
                <ProspectAISettingsScreen
                    salesperson={selectedSalespersonForSettings}
                    onBack={() => setProspectAIView('deadline_settings_list')}
                />
            );
        }

        if (prospectAIView === 'hunter_settings') {
            return (
                <HunterSettingsScreen
                    salespeople={companySalespeople}
                    onBack={() => setProspectAIView('settings_choice')}
                    onUpdateSalesperson={updateTeamMember}
                />
            );
        }

        if (prospectAIView === 'settings_choice') {
            return (
                <div className="animate-fade-in">
                    <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                        <div>
                            <button onClick={() => setProspectAIView('overview')} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                                &larr; Voltar para Visão Geral
                            </button>
                            <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Configurações do ProspectAI</h1>
                        </div>
                    </header>
                    <p className="text-dark-secondary mb-8 text-center text-lg">O que você deseja configurar?</p>
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card
                            className="p-6 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50 flex flex-col items-center justify-center gap-4"
                            onClick={() => setProspectAIView('pipeline_settings')}
                        >
                            <FilterIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Pipeline (Farm)</h4>
                            <p className="text-sm text-dark-secondary">Gerencie as etapas do funil para leads que chegam até a empresa.</p>
                        </Card>
                        <Card
                            className="p-6 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50 flex flex-col items-center justify-center gap-4"
                             onClick={() => setProspectAIView('hunter_settings')}
                        >
                            <CrosshairIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Hunter</h4>
                            <p className="text-sm text-dark-secondary">Configure o modo de prospecção ativa, distribua leads e defina metas.</p>
                        </Card>
                        <Card
                            className="p-6 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50 flex flex-col items-center justify-center gap-4"
                            onClick={() => setProspectAIView('automations_choice')}
                        >
                            <ClockIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Prazos e Automações</h4>
                            <p className="text-sm text-dark-secondary">Defina os tempos de resposta e o horário de funcionamento.</p>
                        </Card>
                         <Card
                            className="p-6 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50 flex flex-col items-center justify-center gap-4"
                            onClick={() => setProspectAIView('goal_settings')}
                        >
                            <BullseyeIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Configurar Metas</h4>
                            <p className="text-sm text-dark-secondary">Defina as metas de vendas (Farm) e prospecção (Hunter).</p>
                        </Card>
                    </div>
                </div>
            );
        }

        if (prospectAIView === 'goal_settings') {
            return (
                <GoalSettingsScreen
                    companyId={activeCompany.id}
                    onBack={() => setProspectAIView('settings_choice')}
                />
            );
        }

        if (prospectAIView === 'pipeline_settings') {
            return (
                <PipelineSettingsScreen
                    companyId={activeCompany.id}
                    onBack={() => setProspectAIView('settings_choice')}
                />
            );
        }

        return (
            <div className="animate-fade-in">
                <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        {companyFeatures.length > 1 && (
                            <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                                &larr; Voltar ao Dashboard
                            </button>
                        )}
                        <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Pipeline de Prospecção - Visão Geral</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCurrentView('prospectAnalysis')}
                            className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm"
                        >
                            <BullseyeIcon className="w-4 h-4" />
                            <span>Análise de Prospecção</span>
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
                        <button
                            onClick={() => setProspectAIView('settings_choice')}
                            className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm"
                        >
                            <CogIcon className="w-4 h-4" />
                            <span>Configurar ProspectAI</span>
                        </button>
                        <NotificationBell
                            notifications={userNotifications}
                            onMarkAsRead={markNotificationAsRead}
                        />
                        <UserProfileDropdown
                            company={activeCompany}
                            onEditProfile={() => setCompanyModalOpen(true)}
                            onManageTeam={() => setTeamModalOpen(true)}
                            onChangePassword={() => setChangePasswordModalOpen(true)}
                            onLogout={onLogout}
                        />
                    </div>
                </header>

                <p className="text-dark-secondary mb-6">Selecione um vendedor para visualizar seu pipeline individual.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {companySalespeople.map(sp => (
                        <Card
                            key={sp.id}
                            className="p-5 text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary/50"
                            onClick={() => {
                                setSelectedProspectUser(sp);
                                setProspectViewForSelectedUser('farm');
                            }}
                        >
                            <img src={sp.avatarUrl} alt={sp.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-dark-border" />
                            <h4 className="font-bold text-dark-text">{sp.name}</h4>
                            <p className="text-sm text-dark-secondary">{sp.role}</p>
                        </Card>
                    ))}
                </div>

                <Modal isOpen={isCompanyModalOpen} onClose={() => setCompanyModalOpen(false)}>
                    <CompanyForm 
                        initialData={activeCompany}
                        onClose={() => setCompanyModalOpen(false)}
                    />
                </Modal>
                <Modal isOpen={isTeamModalOpen} onClose={() => setTeamModalOpen(false)}>
                    <SalesTeamManagement
                        teamMembers={companyTeamMembers}
                        onClose={() => setTeamModalOpen(false)}
                        onDeleteMember={(id) => handleDeleteRequest(id, 'teamMember')}
                        companyId={activeCompany.id}
                    />
                </Modal>
                <Modal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}>
                    <ChangePasswordForm 
                        onClose={() => setChangePasswordModalOpen(false)}
                    />
                </Modal>
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setConfirmModalOpen(false)}
                    onConfirm={confirmDeletion}
                    title="Confirmar Exclusão"
                >
                    Você tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
                </ConfirmationModal>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
             <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">
                        Estoque Inteligente <span className="text-dark-primary">Triad3</span>
                    </h1>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-4">
                    <NotificationBell
                        notifications={userNotifications}
                        onMarkAsRead={markNotificationAsRead}
                    />
                    <UserProfileDropdown
                        company={activeCompany}
                        onEditProfile={() => setCompanyModalOpen(true)}
                        onManageTeam={() => setTeamModalOpen(true)}
                        onChangePassword={() => setChangePasswordModalOpen(true)}
                        onLogout={onLogout}
                    />
                </div>
            </header>
            <FilterBar
                onAddVehicle={handleAddVehicle}
                onOpenSalesAnalysis={() => setCurrentView('salesAnalysis')}
                onOpenProspectAnalysis={() => setCurrentView('prospectAnalysis')}
                onOpenMarketingModal={() => setMarketingModalOpen(true)}
                onOpenLembrAI={() => setCurrentView('lembrAI')}
                onOpenProspectAI={() => setCurrentView('prospectAI')}
                salespeople={companySalespeople}
                vehicles={availableVehicles}
                isOverdueFilterActive={isOverdueFilterActive}
                onOverdueFilterToggle={() => setOverdueFilterActive(prev => !prev)}
                onAdvancedFilterChange={setFilters}
                activeAdvancedFiltersCount={Object.values(filters).reduce((acc: number, val: unknown) => acc + (Array.isArray(val) ? val.length : 0), 0)}
                selectedSalespersonId={selectedSalespersonId}
                onSalespersonSelect={setSelectedSalespersonId}
                areFiltersDisabled={isPriorityFilterActive || stockView === 'sold'}
                stockView={stockView}
                onStockViewChange={setStockView}
                enabledFeatures={companyFeatures}
            />
            
            {companyFeatures.includes('estoque_inteligente') ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="xl:col-span-3 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KpiCard title="Veículos em Estoque" value={availableVehicles.length.toString()} trend={stockTrend} />
                            <SalesGoalKpiCard {...salesGoalProps} />
                            <KpiCard title="Prejuízo Acumulado" value={formatCurrency(totalLoss)} isLoss={true} />
                            <KpiCard title="Vendedores Ativos" value={companySalespeople.length.toString()} trend="Nenhuma alteração" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4 animate-fade-in">
                                {title}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {vehiclesToDisplay.map((vehicle, index) => (
                                    <VehicleCard 
                                        key={vehicle.id}
                                        id={`vehicle-card-${vehicle.id}`} 
                                        vehicle={vehicle}
                                        company={activeCompany}
                                        salesperson={companyTeamMembers.find(s => s.id === vehicle.salespersonId)}
                                        onEdit={() => handleEditVehicle(vehicle)}
                                        onDelete={() => handleDeleteRequest(vehicle.id!, 'vehicle')}
                                        onAssign={() => setVehicleToAssign(vehicle)}
                                        onMarkAsSold={() => markVehicleAsSold(vehicle.id!)}
                                        isHighlighted={highlightedVehicleId === vehicle.id}
                                        onTogglePriority={() => toggleVehiclePriority(vehicle.id!)}
                                        onImageClick={() => vehicle.imageUrl && setExpandedImageUrl(vehicle.imageUrl)}
                                        isSoldView={stockView === 'sold'}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    />
                                ))}
                            </div>
                            {vehiclesToDisplay.length === 0 && (
                                <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border">
                                    <h3 className="text-xl font-bold text-dark-text">Nenhum Veículo Encontrado</h3>
                                    <p className="text-dark-secondary mt-2">
                                        {isPriorityFilterActive 
                                            ? 'Ótimo trabalho! Não há veículos com prazo de venda esgotado.' 
                                            : 'Tente ajustar os filtros ou adicione novos veículos ao estoque.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="xl:col-span-1 space-y-8">
                        <TaskListCard 
                            title="Veículos Prioritários" 
                            items={priorityVehicles} 
                            onFilterToggle={handlePriorityFilterToggle}
                            isFilterActive={isPriorityFilterActive}
                            onItemClick={handlePriorityVehicleClick}
                        />
                    </div>
                </div>
            ) : (
                 <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border">
                    <h3 className="text-xl font-bold text-dark-text">Estoque Inteligente Desabilitado</h3>
                    <p className="text-dark-secondary mt-2">
                        Utilize o menu acima para navegar para as ferramentas disponíveis.
                    </p>
                </div>
            )}


            <Modal isOpen={isVehicleModalOpen} onClose={() => setVehicleModalOpen(false)}>
                <VehicleForm 
                    initialData={editingVehicle} 
                    onClose={() => setVehicleModalOpen(false)}
                    companyId={activeCompany.id}
                />
            </Modal>
            
            <Modal isOpen={isCompanyModalOpen} onClose={() => setCompanyModalOpen(false)}>
                <CompanyForm 
                    initialData={activeCompany}
                    onClose={() => setCompanyModalOpen(false)}
                />
            </Modal>

            <Modal isOpen={isTeamModalOpen} onClose={() => setTeamModalOpen(false)}>
                <SalesTeamManagement
                    teamMembers={companyTeamMembers}
                    onClose={() => setTeamModalOpen(false)}
                    onDeleteMember={(id) => handleDeleteRequest(id, 'teamMember')}
                    companyId={activeCompany.id}
                />
            </Modal>

             <Modal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}>
                <ChangePasswordForm 
                    onClose={() => setChangePasswordModalOpen(false)}
                />
            </Modal>
            
             <MarketingRequestModal
                isOpen={isMarketingModalOpen}
                onClose={() => setMarketingModalOpen(false)}
                company={activeCompany}
                totalAdBudget={totalAdBudget}
                onSendRequest={({ message, driveUrl, budget }) => {
                    if (message) {
                      addNotification(`Nova solicitação do gestor: "${message}"`, 'traffic_manager');
                    }
                    if (driveUrl !== activeCompany.marketingDriveUrl || budget !== activeCompany.monthlyAdBudget) {
                        updateCompany({ ...activeCompany, marketingDriveUrl: driveUrl, monthlyAdBudget: budget });
                    }
                }}
            />
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={confirmDeletion}
                title="Confirmar Exclusão"
            >
                Você tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </ConfirmationModal>

            <AssignSalespersonModal
                isOpen={!!vehicleToAssign}
                onClose={() => setVehicleToAssign(null)}
                onAssign={handleSaveAssignment}
                salespeople={companySalespeople}
                currentSalespersonId={vehicleToAssign?.salespersonId}
            />
             {expandedImageUrl && (
                <ImageLightbox
                    imageUrl={expandedImageUrl}
                    onClose={() => setExpandedImageUrl(null)}
                />
            )}
            {isToolboxOpen && toolboxUrl && (
                <ToolboxViewer url={toolboxUrl} onClose={() => setIsToolboxOpen(false)} />
            )}
        </div>
    );
};

export default DashboardScreen;