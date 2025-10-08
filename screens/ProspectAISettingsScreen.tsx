import React, { useState, useEffect } from 'react';
import { Company, TeamMember, SalespersonProspectAISettings } from '../types';
import Card from '../components/Card';
import { ClockIcon } from '../components/icons/ClockIcon';
import { useData } from '../hooks/useMockData';
import { SwitchHorizontalIcon } from '../components/icons/SwitchHorizontalIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { UserCircleIcon } from '../components/icons/UserCircleIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from '../components/icons/ChatBubbleOvalLeftEllipsisIcon';

interface ProspectAISettingsScreenProps {
    salesperson: TeamMember;
    onBack: () => void;
}

const ProspectAISettingsScreen: React.FC<ProspectAISettingsScreenProps> = ({ salesperson, onBack }) => {
    const { teamMembers, updateTeamMember } = useData();

    const [initialContactSettings, setInitialContactSettings] = useState({
        minutes: 60,
        auto_reassign_enabled: false,
        reassignment_mode: 'random' as 'random' | 'specific',
        reassignment_target_id: null as string | null,
    });
    
    const [firstFeedbackSettings, setFirstFeedbackSettings] = useState({
        minutes: 240,
        auto_reassign_enabled: false,
        reassignment_mode: 'random' as 'random' | 'specific',
        reassignment_target_id: null as string | null,
    });
    
    const otherSalespeople = teamMembers.filter(tm => tm.companyId === salesperson.companyId && tm.role === 'Vendedor' && tm.id !== salesperson.id);

    useEffect(() => {
        if (salesperson.prospectAISettings?.deadlines?.initial_contact) {
            setInitialContactSettings(salesperson.prospectAISettings.deadlines.initial_contact);
        }
        if (salesperson.prospectAISettings?.deadlines?.first_feedback) {
            setFirstFeedbackSettings(salesperson.prospectAISettings.deadlines.first_feedback);
        }
    }, [salesperson]);

    const handleSave = async () => {
        const updatedSalesperson: TeamMember = {
            ...salesperson,
            prospectAISettings: {
                ...salesperson.prospectAISettings,
                deadlines: {
                    initial_contact: initialContactSettings,
                    first_feedback: firstFeedbackSettings,
                },
            },
        };

        await updateTeamMember(updatedSalesperson);
        alert(`Configurações de prazo salvas para ${salesperson.name}.`);
        onBack();
    };

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            <header className="flex flex-col items-center text-center gap-4 mb-8">
                <button onClick={onBack} className="self-start flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text">
                    &larr; Voltar para Seleção de Vendedores
                </button>
                <img src={salesperson.avatarUrl} alt={salesperson.name} className="w-24 h-24 rounded-full border-4 border-dark-border" />
                <div>
                    <h1 className="text-3xl font-bold text-dark-text">Configurar Prazos e Automações</h1>
                    <p className="text-lg text-dark-secondary">para o vendedor <span className="font-bold text-dark-text">{salesperson.name}</span></p>
                </div>
            </header>

            <div className="space-y-6">
                <Card className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-dark-background border border-dark-border flex items-center justify-center text-dark-primary">
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <label className="font-bold text-dark-text">Tempo para Iniciar Prospecção</label>
                            <p className="text-xs text-dark-secondary mt-1">Prazo máximo (em minutos) que um vendedor tem para atender um novo lead.</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <input
                            type="number"
                            value={initialContactSettings.minutes}
                            onChange={(e) => setInitialContactSettings(s => ({ ...s, minutes: Number(e.target.value) }))}
                            className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                            min="1"
                        />
                        <span className="font-semibold text-dark-secondary">minutos</span>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-dark-background border border-dark-border flex items-center justify-center text-dark-primary">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <label className="font-bold text-dark-text">Prazo do Primeiro Feedback</label>
                            <p className="text-xs text-dark-secondary mt-1">Prazo máximo (em minutos) para o vendedor registrar a primeira ação após iniciar a prospecção.</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <input
                            type="number"
                            value={firstFeedbackSettings.minutes}
                            onChange={(e) => setFirstFeedbackSettings(s => ({ ...s, minutes: Number(e.target.value) }))}
                            className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                            min="1"
                        />
                        <span className="font-semibold text-dark-secondary">minutos</span>
                    </div>
                </Card>

                <Card className="p-5">
                     <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-dark-background border border-dark-border flex items-center justify-center text-dark-primary">
                            <SwitchHorizontalIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-dark-text">Remanejamento Automático</label>
                            <p className="text-xs text-dark-secondary mt-1">Se ativado, leads não atendidos no prazo serão remanejados para outro vendedor.</p>
                        </div>
                         <label htmlFor="toggle-reassign" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="toggle-reassign" className="sr-only peer" checked={initialContactSettings.auto_reassign_enabled} onChange={(e) => setInitialContactSettings(s => ({...s, auto_reassign_enabled: e.target.checked}))} />
                                <div className="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dark-primary"></div>
                            </div>
                        </label>
                    </div>

                    {initialContactSettings.auto_reassign_enabled && (
                        <div className="mt-4 pt-4 border-t border-dark-border animate-fade-in space-y-3">
                            <p className="text-sm font-semibold text-dark-secondary">Estratégia de Remanejamento:</p>
                             <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex-1 flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer bg-dark-background/50 hover:border-dark-primary/30">
                                    <input type="radio" name="reassignment_mode" value="random" checked={initialContactSettings.reassignment_mode === 'random'} onChange={() => setInitialContactSettings(s => ({ ...s, reassignment_mode: 'random' }))} className="w-4 h-4 mr-3 text-dark-primary focus:ring-dark-primary"/>
                                    <UsersIcon className="w-5 h-5 text-dark-secondary mr-2"/>
                                    <span className="text-sm font-medium">Aleatório</span>
                                </label>
                                 <label className="flex-1 flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer bg-dark-background/50 hover:border-dark-primary/30">
                                    <input type="radio" name="reassignment_mode" value="specific" checked={initialContactSettings.reassignment_mode === 'specific'} onChange={() => setInitialContactSettings(s => ({ ...s, reassignment_mode: 'specific' }))} className="w-4 h-4 mr-3 text-dark-primary focus:ring-dark-primary"/>
                                    <UserCircleIcon className="w-5 h-5 text-dark-secondary mr-2"/>
                                    <span className="text-sm font-medium">Vendedor Específico</span>
                                </label>
                            </div>
                             {initialContactSettings.reassignment_mode === 'specific' && (
                                <div className="mt-3 animate-fade-in">
                                    <select
                                        value={initialContactSettings.reassignment_target_id || ''}
                                        onChange={(e) => setInitialContactSettings(s => ({...s, reassignment_target_id: e.target.value || null}))}
                                        className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                                    >
                                        <option value="">Selecione um vendedor...</option>
                                        {otherSalespeople.map(sp => (
                                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
            
            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-dark-primary text-dark-background font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                    Salvar Configurações
                </button>
            </div>
        </div>
    );
};

export default ProspectAISettingsScreen;