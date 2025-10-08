import React, { useState, useEffect, useMemo } from 'react';
import { TeamMember, SalespersonProspectAISettings } from '../types';
import { useData } from '../hooks/useMockData';
import Card from '../components/Card';

interface GoalSettingsScreenProps {
    companyId: string;
    onBack: () => void;
}

interface GoalState {
    farmGoal: number; // monthlySalesGoal
    hunterGoalType: 'daily' | 'weekly' | 'monthly';
    hunterGoalValue: number;
}

const GoalSettingsScreen: React.FC<GoalSettingsScreenProps> = ({ companyId, onBack }) => {
    const { teamMembers, updateTeamMember } = useData();
    const [salespeopleGoals, setSalespeopleGoals] = useState<Record<string, GoalState>>({});
    const [isLoading, setIsLoading] = useState(false);

    const companySalespeople = useMemo(() => 
        teamMembers.filter(tm => tm.companyId === companyId && tm.role === 'Vendedor'),
    [teamMembers, companyId]);

    useEffect(() => {
        const initialGoals: Record<string, GoalState> = {};
        companySalespeople.forEach(sp => {
            initialGoals[sp.id] = {
                farmGoal: sp.monthlySalesGoal,
                hunterGoalType: sp.prospectAISettings?.hunter_goals?.type || 'monthly',
                hunterGoalValue: sp.prospectAISettings?.hunter_goals?.value || 0,
            };
        });
        setSalespeopleGoals(initialGoals);
    }, [companySalespeople]);

    const handleGoalChange = (salespersonId: string, field: keyof GoalState, value: string | number) => {
        setSalespeopleGoals(prev => ({
            ...prev,
            [salespersonId]: {
                ...prev[salespersonId],
                [field]: (field === 'farmGoal' || field === 'hunterGoalValue') ? (Number(value) >= 0 ? Number(value) : 0) : value,
            },
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        const updatePromises: Promise<void>[] = [];

        for (const salesperson of companySalespeople) {
            const currentGoals = salespeopleGoals[salesperson.id];
            if (!currentGoals) continue;

            const needsUpdate =
                salesperson.monthlySalesGoal !== currentGoals.farmGoal ||
                (salesperson.prospectAISettings?.hunter_goals?.type || 'monthly') !== currentGoals.hunterGoalType ||
                (salesperson.prospectAISettings?.hunter_goals?.value || 0) !== currentGoals.hunterGoalValue;
            
            if (needsUpdate) {
                const updatedSalesperson: TeamMember = {
                    ...salesperson,
                    monthlySalesGoal: currentGoals.farmGoal,
                    prospectAISettings: {
                        ...(salesperson.prospectAISettings || { deadlines: { initial_contact: { minutes: 60, auto_reassign_enabled: false, reassignment_mode: 'random', reassignment_target_id: null } } }),
                        hunter_goals: {
                            type: currentGoals.hunterGoalType,
                            value: currentGoals.hunterGoalValue,
                        }
                    } as SalespersonProspectAISettings
                };
                updatePromises.push(updateTeamMember(updatedSalesperson));
            }
        }

        try {
            await Promise.all(updatePromises);
            alert('Metas salvas com sucesso!');
        } catch (error) {
            console.error("Failed to save goals:", error);
            alert('Ocorreu um erro ao salvar as metas.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                        &larr; Voltar para Configurações
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Configuração de Metas</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-dark-primary text-dark-background font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </header>
            
            <Card className="p-6">
                <div className="space-y-6">
                    {companySalespeople.length > 0 ? (
                        companySalespeople.map(sp => (
                            <div key={sp.id} className="p-4 bg-dark-background rounded-lg border border-dark-border grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div className="flex items-center gap-4 md:col-span-1">
                                    <img src={sp.avatarUrl} alt={sp.name} className="w-12 h-12 rounded-full" />
                                    <span className="font-bold text-lg">{sp.name}</span>
                                </div>
                                
                                <div className="space-y-4 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div>
                                        <label htmlFor={`farm-goal-${sp.id}`} className="block text-sm font-semibold text-dark-secondary mb-2">Meta de Vendas (Farm)</label>
                                        <div className="relative">
                                            <input
                                                id={`farm-goal-${sp.id}`}
                                                type="number"
                                                value={salespeopleGoals[sp.id]?.farmGoal || ''}
                                                onChange={e => handleGoalChange(sp.id, 'farmGoal', e.target.value)}
                                                className="w-full pl-4 pr-24 py-2 bg-dark-card border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                                                min="0"
                                            />
                                             <span className="absolute inset-y-0 right-4 flex items-center text-sm text-dark-secondary">vendas/mês</span>
                                        </div>
                                    </div>
                                    
                                     <div>
                                        <label htmlFor={`hunter-goal-${sp.id}`} className="block text-sm font-semibold text-dark-secondary mb-2">Meta de Prospecção (Hunter)</label>
                                        <div className="flex gap-2">
                                            <input
                                                id={`hunter-goal-${sp.id}`}
                                                type="number"
                                                value={salespeopleGoals[sp.id]?.hunterGoalValue || ''}
                                                onChange={e => handleGoalChange(sp.id, 'hunterGoalValue', e.target.value)}
                                                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                                                min="0"
                                            />
                                            <select
                                                value={salespeopleGoals[sp.id]?.hunterGoalType || 'monthly'}
                                                onChange={e => handleGoalChange(sp.id, 'hunterGoalType', e.target.value)}
                                                className="bg-dark-card border border-dark-border rounded-md text-sm text-dark-secondary focus:ring-dark-primary focus:border-dark-primary"
                                            >
                                                <option value="daily">/ dia</option>
                                                <option value="weekly">/ semana</option>
                                                <option value="monthly">/ mês</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-dark-secondary py-8">Nenhum vendedor cadastrado na equipe.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default GoalSettingsScreen;
