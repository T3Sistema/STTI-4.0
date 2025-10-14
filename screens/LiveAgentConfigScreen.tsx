import React, { useState, useEffect, FormEvent, ReactNode } from 'react';
import { useData } from '../hooks/useMockData';
import { LiveAgentConfig, LiveAgentToneOfVoice, LiveAgentServiceMode } from '../types';
import Card from '../components/Card';
import { LiveIcon, PlusIcon, TrashIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';

interface LiveAgentConfigScreenProps {
    companyId: string;
    onBack: () => void;
}

const toneOfVoiceOptions: { id: LiveAgentToneOfVoice; label: string; description: string }[] = [
    { id: 'acolhedor', label: 'Acolhedor', description: 'Amigável, empático e paciente.' },
    { id: 'consultivo', label: 'Consultivo', description: 'Informativo, orientador e especialista.' },
    { id: 'tecnico', label: 'Técnico', description: 'Preciso, detalhado e formal.' },
    { id: 'empreendedor', label: 'Empreendedor', description: 'Direto, focado em resultados e persuasivo.' },
    { id: 'motivador', label: 'Motivador', description: 'Inspirador e encorajador.' },
    { id: 'humanizado', label: 'Humanizado', description: 'Natural, evita jargões robóticos.' },
];

const serviceModeOptions: { id: LiveAgentServiceMode; label: string }[] = [
    { id: 'consultivo', label: 'Consultivo' },
    { id: 'comercial', label: 'Comercial' },
    { id: 'informativo', label: 'Informativo' },
    { id: 'suporte', label: 'Suporte' },
];

const SectionCard: React.FC<{ title: string; children: ReactNode; }> = ({ title, children }) => (
    <Card className="p-6">
        <h2 className="text-xl font-bold text-dark-text mb-4">{title}</h2>
        <div className="space-y-4">
            {children}
        </div>
    </Card>
);

const FormField: React.FC<{ label: string; name: keyof Omit<LiveAgentConfig, 'id' | 'companyId' | 'updatedAt'>; value: string; onChange: (name: keyof Omit<LiveAgentConfig, 'id' | 'companyId' | 'updatedAt'>, value: string) => void; required?: boolean; }> = ({ label, name, value, onChange, required }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-dark-secondary mb-1">{label}</label>
        <input
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className="input-field"
            required={required}
        />
    </div>
);

const FormTextArea: React.FC<{ label: string; name: keyof Omit<LiveAgentConfig, 'id' | 'companyId' | 'updatedAt'>; value: string; onChange: (name: keyof Omit<LiveAgentConfig, 'id' | 'companyId' | 'updatedAt'>, value: string) => void; description?: string; example?: string; rows?: number; }> = ({ label, name, value, onChange, description, example, rows = 3 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-dark-secondary mb-1">{label}</label>
        {description && <p className="text-xs text-dark-secondary/70 mb-2">{description}</p>}
        <textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            rows={rows}
            className="input-field"
            placeholder={example}
        />
    </div>
);

const EditableList: React.FC<{ label: string; items: string[]; setItems: (newItems: string[]) => void; placeholder: string; }> = ({ label, items, setItems, placeholder }) => {
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };

    const handleAddItem = () => setItems([...items, '']);
    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    return (
        <div>
            <label className="block text-sm font-medium text-dark-secondary mb-2">{label}</label>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => handleItemChange(index, e.target.value)}
                            className="input-field flex-grow"
                            placeholder={`${placeholder} #${index + 1}`}
                        />
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 rounded-md text-red-500/70 hover:bg-dark-border hover:text-red-500 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={handleAddItem} className="mt-2 flex items-center gap-2 text-sm font-semibold text-dark-primary hover:underline">
                <PlusIcon className="w-4 h-4" /> Adicionar Item
            </button>
        </div>
    );
};


const LiveAgentConfigScreen: React.FC<LiveAgentConfigScreenProps> = ({ companyId, onBack }) => {
    const { liveAgentConfigs, saveLiveAgentConfig } = useData();
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [config, setConfig] = useState<Omit<LiveAgentConfig, 'id' | 'companyId' | 'updatedAt'>>({
        agentName: '', companyProjectName: '', agentRole: '', roleDescription: '', mission: '',
        toneOfVoice: [], mandatoryQuestions: [], optionalQuestions: [], greetingMessages: '',
        doRules: [], dontRules: [], forbiddenWords: '', interactionExamples: '',
        finalSummaryFormat: '', finalNotes: '', serviceMode: null,
    });

    useEffect(() => {
        const existingConfig = liveAgentConfigs.find(c => c.companyId === companyId);
        if (existingConfig) {
            setConfig(existingConfig);
        }
    }, [liveAgentConfigs, companyId]);

    const handleChange = (name: keyof typeof config, value: any) => {
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleToneChange = (tone: LiveAgentToneOfVoice) => {
        const currentTones = config.toneOfVoice;
        const newTones = currentTones.includes(tone)
            ? currentTones.filter(t => t !== tone)
            : [...currentTones, tone];
        handleChange('toneOfVoice', newTones);
    };

    const handleSaveRequest = (e: FormEvent) => {
        e.preventDefault();
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmModalOpen(false);
        setIsLoading(true);
        try {
            await saveLiveAgentConfig({ ...config, companyId });
            alert('Configurações do Agente LIVE salvas com sucesso!');
            onBack();
        } catch (error) {
            console.error(error);
            alert('Falha ao salvar as configurações.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
             <header className="flex flex-col items-center text-center gap-4 mb-8">
                <button onClick={onBack} className="self-start flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text">
                    &larr; Voltar para Visão Geral
                </button>
                 <div className="p-4 bg-dark-card border border-dark-border rounded-full">
                    <LiveIcon className="w-10 h-10 text-dark-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Configurar Agente LIVE</h1>
                <p className="text-dark-secondary max-w-2xl">
                    Personalize a inteligência e a personalidade do seu agente de atendimento automático para que ele represente sua empresa da melhor forma.
                </p>
            </header>

            <form onSubmit={handleSaveRequest} className="space-y-6">
                <SectionCard title="1. Identificação do Agente">
                    <FormField label="Nome do Agente" name="agentName" value={config.agentName} onChange={handleChange} required />
                    <FormField label="Nome da Empresa / Projeto" name="companyProjectName" value={config.companyProjectName} onChange={handleChange} required />
                    <FormField label="Cargo ou Função do Agente" name="agentRole" value={config.agentRole} onChange={handleChange} required />
                </SectionCard>

                <SectionCard title="2. Apresentação e Papel">
                    <FormTextArea label="Descrição do Papel do Agente" name="roleDescription" value={config.roleDescription} onChange={handleChange} />
                    <FormTextArea label="Missão / Objetivo Geral" name="mission" value={config.mission} onChange={handleChange} />
                     <div>
                        <label className="block text-sm font-medium text-dark-secondary mb-2">Tom de Voz (selecione um ou mais)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {toneOfVoiceOptions.map(opt => (
                                <label key={opt.id} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${config.toneOfVoice.includes(opt.id) ? 'border-dark-primary bg-dark-primary/10' : 'border-dark-border bg-dark-background/50 hover:border-dark-primary/30'}`}>
                                    <input type="checkbox" checked={config.toneOfVoice.includes(opt.id)} onChange={() => handleToneChange(opt.id)} className="sr-only"/>
                                    <p className="font-semibold">{opt.label}</p>
                                </label>
                            ))}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="3. Fluxo de Atendimento (Perguntas e Etapas)">
                    <EditableList label="Perguntas obrigatórias (em ordem)" items={config.mandatoryQuestions} setItems={(items) => handleChange('mandatoryQuestions', items)} placeholder="Ex: Qual é o seu nome?" />
                    <EditableList label="Perguntas opcionais" items={config.optionalQuestions} setItems={(items) => handleChange('optionalQuestions', items)} placeholder="Ex: Você já é nosso cliente?" />
                    <FormTextArea label="Mensagens de saudação possíveis (uma por linha)" name="greetingMessages" value={config.greetingMessages} onChange={handleChange} />
                </SectionCard>
                
                <SectionCard title="4. Regras de Comunicação">
                    <EditableList label="O que o agente DEVE fazer (Boas práticas)" items={config.doRules} setItems={(items) => handleChange('doRules', items)} placeholder="Ex: Ser humano e acolhedor" />
                    <EditableList label="O que o agente NUNCA deve fazer (Restrições)" items={config.dontRules} setItems={(items) => handleChange('dontRules', items)} placeholder="Ex: Nunca falar sobre preços" />
                    <FormField label="Palavras ou temas proibidos (separados por vírgula)" name="forbiddenWords" value={config.forbiddenWords} onChange={handleChange} />
                </SectionCard>

                <SectionCard title="5. Respostas e Exemplos de Interação">
                    <FormTextArea label="Exemplos de conversa" name="interactionExamples" value={config.interactionExamples} onChange={handleChange} rows={6} description="Formato: Cliente: [mensagem] Agente: [resposta]" />
                </SectionCard>

                <SectionCard title="6. Resumo Final (padrão de saída)">
                    <FormTextArea label="Modelo de resumo final do atendimento" name="finalSummaryFormat" value={config.finalSummaryFormat} onChange={handleChange} />
                </SectionCard>

                <SectionCard title="7. Notas e Regras Finais">
                    <FormTextArea label="Observações gerais e instruções finais" name="finalNotes" value={config.finalNotes} onChange={handleChange} />
                </SectionCard>

                <SectionCard title="8. Configurações Opcionais">
                     <div>
                        <label className="block text-sm font-medium text-dark-secondary mb-2">Modo de atendimento</label>
                        <div className="flex flex-wrap gap-3">
                            {serviceModeOptions.map(opt => (
                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="serviceMode" value={opt.id} checked={config.serviceMode === opt.id} onChange={() => handleChange('serviceMode', opt.id)} className="w-4 h-4 text-dark-primary bg-dark-background border-dark-border focus:ring-dark-primary"/>
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </SectionCard>


                <div className="flex justify-end mt-8">
                    <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-dark-primary text-dark-background font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                        {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmSave}
                title="Confirmar Alterações do Agente"
                confirmButtonText="Confirmar e Atualizar"
                confirmButtonClass="bg-green-600 hover:bg-green-700"
            >
                Atenção: A memória do agente será apagada para que essa nova atualização seja aplicada com sucesso. Deseja continuar?
            </ConfirmationModal>

            <style>{`.input-field { width: 100%; padding: 0.75rem 1rem; background-color: #0A0F1E; border: 1px solid #243049; border-radius: 0.5rem; color: #E0E0E0; font-size: 0.875rem; } .input-field:focus { outline: none; box-shadow: 0 0 0 2px #00D1FF; }`}</style>
        </div>
    );
};

export default LiveAgentConfigScreen;