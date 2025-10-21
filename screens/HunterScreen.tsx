import React, { useState, useMemo, useEffect, FormEvent, ChangeEvent } from 'react';
import { useData } from '../hooks/useMockData';
import { TeamMember, HunterLead, PipelineStage, Company, ProspectAILead } from '../types';
import Card from '../components/Card';
import { formatDuration, formatTimeUntil } from '../utils/dateUtils';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import ImageLightbox from '../components/ImageLightbox';
import GoalProgressCard from '../components/GoalProgressCard';
import AddHunterLeadForm from '../components/forms/AddHunterLeadForm';
import SalespersonHunterPerformanceScreen from './SalespersonHunterPerformanceScreen';
import ToolboxViewer from '../components/ToolboxViewer';
import {
    PlusIcon, BullseyeIcon, ChatBubbleOvalLeftEllipsisIcon, CheckCircleIcon, XIcon,
    ClockIcon, PhoneIcon, ClipboardIcon, CalendarIcon, XCircleIcon, CheckIcon, ArrowRightIcon,
    UserCircleIcon, LockIcon, UploadIcon, SearchIcon, ArrowPathIcon, SwitchHorizontalIcon,
    PencilIcon, ChartBarIcon, ToolboxIcon, CrosshairIcon,
} from '../components/icons';
import DisparadorAutomaticoScreen from './DisparadorAutomaticoScreen';

interface HunterScreenProps {
    user: TeamMember;
    activeCompany: Company;
    onBack?: () => void;
    isManagerView?: boolean;
}

type Period = 'last_7_days' | 'last_30_days' | 'all' | 'custom';

// --- HUNTER MODE COMPONENTS ---

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
        case 'Atendimentos Transferidos':
            return { bar: 'bg-indigo-500', badge: 'bg-indigo-500 text-white' };
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
    return 'neutral'; // "Aguardando resposta"
};

const feedbackColorClasses = {
    positive: 'bg-green-500/10 border-green-500/30 text-green-300', // Verde
    negative: 'bg-red-500/10 border-red-500/30 text-red-300', // Vermelho
    neutral: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', // Amarelo
};


const HunterProspectCard: React.FC<{ title: string; count: number; color: string; }> = ({ title, count, color }) => (
    <Card className="bg-[#1C222C] p-4 text-center animate-fade-in">
        <p className="text-sm font-medium text-dark-secondary min-h-[2.5rem] flex items-center justify-center">{title}</p>
        <p className="text-4xl font-bold mt-2" style={{ color }}>{count}</p>
    </Card>
);

const generateHunterLeadEvents = (lead: HunterLead, pipeline: PipelineStage[]) => {
    const events: any[] = [];
    events.push({ type: 'creation', date: new Date(lead.createdAt), text: 'Lead recebido', icon: <PlusIcon className="w-4 h-4 text-blue-400" /> });
    if (lead.prospected_at) events.push({ type: 'prospecting', date: new Date(lead.prospected_at), text: 'Prospecção iniciada', icon: <BullseyeIcon className="w-4 h-4 text-yellow-400" /> });
    if (lead.feedback) lead.feedback.forEach(feedbackItem => {
        const stage = pipeline.find(s => s.id === feedbackItem.stageId);
        events.push({ type: 'feedback', date: new Date(feedbackItem.createdAt), text: feedbackItem.text, images: feedbackItem.images, stageName: stage ? stage.name : null, icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-gray-400" /> });
    });
    if (lead.outcome && lead.lastActivity) {
        const outcomeText = lead.outcome === 'convertido' ? 'Convertido' : 'Não Convertido';
        const icon = lead.outcome === 'convertido' ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <XIcon className="w-4 h-4 text-red-400" />;
        events.push({ type: 'finalization', date: new Date(lead.lastActivity), text: `Lead finalizado - ${outcomeText}`, icon: icon });
    }
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
};

const HunterLeadHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    lead: HunterLead;
    stages: PipelineStage[];
    onAction: (lead: HunterLead, feedbackText: string, images: string[], targetStageId: string, outcome?: 'convertido' | 'nao_convertido' | null, appointment_at?: string) => Promise<void>;
    onTransfer: (lead: HunterLead, feedback: { text: string, images: string[] }, newSalespersonId: string) => Promise<void>;
    salespeople: TeamMember[];
}> = ({ isOpen, onClose, lead, stages, onAction, onTransfer, salespeople }) => {
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [showTransfer, setShowTransfer] = useState(false);
    const [transferTargetId, setTransferTargetId] = useState('');

    const events = useMemo(() => generateHunterLeadEvents(lead, stages), [lead, stages]);
    
    const currentStage = stages.find(s => s.id === lead.stage_id);
    
    const actionableStages = useMemo(() => {
        if (!currentStage) return [];
        return stages
            .filter(s => 
                s.isEnabled &&
                s.stageOrder > currentStage.stageOrder &&
                s.name !== 'Remanejados' && s.name !== 'Atendimentos Transferidos'
            )
            .sort((a, b) => a.stageOrder - b.stageOrder);
    }, [stages, currentStage]);

    useEffect(() => {
        if (!isOpen) {
            setFeedbackText('');
            setFeedbackImages([]);
            setIsSubmitting(false);
            setShowTransfer(false);
            setTransferTargetId('');
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
    
    const handleTransfer = async () => {
        if (!feedbackText.trim()) {
            alert('Por favor, registre um feedback antes de transferir.');
            return;
        }
        if (!transferTargetId) {
            alert('Por favor, selecione um vendedor para transferir.');
            return;
        }
        setIsSubmitting(true);
        await onTransfer(lead, { text: feedbackText, images: feedbackImages }, transferTargetId);
        onClose();
    };
    
    const handleOpenAppointmentModal = () => {
        const today = new Date();
        const defaultAppointmentTime = new Date(today.getTime() + 60 * 60 * 1000); // 1 hour from now
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
                    <h2 className="text-2xl font-bold text-center">Histórico do Lead: {lead.leadName}</h2>
                    <div className="p-2 bg-dark-background rounded-lg border border-dark-border text-center">
                        <p className="text-dark-secondary">{lead.leadPhone}</p>
                    </div>

                    <div className="max-h-60 overflow-y-auto pr-2 my-4 border-y border-dark-border py-4">
                        <div className="relative pl-5 py-2">
                            <div className="absolute left-2.5 top-0 h-full w-0.5 bg-dark-border"></div>
                            {events.map((event, eventIndex) => {
                                let durationString: string | null = null;
                                if (eventIndex > 0) {
                                    const prevEvent = events[eventIndex - 1];
                                    const durationMs = event.date.getTime() - prevEvent.date.getTime();
                                    if (durationMs >= 1000) {
                                        durationString = formatDuration(durationMs);
                                    }
                                }
                                return (
                                    <div key={eventIndex} className={`relative ${eventIndex === events.length - 1 ? '' : 'pb-4'}`}>
                                        <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-dark-card border-2 border-dark-border flex items-center justify-center">
                                            {event.icon}
                                        </div>
                                        <div className="pl-4">
                                            <p className="text-xs text-dark-secondary">{event.date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-sm font-medium text-dark-text mt-1 whitespace-pre-wrap">{event.text}</p>
                                            {(durationString || (event.type === 'feedback' && event.stageName)) && (
                                                <div className="flex items-center gap-4 mt-1.5">
                                                    {durationString && (
                                                        <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                                            <ClockIcon className="w-3.5 h-3.5" />
                                                            <span>{`Após ${durationString}`}</span>
                                                        </p>
                                                    )}
                                                    {event.type === 'feedback' && event.stageName && (
                                                        <p className="text-xs font-semibold text-cyan-400">
                                                            na etapa: {event.stageName}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {event.type === 'feedback' && event.images && event.images.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {event.images.map((img: string, i: number) => (
                                                        <button key={i} onClick={() => setExpandedImageUrl(img)} className="block w-12 h-12 rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-dark-primary">
                                                            <img src={img} alt="feedback" className="w-full h-full object-cover"/>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-center">Registrar Ação</h3>

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
                            {!showTransfer ? (
                                <>
                                    {actionableStages.map(stage => {
                                        if (stage.name === 'Finalizados') {
                                            return (
                                                <React.Fragment key="finalizados-fragment">
                                                    <button onClick={() => handlePerformAction('Finalizados', 'convertido')} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-green-500/20 text-green-300 hover:bg-green-500/30">
                                                        <CheckCircleIcon className="w-5 h-5"/> Lead convertido
                                                    </button>
                                                    <button onClick={() => handlePerformAction('Finalizados', 'nao_convertido')} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-red-500/20 text-red-300 hover:bg-red-500/30">
                                                        <XCircleIcon className="w-5 h-5"/> Lead não convertido
                                                    </button>
                                                </React.Fragment>
                                            );
                                        }
                                        if (stage.name === 'Agendado') {
                                            return (
                                                <button key={stage.id} onClick={handleOpenAppointmentModal} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
                                                    <CalendarIcon className="w-5 h-5"/> Agendar
                                                </button>
                                            );
                                        }
                                        return (
                                            <button key={stage.id} onClick={() => handlePerformAction(stage.name)} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-purple-500/20 text-purple-300 hover:bg-purple-500/30">
                                                <ArrowRightIcon className="w-5 h-5"/> Mover para {stage.name}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setShowTransfer(true)} disabled={isSubmitting || !feedbackText.trim()} className="action-btn bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30">
                                        <SwitchHorizontalIcon className="w-5 h-5"/> Transferir
                                    </button>
                                </>
                            ) : (
                                <div className="sm:col-span-2 space-y-3 p-3 bg-dark-background rounded-lg border border-indigo-500/30">
                                    <h5 className="font-bold text-center text-indigo-300">Transferir Atendimento</h5>
                                    <select
                                        value={transferTargetId}
                                        onChange={(e) => setTransferTargetId(e.target.value)}
                                        className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-md"
                                    >
                                        <option value="">Selecione um vendedor...</option>
                                        {salespeople.map(sp => (
                                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                                        ))}
                                    </select>
                                    {salespeople.length === 0 && (
                                        <p className="text-center text-xs text-yellow-400">Nenhum outro vendedor disponível para transferência.</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowTransfer(false)} className="flex-1 action-btn !p-2 !text-xs bg-dark-border/50 text-dark-secondary">Cancelar</button>
                                        <button onClick={handleTransfer} disabled={!transferTargetId || isSubmitting} className="flex-1 action-btn !p-2 !text-xs bg-indigo-500/20 text-indigo-300">Confirmar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {expandedImageUrl && <ImageLightbox imageUrl={expandedImageUrl} onClose={() => setExpandedImageUrl(null)} />}
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
    isTransferredAwayView?: boolean;
    transferredToName?: string;
}> = ({ lead, isNewLead, stageName, onStartProspecting, onOpenActions, isDisabled = false, isFinalized = false, onReopen, isTransferredAwayView = false, transferredToName }) => {
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
        if (isEditingName || isTransferredAwayView) return;
        if (isDisabled) return;
        if (isNewLead) {
            onStartProspecting();
        } else {
            onOpenActions();
        }
    };

    const handleSaveName = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (newName.trim() === '' || newName.trim() === lead.leadName) {
            setIsEditingName(false);
            setNewName(lead.leadName); // Reset on empty or no change
            return;
        }
        await updateHunterLead(lead.id, { lead_name: newName.trim() });
        setIsEditingName(false);
    };

    const lastFeedback = lead.feedback?.length > 0 ? lead.feedback[lead.feedback.length - 1] : null;
    const sentiment = getFeedbackSentiment(lastFeedback?.text);
    const isNameEditable = lead.leadName.toLowerCase() === 'sem nome';
    const hasDetails = lead.details && Object.keys(lead.details).filter(k => !k.startsWith('transferred_')).length > 0;


    let borderColorClass = 'border-dark-border';
    if (isTransferredAwayView) {
        borderColorClass = 'border-indigo-500/60 opacity-80';
    } else if (isFinalized) {
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

    if (isTransferredAwayView) {
        return (
             <Card className={`p-4 transition-all duration-300 relative border-2 ${borderColorClass}`}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-background border border-dark-border flex items-center justify-center">
                        <UserCircleIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold leading-normal text-dark-text line-through">{lead.leadName}</h4>
                        <p className="text-xs leading-normal text-dark-secondary">{new Date(lead.details?.transferred_at || lead.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-dark-border text-center">
                    <p className="text-sm font-semibold text-indigo-400 flex items-center justify-center gap-2">
                        <ArrowRightIcon /> Transferido para {transferredToName}
                    </p>
                </div>
             </Card>
        )
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
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSaveName(e);
                                            } else if (e.key === 'Escape') {
                                                e.preventDefault();
                                                setIsEditingName(false);
                                                setNewName(lead.leadName);
                                            }
                                        }}
                                        className="bg-dark-background border-b border-dark-primary text-sm font-semibold text-dark-text focus:outline-none w-32"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveName} className="p-1 text-green-400 hover:bg-dark-border rounded-full"><CheckIcon className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsEditingName(false); setNewName(lead.leadName); }} className="p-1 text-red-400 hover:bg-dark-border rounded-full"><XIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold leading-normal text-dark-text">{lead.leadName}</h4>
                                    {isNameEditable && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
                                            className="text-dark-secondary hover:text-dark-primary"
                                        >
                                            <PencilIcon className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <p className="text-xs leading-normal text-dark-secondary">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {(hasDetails || !isNewLead) && (
                    <div className="space-y-3 pt-3 border-t border-dark-border">
                        {hasDetails && (
                             <div className="space-y-2">
                                <h5 className="text-xs font-bold uppercase text-dark-secondary">Informações Adicionais:</h5>
                                <ul className="list-disc list-inside space-y-1 text-sm text-dark-text">
                                    {Object.entries(lead.details!).filter(([key]) => !key.startsWith('transferred_')).map(([_, value], index) => (
                                        <li key={index}>{String(value)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {!isNewLead && (
                            <>
                                {hasDetails && <div className="border-t border-dark-border/50"></div>}
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
                                {lastFeedback && !isFinalized && (
                                    <div className={`p-2 rounded-lg border text-xs ${feedbackColorClasses[sentiment]}`}>
                                        <p className="font-bold uppercase tracking-wider mb-1 text-[10px]">Último Feedback:</p>
                                        <p className="italic text-white/90 truncate text-sm">"{lastFeedback.text}"</p>
                                    </div>
                                )}
                                {isFinalized && (
                                    <div className="text-center">
                                        <p className={`text-sm font-bold ${lead.outcome === 'convertido' ? 'text-green-400' : 'text-red-400'}`}>
                                        {lead.outcome === 'convertido' ? 'Convertido' : 'Não Convertido'}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};


const HunterProspectColumn: React.FC<{ title: string; count: number; children: React.ReactNode; }> = ({ title, count, children }) => {
    const { bar, badge } = getStageColorClasses(title);
  
    return (
      <div className="w-full md:w-80 flex-shrink-0 bg-dark-card rounded-xl flex flex-col overflow-hidden shadow-lg border border-dark-border/30">
          <div className="p-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-white uppercase tracking-wide">{title}</h3>
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

const HunterScreen: React.FC<HunterScreenProps> = ({ user, activeCompany, onBack, isManagerView = false }) => {
    const { hunterLeads, prospectaiLeads, updateHunterLead, addHunterLeadAction, teamMembers, addHunterLead, toolboxUrl, transferHunterLead } = useData();
    const [selectedLead, setSelectedLead] = useState<HunterLead | null>(null);
    const [leadToProspect, setLeadToProspect] = useState<HunterLead | null>(null);
    const [isPerformanceView, setIsPerformanceView] = useState(false);
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
    const [leadToReopen, setLeadToReopen] = useState<HunterLead | null>(null);
    const [period, setPeriod] = useState<Period>('last_7_days');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
    });
    const [isAddLeadModalOpen, setAddLeadModalOpen] = useState(false);
    const [isToolboxOpen, setIsToolboxOpen] = useState(false);

    const handleSearchChange = (stageId: string, query: string) => {
        setSearchQueries(prev => ({ ...prev, [stageId]: query }));
    };

    const companyPipeline = useMemo(() => {
        const stages = [...activeCompany.pipeline_stages];
        if (!stages.some(s => s.name === 'Atendimentos Transferidos')) {
            stages.push({
                id: 'temp-transferred-id',
                name: 'Atendimentos Transferidos',
                stageOrder: 101,
                isFixed: true,
                isEnabled: true,
            });
        }
        return stages.filter(s => s.isEnabled).sort((a, b) => a.stageOrder - b.stageOrder);
    }, [activeCompany]);

    const myLeads = useMemo(() => {
        const baseLeads = hunterLeads.filter(lead => lead.salespersonId === user.id || lead.details?.transferred_from === user.id);
        if (period === 'all') return baseLeads;

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

        return baseLeads.filter(lead => {
            const leadDate = new Date(lead.createdAt);
            return leadDate >= startDate && leadDate <= endDate;
        });
    }, [hunterLeads, user.id, period, customRange]);

    const categorizedLeads = useMemo(() => {
        const categories: Record<string, HunterLead[]> = {};
        companyPipeline.forEach(stage => { categories[stage.id] = []; });
        
        const transferredStageId = companyPipeline.find(s => s.name === 'Atendimentos Transferidos')?.id;

        myLeads.forEach(lead => {
            if (lead.details?.transferred_from === user.id && transferredStageId) {
                categories[transferredStageId].push(lead);
            } else if (lead.salespersonId === user.id && categories[lead.stage_id]) {
                categories[lead.stage_id].push(lead);
            }
        });
        return categories;
    }, [myLeads, companyPipeline, user.id]);
    
    const hasLeadInProgress = useMemo(() => {
        const firstAttemptStage = companyPipeline.find(s => s.name === 'Primeira Tentativa');
        return !!firstAttemptStage && (categorizedLeads[firstAttemptStage.id]?.length || 0) > 0;
    }, [categorizedLeads, companyPipeline]);

    const counts = useMemo(() => {
        const result: Record<string, number> = {};
        let activeTotal = 0;
        
        companyPipeline.forEach(stage => {
            const count = categorizedLeads[stage.id]?.length || 0;
            result[stage.name] = count;
            
            if (stage.name === 'Finalizados') {
                const converted = (categorizedLeads[stage.id] || []).filter(l => l.outcome === 'convertido').length;
                const notConverted = (categorizedLeads[stage.id] || []).filter(l => l.outcome === 'nao_convertido').length;
                result['Convertidos'] = converted;
                result['Não Convertidos'] = notConverted;
            } else if (!stage.isFixed || stage.name === 'Novos Leads') {
                activeTotal += count;
            }
        });
        result['Meus Leads Ativos'] = activeTotal;
        return result;
    }, [categorizedLeads, companyPipeline]);

    const kpiCardsToRender = useMemo(() => {
        const kpis: { title: string; count: number; color: string }[] = [];
        const dynamicStageColors = ['#FBBF24', '#F59E0B', '#8B5CF6', '#60A5FA', '#34D399', '#FB923C'];
        let colorIndex = 0;

        const staticOrder = ['Meus Leads Ativos', 'Convertidos', 'Não Convertidos', 'Agendados', 'Novos Leads'];
        const staticColors: Record<string, string> = {
            'Meus Leads Ativos': '#00D1FF',
            'Convertidos': '#22C55E',
            'Não Convertidos': '#EF4444',
            'Agendados': '#60A5FA',
            'Novos Leads': '#FBBF24'
        };

        staticOrder.forEach(title => {
            if (counts[title] !== undefined) {
                kpis.push({ title, count: counts[title], color: staticColors[title] });
            }
        });

        companyPipeline.forEach(stage => {
            if (!stage.isFixed && !staticOrder.includes(stage.name)) {
                kpis.push({
                    title: stage.name,
                    count: counts[stage.name] || 0,
                    color: dynamicStageColors[colorIndex % dynamicStageColors.length]
                });
                colorIndex++;
            }
        });

        return kpis;
    }, [counts, companyPipeline]);

    const monthlyTotalConvertedLeads = useMemo(() => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
    
        const finalizadosStageId = companyPipeline.find(s => s.name === 'Finalizados')?.id;
        if (!finalizadosStageId) return 0;
        
        const allMyHunterLeads = hunterLeads.filter(lead => lead.salespersonId === user.id);
        const convertedHunter = allMyHunterLeads.filter(lead => {
            if (lead.stage_id !== finalizadosStageId || lead.outcome !== 'convertido') return false;
            const conversionDate = lead.lastActivity ? new Date(lead.lastActivity) : null;
            return conversionDate && conversionDate >= startOfMonth && conversionDate <= endOfMonth;
        }).length;
    
        const allMyFarmLeads = prospectaiLeads.filter(lead => lead.salespersonId === user.id);
        const convertedFarm = allMyFarmLeads.filter(lead => {
            if (lead.stage_id !== finalizadosStageId || lead.outcome !== 'convertido') return false;
            const conversionDate = lead.last_feedback_at ? new Date(lead.last_feedback_at) : null;
            return conversionDate && conversionDate >= startOfMonth && conversionDate <= endOfMonth;
        }).length;
    
        return convertedFarm + convertedHunter;
    }, [hunterLeads, prospectaiLeads, user.id, companyPipeline]);
    
    const hunterGoal = user.prospectAISettings?.hunter_goals;
    const prospectedLeadsInPeriod = useMemo(() => myLeads.filter(l => l.prospected_at).length, [myLeads]);


    const handleStartProspectingConfirm = async () => {
        if (!leadToProspect) return;
    
        const firstAttemptStage =
            companyPipeline.find(s => s.name === 'Primeira Tentativa') ||
            companyPipeline.find(s => !s.isFixed && s.stageOrder > 0);
    
        if (firstAttemptStage) {
            await updateHunterLead(leadToProspect.id, {
                stage_id: firstAttemptStage.id,
                prospected_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
            });
        } else {
            console.error("Pipeline configuration error: No initial attempt stage found (e.g., 'Primeira Tentativa').");
            alert("Erro de configuração do Pipeline: Nenhuma etapa inicial de tentativa foi encontrada.");
        }
        setLeadToProspect(null);
    };

    const confirmReopenLead = async () => {
        if (!leadToReopen) return;
        const firstAttemptStage = companyPipeline.find(s => s.name === 'Primeira Tentativa');
        if (firstAttemptStage) {
            await updateHunterLead(leadToReopen.id, { 
                stage_id: firstAttemptStage.id, 
                outcome: null 
            });
        }
        setLeadToReopen(null);
    };
    
    const periodOptions: { id: Period; label: string }[] = [
        { id: 'last_7_days', label: 'Últimos 7 dias' },
        { id: 'last_30_days', label: 'Últimos 30 dias' },
        { id: 'all', label: 'Todo o Período' },
        { id: 'custom', label: 'Personalizado' },
    ];
    
    const handleAddOwnLead = async (name: string, phone: string, details: Record<string, string>) => {
        await addHunterLead({
            name,
            phone,
            companyId: activeCompany.id,
            salespersonId: user.id,
            details,
        });
        alert('Lead cadastrado e adicionado à sua fila de prospecção!');
    };

    if (isPerformanceView) {
        const allMyLeads = hunterLeads.filter(lead => lead.salespersonId === user.id);
        return <SalespersonHunterPerformanceScreen user={user} leads={allMyLeads} onBack={() => setIsPerformanceView(false)} allSalespeople={teamMembers} />
    }
    
    if (myLeads.length === 0 && period === 'all' && !isManagerView) {
        return (
            <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border mt-8">
                <CheckCircleIcon className="w-16 h-16 mx-auto text-green-400" />
                <h3 className="text-2xl font-bold text-dark-text mt-4">Fila de Prospecção Vazia</h3>
                <p className="text-dark-secondary mt-2 max-w-md mx-auto">
                    Você não possui leads no modo Hunter. Aguarde o gestor distribuir uma nova base ou cadastre um lead captado por você.
                </p>
                 <button
                    onClick={() => setAddLeadModalOpen(true)}
                    className="mt-6 flex items-center gap-2 bg-dark-primary text-dark-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-bold text-sm mx-auto"
                >
                    <PlusIcon className="w-4 h-4" />
                    Cadastrar Lead
                </button>
                <Modal isOpen={isAddLeadModalOpen} onClose={() => setAddLeadModalOpen(false)}>
                    <AddHunterLeadForm
                        onSave={handleAddOwnLead}
                        onClose={() => setAddLeadModalOpen(false)}
                    />
                </Modal>
            </div>
        );
    }


    return (
        <div className="mt-8">
            {onBack && (
                 <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-6">
                    &larr; Voltar para seleção
                </button>
            )}

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
                {!isManagerView && (
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
                            className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-lg hover:border-dark-primary transition-colors font-bold text-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Cadastrar Lead</span>
                        </button>
                    </div>
                )}
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

                    const isTransferredColumn = stage.name === 'Atendimentos Transferidos';

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
                                        isDisabled={!isManagerView && isNewLeadColumn && (hasLeadInProgress || index > 0)}
                                        isFinalized={stage.name === 'Finalizados'}
                                        isTransferredAwayView={isTransferredColumn}
                                        transferredToName={isTransferredColumn ? teamMembers.find(tm => tm.id === lead.details?.transferred_to)?.name || 'desconhecido' : undefined}
                                    />
                                ))
                                : <div className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center text-dark-secondary">Nenhum lead nesta etapa.</div>
                            }
                        </HunterProspectColumn>
                    )
                })}
            </div>

            {selectedLead && (
                <HunterLeadHistoryModal 
                    isOpen={!!selectedLead}
                    onClose={() => setSelectedLead(null)}
                    lead={selectedLead}
                    stages={companyPipeline}
                    onAction={addHunterLeadAction}
                    onTransfer={async (lead, feedback, newSalespersonId) => await transferHunterLead(lead.id, newSalespersonId, user.id, feedback)}
                    salespeople={teamMembers.filter(tm => tm.id !== user.id && tm.companyId === user.companyId && tm.role === 'Vendedor')}
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

export default HunterScreen;