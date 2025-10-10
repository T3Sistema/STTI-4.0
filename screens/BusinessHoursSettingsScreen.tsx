import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../hooks/useMockData';
import { BusinessHours } from '../types';
import Card from '../components/Card';
import ConfirmationModal from '../components/ConfirmationModal';

interface BusinessHoursSettingsScreenProps {
    companyId: string;
    onBack: () => void;
}

const BusinessHoursSettingsScreen: React.FC<BusinessHoursSettingsScreenProps> = ({ companyId, onBack }) => {
    const { companies, updateCompany } = useData();
    const [config, setConfig] = useState<BusinessHours | undefined>(undefined);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const company = useMemo(() => companies.find(c => c.id === companyId), [companies, companyId]);

    useEffect(() => {
        if (company) {
            setConfig(company.prospectAISettings?.business_hours);
        }
    }, [company]);

    const handleBusinessHoursChange = (updates: Partial<BusinessHours>) => {
        setConfig(prev => ({ ...(prev as BusinessHours), ...updates }));
    };

    const handleDaySettingChange = (dayIndex: number, field: string, value: any) => {
        if (!config) return;

        const currentDays = config.days || {};
        const dayKey = dayIndex as keyof typeof currentDays;

        const newDays = {
            ...currentDays,
            [dayKey]: {
                ...(currentDays[dayKey] || { isOpen: false, startTime: '09:00', endTime: '18:00' }),
                [field]: value
            }
        };

        handleBusinessHoursChange({ days: newDays });
    };

    const handleSaveRequest = () => {
        setConfirmOpen(true);
    };

    const handleSave = async () => {
        if (!company || !config) return;
        setIsLoading(true);
        
        const newSettings = {
            ...company.prospectAISettings,
            business_hours: config,
        };
        
        try {
            await updateCompany({ ...company, prospectAISettings: newSettings });
            alert('Horário de funcionamento salvo com sucesso!');
            onBack();
        } catch (error) {
            console.error("Failed to save business hours:", error);
            alert('Ocorreu um erro ao salvar as configurações.');
        } finally {
            setIsLoading(false);
            setConfirmOpen(false);
        }
    };

    const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (!config) {
        return <div>Carregando configurações...</div>;
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                        &larr; Voltar para Automações
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Horário de Funcionamento</h1>
                </div>
            </header>
            
            <Card className="p-6">
                <p className="text-sm text-dark-secondary mb-4">Defina o horário de funcionamento para que a verificação de prazos e remanejamentos automáticos ocorram apenas quando a empresa estiver aberta.</p>
                <div className="p-4 bg-dark-background rounded-lg border border-dark-border space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-dark-text">Ativar verificação de horário</p>
                            <p className="text-xs text-dark-secondary">Pausar remanejamentos fora do expediente.</p>
                        </div>
                        <label className="cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={config.isEnabled} onChange={e => handleBusinessHoursChange({ isEnabled: e.target.checked })} />
                                <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dark-primary"></div>
                            </div>
                        </label>
                    </div>

                    {config.isEnabled && (
                        <div className="pt-4 border-t border-dark-border space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-dark-text">Funciona 24 horas, 7 dias por semana</p>
                                <label className="cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only peer" checked={config.is24_7} onChange={e => handleBusinessHoursChange({ is24_7: e.target.checked })} />
                                        <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dark-primary"></div>
                                    </div>
                                </label>
                            </div>

                            {!config.is24_7 && (
                                <div className="space-y-3 pt-2">
                                    {dayLabels.map((label, index) => {
                                        const daySettings = config.days?.[index as keyof typeof config.days];
                                        return (
                                        <div key={index} className="grid grid-cols-3 md:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center text-sm">
                                            <label className="flex items-center gap-2 font-medium">
                                                <input type="checkbox" checked={daySettings?.isOpen} onChange={e => handleDaySettingChange(index, 'isOpen', e.target.checked)} className="w-4 h-4 bg-dark-card border-dark-border rounded text-dark-primary focus:ring-dark-primary" />
                                                {label}
                                            </label>
                                            {daySettings?.isOpen && (
                                                <>
                                                    <label htmlFor={`start-${index}`} className="text-dark-secondary">Início:</label>
                                                    <input type="time" id={`start-${index}`} value={daySettings.startTime} onChange={e => handleDaySettingChange(index, 'startTime', e.target.value)} className="input-time" />
                                                    <label htmlFor={`end-${index}`} className="text-dark-secondary">Fim:</label>
                                                    <input type="time" id={`end-${index}`} value={daySettings.endTime} onChange={e => handleDaySettingChange(index, 'endTime', e.target.value)} className="input-time" />
                                                </>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSaveRequest}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-dark-primary text-dark-background font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleSave}
                title="Confirmar Alterações"
                confirmButtonText="Sim, Salvar"
                confirmButtonClass="bg-green-600 hover:bg-green-700"
            >
                Você tem certeza que deseja salvar as novas configurações de horário de funcionamento?
            </ConfirmationModal>

            <style>{`.input-time { background-color: #1A1F29; border: 1px solid #243049; color: #E0E0E0; border-radius: 6px; padding: 4px 8px; font-size: 0.875rem; color-scheme: dark; } .input-time::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }`}</style>
        </div>
    );
};

export default BusinessHoursSettingsScreen;
