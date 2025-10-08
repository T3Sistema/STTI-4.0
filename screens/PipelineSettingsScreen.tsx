import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useMockData';
import { PipelineStage, TeamMember, Company } from '../types';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { LockIcon } from '../components/icons/LockIcon';

interface PipelineSettingsScreenProps {
    companyId: string;
    onBack: () => void;
}

interface StageFormProps {
    initialData?: PipelineStage;
    onSave: (name: string) => void;
    onClose: () => void;
}

const StageForm: React.FC<StageFormProps> = ({ initialData, onSave, onClose }) => {
    const [name, setName] = useState(initialData?.name || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
            <h2 className="text-2xl font-bold text-center mb-6">{initialData ? 'Editar Etapa' : 'Nova Etapa'}</h2>
            <div>
                <label htmlFor="stageName" className="block text-sm font-medium text-dark-secondary mb-1">Nome da Etapa</label>
                <input
                    type="text"
                    id="stageName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                    required
                    autoFocus
                />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-dark-border/50 hover:bg-dark-border transition-colors font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-dark-primary text-dark-background font-bold hover:opacity-90">Salvar</button>
            </div>
        </form>
    );
};

const KpiVisibilityModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (visibility: 'all' | string[]) => void;
    salespeople: TeamMember[];
    currentVisibility: 'all' | string[];
}> = ({ isOpen, onClose, onSave, salespeople, currentVisibility }) => {
    const [mode, setMode] = useState<'all' | 'specific'>(Array.isArray(currentVisibility) ? 'specific' : 'all');
    const [selectedIds, setSelectedIds] = useState<string[]>(Array.isArray(currentVisibility) ? currentVisibility : []);

    const handleToggleId = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSave = () => {
        onSave(mode === 'all' ? 'all' : selectedIds);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-2">
                <h2 className="text-2xl font-bold text-center mb-2 text-dark-text">Visibilidade do KPI</h2>
                <p className="text-center text-dark-secondary mb-6">Escolha quem poderá ver o card "Total de Leads da Empresa (Mês)".</p>
                <div className="space-y-4">
                    <label className="flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer bg-dark-background/50 hover:border-dark-primary/30">
                        <input type="radio" name="visibility" value="all" checked={mode === 'all'} onChange={() => setMode('all')} className="w-5 h-5 mr-4 text-dark-primary focus:ring-dark-primary"/>
                        <span className="font-semibold text-dark-text">Todos os vendedores</span>
                    </label>
                    <label className="flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer bg-dark-background/50 hover:border-dark-primary/30">
                        <input type="radio" name="visibility" value="specific" checked={mode === 'specific'} onChange={() => setMode('specific')} className="w-5 h-5 mr-4 text-dark-primary focus:ring-dark-primary"/>
                        <span className="font-semibold text-dark-text">Selecionar vendedores</span>
                    </label>
                </div>
                {mode === 'specific' && (
                    <div className="mt-4 p-3 border-t border-dark-border max-h-60 overflow-y-auto space-y-2">
                        {salespeople.map(sp => (
                             <label key={sp.id} className="flex items-center p-2 rounded-md hover:bg-dark-border/50 cursor-pointer">
                                <input type="checkbox" checked={selectedIds.includes(sp.id)} onChange={() => handleToggleId(sp.id)} className="w-4 h-4 mr-3 text-dark-primary focus:ring-dark-primary"/>
                                <img src={sp.avatarUrl} alt={sp.name} className="w-8 h-8 rounded-full mr-3" />
                                <span className="text-sm font-medium">{sp.name}</span>
                            </label>
                        ))}
                    </div>
                )}
                 <div className="flex justify-end gap-3 pt-6">
                    <button onClick={onClose} className="px-5 py-2.5 font-bold rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-5 py-2.5 font-bold rounded-lg bg-dark-primary text-dark-background transition-opacity hover:opacity-90">Salvar Visibilidade</button>
                </div>
            </div>
        </Modal>
    );
};


const PipelineSettingsScreen: React.FC<PipelineSettingsScreenProps> = ({ companyId, onBack }) => {
    const { companies, teamMembers, updateCompany, addPipelineStage, updatePipelineStage, deletePipelineStage } = useData();
    const [isFormOpen, setFormOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<PipelineStage | undefined>(undefined);
    const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
    const [stageToToggle, setStageToToggle] = useState<PipelineStage | null>(null);
    const [error, setError] = useState('');
    const [isKpiModalOpen, setKpiModalOpen] = useState(false);
    const [isDisableConfirmOpen, setDisableConfirmOpen] = useState(false);


    const company = useMemo(() => companies.find(c => c.id === companyId), [companies, companyId]);
    const pipelineStages = useMemo(() => company?.pipeline_stages.sort((a, b) => a.stageOrder - b.stageOrder) || [], [company]);
    const companySalespeople = useMemo(() => teamMembers.filter(tm => tm.companyId === companyId && tm.role === 'Vendedor'), [teamMembers, companyId]);

    const handleAdd = () => {
        setEditingStage(undefined);
        setFormOpen(true);
    };

    const handleEdit = (stage: PipelineStage) => {
        if (stage.isFixed) return;
        setEditingStage(stage);
        setFormOpen(true);
    };

    const handleSave = async (name: string) => {
        if (editingStage) {
            await updatePipelineStage(companyId, { ...editingStage, name });
        } else {
            const finalStages = pipelineStages.filter(s => s.stageOrder < 99);
            const maxOrder = finalStages.length > 0 ? Math.max(...finalStages.map(s => s.stageOrder)) : 0;
            await addPipelineStage(companyId, { name, stageOrder: maxOrder + 1 });
        }
        setFormOpen(false);
        setEditingStage(undefined);
    };

    const handleDeleteRequest = (stage: PipelineStage) => {
        if (stage.isFixed) return;
        setStageToDelete(stage);
        setDeleteConfirmOpen(true);
    };

    const confirmDeletion = async () => {
        if (stageToDelete) {
            setError('');
            const result = await deletePipelineStage(companyId, stageToDelete.id);
            if (!result.success) {
                setError(result.message || 'Erro desconhecido ao excluir.');
            }
        }
        setDeleteConfirmOpen(false);
        setStageToDelete(null);
    };
    
    const handleToggleEnableRequest = (stage: PipelineStage) => {
        if (stage.isFixed) return;
        setStageToToggle(stage);
        setToggleConfirmOpen(true);
    };

    const confirmToggleEnable = async () => {
        if (stageToToggle) {
            await updatePipelineStage(companyId, { ...stageToToggle, isEnabled: !stageToToggle.isEnabled });
        }
        setToggleConfirmOpen(false);
        setStageToToggle(null);
    };
    
    const kpiSettings = company?.prospectAISettings?.show_monthly_leads_kpi || { enabled: false, visible_to: [] };

    const handleKpiToggle = () => {
        if (kpiSettings.enabled) {
            setDisableConfirmOpen(true);
        } else {
            setKpiModalOpen(true);
        }
    };

    const handleDisableKpi = async () => {
        if (!company) return;
        const newSettings = {
            ...company.prospectAISettings,
            show_monthly_leads_kpi: { enabled: false, visible_to: [] }
        };
        await updateCompany({ ...company, prospectAISettings: newSettings });
        setDisableConfirmOpen(false);
    };

    const handleSaveKpiVisibility = async (visibility: 'all' | string[]) => {
        if (!company) return;
        const newSettings = {
            ...company.prospectAISettings,
            show_monthly_leads_kpi: { enabled: true, visible_to: visibility }
        };
        await updateCompany({ ...company, prospectAISettings: newSettings });
        setKpiModalOpen(false);
    };

    const kpiCards = useMemo(() => {
        const enabledStages = pipelineStages.filter(stage => stage.isEnabled);
        const stageMap = new Map(enabledStages.map(s => [s.name, s]));

        const staticKpis = [
            { title: 'Meus Leads Atribuídos', color: '#00D1FF', visible: true },
            { title: 'Leads Convertidos', color: '#22C55E', visible: true },
        ];

        const dynamicKpis = [
            { title: 'Primeira Tentativa', color: '#FBBF24', visible: stageMap.has('Primeira Tentativa') },
            { title: 'Segunda Tentativa', color: '#F59E0B', visible: stageMap.has('Segunda Tentativa') },
            { title: 'Terceira Tentativa', color: '#8B5CF6', visible: stageMap.has('Terceira Tentativa') },
            { title: 'Leads Agendados', color: '#60A5FA', visible: stageMap.has('Agendado') },
        ];
        
        const customKpis = enabledStages
            .filter(s => !s.isFixed && !['Segunda Tentativa', 'Terceira Tentativa', 'Agendado'].includes(s.name))
            .map(s => ({ title: s.name, color: '#8A93A3', visible: true }));

        const finalKpis = [
            { title: 'Leads Não Convertidos', color: '#EF4444', visible: true },
            { title: 'Round-Robin', color: '#A78BFA', visible: stageMap.has('Remanejados') },
        ];

        return [...staticKpis, ...dynamicKpis, ...customKpis, ...finalKpis].filter(kpi => kpi.visible);
    }, [pipelineStages]);


    if (!company) return <div>Carregando...</div>;

    return (
        <div className="animate-fade-in">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                        &larr; Voltar para Configurações
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Editor Visual do Pipeline</h1>
                </div>
            </header>
            
            <p className="text-dark-secondary mb-8">Arraste para o lado para visualizar e configurar todas as etapas do seu funil de prospecção. As alterações são salvas automaticamente.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 mb-8">
                {kpiCards.map(kpi => (
                    <Card key={kpi.title} className="p-4 text-center animate-fade-in">
                        <p className="text-sm font-medium text-dark-secondary truncate">{kpi.title}</p>
                        <p className="text-4xl font-bold mt-2" style={{ color: kpi.color }}>0</p>
                    </Card>
                ))}
            </div>
            
            <div className="flex overflow-x-auto space-x-6 pb-4">
                {pipelineStages.map(stage => (
                    <div key={stage.id} className="w-72 flex-shrink-0 bg-dark-card/50 p-4 rounded-lg flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-dark-text">{stage.name === 'Remanejados' ? 'Round-Robin' : stage.name}</h3>
                        </div>
                        <div className={`p-4 bg-dark-background rounded-lg border border-dark-border space-y-3 transition-opacity ${!stage.isEnabled && !stage.isFixed ? 'opacity-50' : ''}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-dark-secondary">Etapa Ativa:</span>
                                <label htmlFor={`toggle-stage-${stage.id}`} className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" id={`toggle-stage-${stage.id}`} className="sr-only peer" checked={stage.isEnabled} onChange={() => handleToggleEnableRequest(stage)} disabled={stage.isFixed} />
                                        <div className={`w-10 h-5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dark-primary ${stage.isFixed ? 'cursor-not-allowed opacity-60' : ''}`}></div>
                                    </div>
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border">
                                {stage.isFixed ? (
                                    <span className="text-xs text-yellow-400 flex items-center gap-1.5"><LockIcon className="w-3 h-3"/> Fixo</span>
                                ) : (
                                    <>
                                        <button onClick={() => handleEdit(stage)} className="p-1.5 rounded-full text-dark-secondary hover:bg-dark-border"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteRequest(stage)} className="p-1.5 rounded-full text-red-500/70 hover:bg-dark-border hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div className="w-72 flex-shrink-0">
                    <button onClick={handleAdd} className="w-full h-full border-2 border-dashed border-dark-border rounded-lg flex flex-col items-center justify-center text-dark-secondary hover:bg-dark-card/50 hover:border-dark-primary transition-colors">
                        <PlusIcon className="w-8 h-8" />
                        <span className="mt-2 font-bold">Adicionar Etapa</span>
                    </button>
                </div>
            </div>

            <Card className="mt-8 p-6">
                <h3 className="text-xl font-bold text-dark-text mb-2">Configurações de KPI</h3>
                <p className="text-sm text-dark-secondary mb-4">Gerencie os indicadores de desempenho que seus vendedores podem visualizar.</p>
                <div className="p-4 bg-dark-background rounded-lg border border-dark-border flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-dark-text">Exibir Total de Leads da Empresa (Mês)</p>
                        <p className="text-xs text-dark-secondary">Mostra um card com o total de leads que a empresa recebeu no mês.</p>
                    </div>
                    <label htmlFor="toggle-kpi" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="toggle-kpi" className="sr-only peer" checked={kpiSettings.enabled} onChange={handleKpiToggle} />
                            <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dark-primary"></div>
                        </div>
                    </label>
                </div>
            </Card>
            
            {error && (
                <div className="mt-4 bg-red-500/10 text-red-400 p-3 rounded-lg text-sm font-semibold flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="font-bold text-xl">&times;</button>
                </div>
            )}

            <Modal isOpen={isFormOpen} onClose={() => setFormOpen(false)}>
                <StageForm initialData={editingStage} onSave={handleSave} onClose={() => setFormOpen(false)} />
            </Modal>
            
            <KpiVisibilityModal 
                isOpen={isKpiModalOpen}
                onClose={() => setKpiModalOpen(false)}
                onSave={handleSaveKpiVisibility}
                salespeople={companySalespeople}
                currentVisibility={kpiSettings.visible_to}
            />

            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setError(''); }}
                onConfirm={confirmDeletion}
                title="Confirmar Exclusão"
            >
                Você tem certeza que deseja excluir a etapa "{stageToDelete?.name}"? Esta ação não pode ser desfeita.
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={toggleConfirmOpen}
                onClose={() => setToggleConfirmOpen(false)}
                onConfirm={confirmToggleEnable}
                title="Confirmar Alteração"
                confirmButtonText={stageToToggle?.isEnabled ? "Sim, Desativar" : "Sim, Ativar"}
            >
                Você tem certeza que deseja {stageToToggle?.isEnabled ? 'DESATIVAR' : 'ATIVAR'} a etapa "{stageToToggle?.name}"?
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={isDisableConfirmOpen}
                onClose={() => setDisableConfirmOpen(false)}
                onConfirm={handleDisableKpi}
                title="Confirmar Desativação"
                confirmButtonText="Sim, Desativar KPI"
            >
                Desativar esta visualização removerá o card de KPI para todos os vendedores. Deseja continuar?
            </ConfirmationModal>
        </div>
    );
};

export default PipelineSettingsScreen;