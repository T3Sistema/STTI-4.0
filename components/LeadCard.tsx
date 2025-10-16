import React, { useState, ChangeEvent, FormEvent, useMemo, useEffect } from 'react';
import { ProspectAILead, TeamMember, PipelineStage } from '../types';
import Card from './Card';
import { useData } from '../hooks/useMockData';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { CarIcon } from './icons/CarIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SwitchHorizontalIcon } from './icons/SwitchHorizontalIcon';
import { BullseyeIcon } from './icons/BullseyeIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { UploadIcon } from './icons/UploadIcon';
import { XIcon } from './icons/XIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import Modal from './Modal';
import ImageLightbox from './ImageLightbox';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from './icons/ChatBubbleOvalLeftEllipsisIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { formatDuration } from '../utils/dateUtils';
import { PencilIcon } from './icons/PencilIcon';
import { calculateBusinessHoursDeadline, calculateRemainingBusinessTime } from '../utils/businessHoursUtils';
import { ExclamationIcon } from './icons/ExclamationIcon';

interface LeadCardProps {
    lead: ProspectAILead;
    onClick?: () => void;
    isProspectingActionable?: boolean;
    isDisabled?: boolean;
    isManagerView?: boolean;
    allSalespeople?: TeamMember[];
    onReassign?: (lead: ProspectAILead) => void;
    onTransfer?: (lead: ProspectAILead) => void;
    isReassignedAwayView?: boolean;
    isTransferredAwayView?: boolean;
    onReopenRequest?: (lead: ProspectAILead) => void;
    isPending?: boolean;
    currentUserId: string;
}

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string | undefined | null; }> = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 text-sm">
            <div className="flex-shrink-0 text-dark-secondary mt-0.5">{icon}</div>
            <div>
                <p className="text-[11px] uppercase text-dark-secondary">{label}</p>
                <p className="text-sm font-normal leading-normal text-dark-text whitespace-pre-wrap">{value}</p>
            </div>
        </div>
    );
};

// Mapeamento de chaves para ícones e rótulos amigáveis
const detailConfig: { [key: string]: { label: string; icon: React.FC<{ className?: string }> } } = {
    carro_na_troca: { label: 'Carro na Troca', icon: SwitchHorizontalIcon },
    forma_de_pagamento: { label: 'Forma de Pagamento', icon: DollarSignIcon },
    comprar_como: { label: 'Comprar como', icon: UserCircleIcon },
    tipo_de_compra: { label: 'Tipo de Compra', icon: UserCircleIcon },
    uso_pretendido: { label: 'Uso Pretendido', icon: BullseyeIcon },
    observacao: { label: 'Observação', icon: DocumentTextIcon },
};

// Função para formatar chaves desconhecidas (ex: "algum_campo" -> "Algum Campo")
const formatKeyToLabel = (key: string): string => {
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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

// @-fix: Defined the `generateLeadEvents` function, which was being called but was not defined in this file, causing a "Cannot find name" error.
const generateLeadEvents = (lead: ProspectAILead, allSalespeople: TeamMember[], pipeline: PipelineStage[]) => {
    const events: any[] = [];
    events.push({ type: 'creation', date: new Date(lead.createdAt), text: 'Lead recebido', icon: <PlusIcon className="w-4 h-4 text-blue-400" /> });
    if (lead.prospected_at) events.push({ type: 'prospecting', date: new Date(lead.prospected_at), text: 'Prospecção iniciada', icon: <BullseyeIcon className="w-4 h-4 text-yellow-400" /> });
    if (lead.feedback) lead.feedback.forEach(feedbackItem => {
        const stage = pipeline.find(s => s.id === feedbackItem.stageId);
        events.push({ type: 'feedback', date: new Date(feedbackItem.createdAt), text: feedbackItem.text, images: feedbackItem.images, stageName: stage ? stage.name : null, icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-gray-400" /> });
    });
    if (lead.details?.reassigned_at) {
        const from = allSalespeople.find(s => s.id === lead.details.reassigned_from)?.name || 'Desconhecido';
        const to = allSalespeople.find(s => s.id === lead.details.reassigned_to)?.name || 'Desconhecido';
        events.push({ type: 'reassignment', date: new Date(lead.details.reassigned_at), text: `Remanejado de ${from} para ${to}`, icon: <SwitchHorizontalIcon className="w-4 h-4 text-purple-400" /> });
    }
    if (lead.outcome && lead.last_feedback_at) {
        const outcomeText = lead.outcome === 'convertido' ? 'Convertido' : 'Não Convertido';
        const icon = lead.outcome === 'convertido' ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <XIcon className="w-4 h-4 text-red-400" />;
        events.push({ type: 'finalization', date: new Date(lead.last_feedback_at), text: `Lead finalizado - ${outcomeText}`, icon: icon });
    }
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
};


// FIX: Changed export to a named export to resolve module loading issue.
export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, isProspectingActionable = false, isDisabled = false, isManagerView = false, allSalespeople = [], onReassign, onTransfer, isReassignedAwayView = false, isTransferredAwayView = false, onReopenRequest, isPending = false, currentUserId }) => {
    const { companies, teamMembers, addProspectLeadFeedback, updateProspectLeadStatus, updateProspectLead } = useData();
    const [isCopied, setIsCopied] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showStatusButtons, setShowStatusButtons] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(lead.leadName);


    const leadCompany = companies.find(c => c.id === lead.companyId);
    const pipelineStages = leadCompany?.pipeline_stages || [];
    const leadStage = pipelineStages.find(s => s.id === lead.stage_id);
    const leadSalesperson = teamMembers.find(tm => tm.id === lead.salespersonId);
    
    const deadline = useMemo(() => {
        if (!leadSalesperson || leadStage?.name !== 'Novos Leads') {
            return null;
        }

        const deadlineSettings = leadSalesperson.prospectAISettings?.deadlines?.initial_contact;
        if (!deadlineSettings?.auto_reassign_enabled) {
            return null;
        }

        // Calculate the deadline considering business hours
        return calculateBusinessHoursDeadline(
            new Date(lead.createdAt),
            deadlineSettings.minutes,
            leadCompany?.prospectAISettings?.business_hours
        );
    }, [lead.createdAt, leadStage?.name, leadSalesperson, leadCompany]);

    useEffect(() => {
        if (!deadline || !leadCompany) {
            setTimeLeft(null);
            return;
        }

        const businessHours = leadCompany.prospectAISettings?.business_hours;

        const calculateAndSetTimeLeft = () => {
            const now = new Date();
            const remaining = calculateRemainingBusinessTime(now, deadline, businessHours);
            setTimeLeft(remaining > 0 ? remaining : 0);
        };

        calculateAndSetTimeLeft();
        const interval = setInterval(calculateAndSetTimeLeft, 1000); // Check every second

        return () => clearInterval(interval);

    }, [deadline, leadCompany]);

    const formatTime = (ms: number | null): string => {
        if (ms === null || ms <= 0) return 'Esgotado';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    const getTimerColor = (ms: number | null, totalMinutes: number): string => {
        if (ms === null || ms <= 0) return 'text-red-400';
        const totalMs = totalMinutes * 60 * 1000;
        const percentage = (ms / totalMs) * 100;

        if (percentage <= 25) return 'text-red-400';
        if (percentage <= 50) return 'text-yellow-400';
        return 'text-green-400';
    };
    
    const deadlineMinutes = leadSalesperson?.prospectAISettings?.deadlines?.initial_contact?.minutes;
    const showTimer = timeLeft !== null && deadlineMinutes;

    const lastFeedback = useMemo(() => lead.feedback && lead.feedback.length > 0 ? lead.feedback[lead.feedback.length - 1] : null, [lead.feedback]);
    const sentiment = getFeedbackSentiment(lastFeedback?.text);


    const appointmentTimestamp = lead.appointment_at || lead.details?.appointment_date;
    const formattedDateTime = leadStage?.name === 'Agendado' && appointmentTimestamp
        ? new Date(appointmentTimestamp).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        : new Date(lead.createdAt).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    const handleCopyPhone = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lead.leadPhone) {
            navigator.clipboard.writeText(lead.leadPhone);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1500);
        }
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // FIX: Using a standard for loop to iterate over the FileList, which is not a true array. This ensures `file` is correctly typed as a File object.
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setFeedbackImages(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setFeedbackImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmitFeedback = async (e: FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!feedbackText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        await addProspectLeadFeedback(lead.id, feedbackText, feedbackImages);
        setFeedbackText('');
        setFeedbackImages([]);
        setIsFeedbackOpen(false);
        setShowStatusButtons(true);
        setIsSubmitting(false);
    };

    const handleStatusUpdate = async (e: React.MouseEvent, stageName: string, details?: Record<string, any>) => {
        e.stopPropagation();
        const targetStage = pipelineStages.find(s => s.name === stageName);
        if (targetStage) {
            await updateProspectLeadStatus(lead.id, targetStage.id, details);
        } else {
            console.error(`Stage "${stageName}" not found for company.`);
        }
    };


    const handleConfirmAppointment = async (e: FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (appointmentDate && appointmentTime) {
            const appointmentDateTime = `${appointmentDate}T${appointmentTime}`;
            const agendadoStage = pipelineStages.find(s => s.name === 'Agendado');
            if (agendadoStage) {
                 await updateProspectLeadStatus(lead.id, agendadoStage.id, { appointment_date: appointmentDateTime });
            }
            setIsAppointmentModalOpen(false);
        }
    };

    const handleSaveName = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (newName.trim() === '' || newName.trim() === lead.leadName) {
            setIsEditingName(false);
            setNewName(lead.leadName); // Reset on empty or no change
            return;
        }
        await updateProspectLead(lead.id, { leadName: newName.trim() });
        setIsEditingName(false);
    };

    const actionableStages = useMemo(() => {
        if (!leadStage) return [];
        return pipelineStages
            .filter(s => 
                s.isEnabled &&
                s.stageOrder > leadStage.stageOrder &&
                s.name !== 'Remanejados'
            )
            .sort((a, b) => a.stageOrder - b.stageOrder);
    }, [pipelineStages, leadStage]);

    let statusBorderClass = 'border-2 ';
    const isReassigned = !!lead.details?.reassigned_from;

    if (isTransferredAwayView) {
        statusBorderClass += 'border-indigo-500/60 opacity-80';
    } else if (isReassignedAwayView) {
        statusBorderClass += 'border-purple-500/60 opacity-70';
    } else if (isReassigned && !isReassignedAwayView) {
        statusBorderClass += 'border-purple-500/80';
    } else if (leadStage?.name === 'Finalizados') {
        if (lead.outcome === 'convertido') {
            statusBorderClass += 'border-dark-success';
        } else if (lead.outcome === 'nao_convertido') {
            statusBorderClass += 'border-dark-error';
        } else {
            statusBorderClass += 'border-dark-secondary';
        }
    } else {
        switch (leadStage?.name) {
            case 'Novos Leads': statusBorderClass += 'border-dark-stage-new'; break;
            case 'Primeira Tentativa': statusBorderClass += 'border-dark-stage-attempt1'; break;
            case 'Segunda Tentativa': statusBorderClass += 'border-dark-stage-attempt2'; break;
            case 'Terceira Tentativa': statusBorderClass += 'border-dark-stage-attempt3'; break;
            case 'Agendado': statusBorderClass += 'border-dark-stage-scheduled'; break;
            default: statusBorderClass += 'border-dark-border'; break;
        }
    }

    const isFinalized = leadStage?.name === 'Finalizados';
    const isClickableForManager = isManagerView;
    const isClickableForUser = !isManagerView && (leadStage?.name !== 'Novos Leads');
    const isClickableForProspecting = !isDisabled && isProspectingActionable && onClick;
    const isNameEditable = lead.leadName.toLowerCase() === 'sem nome';

    const handleCardClick = () => {
        if (isEditingName) return; // Don't trigger modal when editing name
        if (isClickableForManager || isClickableForUser) {
            setIsDetailModalOpen(true);
        } else if (isClickableForProspecting) {
            onClick?.();
        }
    };
    
    const handleReassignClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onReassign) {
            onReassign(lead);
        }
        setIsDetailModalOpen(false); // Close current modal to open the next one
    };
    
    const handleReopenClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onReopenRequest) {
            onReopenRequest(lead);
        }
        setIsDetailModalOpen(false);
    };

    const cardClassName = `p-4 transition-all duration-300 animate-fade-in relative ${
        (isClickableForManager || isClickableForUser || isClickableForProspecting) ? 'cursor-pointer hover:bg-dark-card-active hover:shadow-glow' : ''
    } ${
        isDisabled && isProspectingActionable ? 'opacity-60 cursor-not-allowed' : ''
    } ${statusBorderClass} ${isPending ? 'animate-pulse-border' : ''}`;

     if (isReassignedAwayView) {
        const reassignedToName = allSalespeople.find(sp => sp.id === lead.salespersonId)?.name || 'outro vendedor';
        return (
             <Card className={cardClassName}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-background border border-dark-border flex items-center justify-center">
                        <UserCircleIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold leading-normal text-dark-text line-through">{lead.leadName}</h4>
                        <p className="text-xs leading-normal text-dark-secondary">{new Date(lead.details?.reassigned_at || lead.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-dark-border text-center">
                    <p className="text-sm font-semibold text-purple-400 flex items-center justify-center gap-2">
                        <ArrowRightIcon /> Remanejado para {reassignedToName}
                    </p>
                </div>
             </Card>
        )
    }
    
    if (isTransferredAwayView) {
        const transferredToName = allSalespeople?.find(sp => sp.id === lead.details?.transferred_to)?.name || 'outro vendedor';
        return (
             <Card className={cardClassName} onClick={handleCardClick}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-background border border-dark-border flex items-center justify-center">
                        <UserCircleIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold leading-normal text-dark-text">{lead.leadName}</h4>
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
        <>
            <Card className={cardClassName} onClick={handleCardClick}>
                {isPending && (
                    <div className="absolute top-2 right-2 p-1 bg-yellow-900/50 rounded-full z-10" title="Este lead está pendente de feedback desde o dia anterior.">
                        <ExclamationIcon className="w-4 h-4 text-yellow-300" />
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
                                <p className="text-xs leading-normal text-dark-secondary">{formattedDateTime}</p>
                            </div>
                        </div>
                    </div>
                    
                    {showTimer && deadlineMinutes && (
                        <div className={`pt-3 border-t border-dark-border flex items-center justify-center gap-2 font-bold ${getTimerColor(timeLeft, deadlineMinutes)}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span className="text-sm leading-normal">
                                Tempo: {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                </div>

                {leadStage && !['Novos Leads', 'Finalizados', 'Remanejados'].includes(leadStage.name) && (
                    <div className="mt-3 pt-3 border-t border-dark-border space-y-3 animate-fade-in">
                        {lead.leadPhone && (
                            <div className="flex items-center justify-between gap-2 text-sm text-dark-secondary">
                                <div className="flex items-center gap-2">
                                    <PhoneIcon className="w-4 h-4" />
                                    <span className="font-medium text-dark-text">{lead.leadPhone}</span>
                                </div>
                                <button 
                                    onClick={handleCopyPhone}
                                    className={`relative flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                                        isCopied 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-dark-border/50 hover:bg-dark-border'
                                    }`}
                                >
                                    {isCopied ? <CheckIcon className="w-3 h-3"/> : <ClipboardIcon className="w-3 h-3" />}
                                    {isCopied ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        )}
                        
                        <div className="space-y-3 pt-2">
                            <DetailItem icon={<CarIcon className="w-4 h-4" />} label="Interesse em:" value={lead.interestVehicle} />
                            
                            {lead.details && Object.entries(lead.details).map(([key, value]) => {
                                if (!value || typeof value !== 'string' && typeof value !== 'number') return null;
                                // Ignora campos de remanejamento que já têm tratamento especial
                                if (key.startsWith('reassigned_') || key.startsWith('transferred_')) return null;
                                
                                const config = detailConfig[key];
                                const label = config ? config.label : formatKeyToLabel(key);
                                const IconComponent = config ? config.icon : DocumentTextIcon;
                                return <DetailItem key={key} icon={<IconComponent className="w-4 h-4" />} label={label} value={String(value)} />;
                            })}
                        </div>
                        
                        {lastFeedback && (
                            <div className={`p-2 rounded-lg border text-xs ${feedbackColorClasses[sentiment]}`}>
                                <p className="font-bold uppercase tracking-wider mb-1 text-[10px]">Último Feedback:</p>
                                <p className="italic text-white/90 truncate text-sm">"{lastFeedback.text}"</p>
                            </div>
                        )}


                        <div className="pt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsFeedbackOpen(!isFeedbackOpen);
                                    if (showStatusButtons) setShowStatusButtons(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-dark-border/50 hover:bg-dark-border transition-colors"
                            >
                                <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
                                {isFeedbackOpen ? 'Fechar Feedback' : 'Feedback'}
                            </button>

                            {isFeedbackOpen && (
                                <form onSubmit={handleSubmitFeedback} className="mt-3 space-y-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                                    <div>
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 text-sm bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                                            placeholder="Digite o feedback do atendimento..."
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label htmlFor={`image-upload-${lead.id}`} className="w-full cursor-pointer text-center bg-dark-background hover:bg-dark-border/50 border border-dark-border text-dark-text font-medium py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2">
                                            <UploadIcon className="w-4 h-4"/>
                                            <span>Adicionar Imagens</span>
                                        </label>
                                        <input id={`image-upload-${lead.id}`} type="file" multiple className="sr-only" onChange={handleImageChange} accept="image/*" />
                                    </div>

                                    {feedbackImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {feedbackImages.map((imgSrc, index) => (
                                                <div key={index} className="relative group">
                                                    <img src={imgSrc} alt={`Preview ${index}`} className="w-full h-16 object-cover rounded-md" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <XIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-end gap-2">
                                         <button 
                                            type="submit"
                                            disabled={!feedbackText.trim() || isSubmitting}
                                            className="flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-dark-primary text-dark-background hover:opacity-90 transition-opacity disabled:opacity-50"
                                         >
                                            {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
                                        </button>
                                    </div>
                                </form>
                            )}
                            
                            {showStatusButtons && (
                                <div className="mt-4 pt-3 border-t border-dark-border/50 space-y-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                                    <h5 className="text-center text-xs font-bold uppercase text-dark-secondary pb-2">Qual status do atendimento?</h5>
                                     {actionableStages.map(stage => {
                                        if (stage.name === 'Finalizados') {
                                            return (
                                                <React.Fragment key="finalizados-fragment">
                                                    <button
                                                        onClick={(e) => handleStatusUpdate(e, 'Finalizados', { outcome: 'convertido' })}
                                                        className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                        Lead Convertido
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleStatusUpdate(e, 'Finalizados', { outcome: 'nao_convertido' })}
                                                        className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                        Lead Não Convertido
                                                    </button>
                                                </React.Fragment>
                                            );
                                        }
                                        if (stage.name === 'Agendado') {
                                            return (
                                                <button
                                                    key={stage.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const today = new Date();
                                                        const defaultAppointmentTime = new Date(today.getTime() + 60 * 60 * 1000);
                                                        setAppointmentDate(defaultAppointmentTime.toISOString().split('T')[0]);
                                                        setAppointmentTime(defaultAppointmentTime.toTimeString().split(' ')[0].substring(0, 5));
                                                        setIsAppointmentModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                                >
                                                    <CalendarIcon className="w-4 h-4" />
                                                    Agendamento
                                                </button>
                                            );
                                        }
                                        // For other stages like "Segunda Tentativa" or custom stages
                                        return (
                                            <button
                                                key={stage.id}
                                                onClick={(e) => handleStatusUpdate(e, stage.name)}
                                                className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                            >
                                                <ArrowRightIcon className="w-4 h-4" />
                                                {stage.name}
                                            </button>
                                        );
                                    })}
                                    {onTransfer && (
                                        <button onClick={(e) => { e.stopPropagation(); if (onTransfer) onTransfer(lead); }} className="w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors">
                                            <SwitchHorizontalIcon className="w-4 h-4" /> Transferir
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}>
                 <div className="p-2 space-y-4">
                    <h2 className="text-2xl font-bold text-center">Detalhes do Lead: {lead.leadName}</h2>
                     <div className="max-h-[60vh] overflow-y-auto pr-2 my-4 border-y border-dark-border py-4">
                        <div className="relative pl-5 py-2">
                             <div className="absolute left-2.5 top-0 h-full w-0.5 bg-dark-border"></div>
                             {useMemo(() => generateLeadEvents(lead, teamMembers, pipelineStages), [lead, teamMembers, pipelineStages]).map((event, eventIndex, events) => {
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
                                )
                             })}
                        </div>
                    </div>
                     <div className="pt-4 border-t border-dark-border flex flex-col sm:flex-row justify-center gap-3">
                         {isManagerView && onReassign && (
                             <button onClick={handleReassignClick} className="px-4 py-2 rounded-md bg-purple-600/80 text-white font-bold hover:bg-purple-600">
                                Remanejar Lead
                            </button>
                         )}
                         {isFinalized && onReopenRequest && (
                             <button onClick={handleReopenClick} className="px-4 py-2 rounded-md bg-blue-600/80 text-white font-bold hover:bg-blue-600 flex items-center gap-2">
                                <ArrowPathIcon className="w-4 h-4"/> Reabrir Atendimento
                            </button>
                         )}
                         <button onClick={() => setIsDetailModalOpen(false)} className="px-4 py-2 rounded-md bg-dark-border/50 hover:bg-dark-border font-bold">
                            Fechar
                        </button>
                     </div>
                 </div>
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

            {expandedImageUrl && <ImageLightbox imageUrl={expandedImageUrl} onClose={() => setExpandedImageUrl(null)} />}
        </>
    );
};