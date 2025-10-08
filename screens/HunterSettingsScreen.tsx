import React, { useState, ChangeEvent, useEffect, useMemo } from 'react';
import { TeamMember } from '../types';
import Card from '../components/Card';
import { PlusIcon } from '../components/icons/PlusIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import Modal from '../components/Modal';
import { useData } from '../hooks/useMockData';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import * as XLSX from 'xlsx';
import { ClipboardListIcon } from '../components/icons/ClipboardListIcon';


interface HunterSettingsScreenProps {
    salespeople: TeamMember[];
    onBack: () => void;
    onUpdateSalesperson: (salesperson: TeamMember) => Promise<void>;
}

interface ParsedLead {
    nome: string;
    telefone: string;
}

const parseCSV = (content: string): ParsedLead[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const nameIndex = header.indexOf('nome') !== -1 ? header.indexOf('nome') : header.indexOf('name');
    const phoneIndex = header.indexOf('telefone') !== -1 ? header.indexOf('telefone') : header.indexOf('phone');

    if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error('Arquivo CSV inválido. As colunas "nome" e "telefone" (ou "name" e "phone") são obrigatórias.');
    }

    return lines.slice(1).map(line => {
        const values = line.split(',');
        return {
            nome: values[nameIndex]?.trim().replace(/"/g, ''),
            telefone: values[phoneIndex]?.trim().replace(/"/g, ''),
        };
    }).filter(item => item.nome && item.telefone);
};

const parseXLSX = (data: ArrayBuffer): ParsedLead[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

    const mappedLeads = json.map(row => ({
        nome: row.nome || row.name,
        telefone: String(row.telefone || row.phone || '')
    })).filter(lead => lead.nome && lead.telefone);

    if (mappedLeads.length === 0) {
        throw new Error('Nenhum lead válido encontrado. Verifique se a planilha possui as colunas "nome" e "telefone" (ou "name" e "phone").');
    }

    return mappedLeads;
};


const HunterSettingsScreen: React.FC<HunterSettingsScreenProps> = ({ salespeople, onBack, onUpdateSalesperson }) => {
    const { companies, uploadHunterLeads, hunterLeads, updateHunterLead } = useData();
    const [activeTab, setActiveTab] = useState<'access' | 'goals'>('access');
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState(1);
    const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
    const [assignments, setAssignments] = useState<Record<number, string>>({});
    const [isUploading, setIsUploading] = useState(false);

    const [isDatabaseModalOpen, setDatabaseModalOpen] = useState(false);
    const [dbAssignments, setDbAssignments] = useState<Record<string, string>>({});
    const [isSavingDistribution, setIsSavingDistribution] = useState(false);

    const [goals, setGoals] = useState<Record<string, { type: 'daily' | 'weekly' | 'monthly'; value: number }>>({});
    const [isSavingGoals, setIsSavingGoals] = useState(false);

    const activeHunters = useMemo(() => salespeople.filter(sp => sp.isHunterModeActive), [salespeople]);
    const unassignedLeads = useMemo(() => hunterLeads.filter(l => !l.salespersonId), [hunterLeads]);

    useEffect(() => {
        const initialGoals = salespeople.reduce((acc, sp) => {
            acc[sp.id] = sp.prospectAISettings?.hunter_goals || { type: 'monthly', value: 0 };
            return acc;
        }, {} as Record<string, { type: 'daily' | 'weekly' | 'monthly', value: number }>);
        setGoals(initialGoals);
    }, [salespeople]);

    const toggleAccess = async (salesperson: TeamMember) => {
        const updatedSalesperson = {
            ...salesperson,
            isHunterModeActive: !salesperson.isHunterModeActive,
        };
        await onUpdateSalesperson(updatedSalesperson);
    };

    const handleRequestLeads = () => {
        alert('(Simulação) Pedido de leads enviado aos administradores da Triad3.');
        setRequestModalOpen(false);
    };

    const handleDownloadTemplate = () => {
        const csvContent = "nome,telefone\nJoão da Silva,11987654321\nMaria Oliveira,21912345678";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "exemplo_leads.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                let leads: ParsedLead[] = [];
                if (file.name.endsWith('.csv')) {
                    leads = parseCSV(event.target?.result as string);
                } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                    leads = parseXLSX(event.target?.result as ArrayBuffer);
                } else {
                    throw new Error('Formato de arquivo não suportado. Use .csv, .xls ou .xlsx');
                }
                
                if (leads.length === 0) {
                    throw new Error('Nenhum lead válido encontrado no arquivo. Verifique o formato e o conteúdo.');
                }

                setParsedLeads(leads);
                setAssignments({});
                setUploadStep(2);

            } catch (err: any) {
                alert(`Erro ao processar arquivo: ${err.message}`);
            } finally {
                setIsUploading(false);
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
        
        e.target.value = '';
    };


    const handleCloseUploadModal = () => {
        setUploadModalOpen(false);
        setTimeout(() => {
            setUploadStep(1);
            setParsedLeads([]);
            setAssignments({});
            setIsUploading(false);
        }, 300);
    };
    
    const handleAssignLead = (leadIndex: number, salespersonId: string) => {
        setAssignments(prev => {
            const newAssignments = { ...prev };
            if (salespersonId) {
                newAssignments[leadIndex] = salespersonId;
            } else {
                delete newAssignments[leadIndex];
            }
            return newAssignments;
        });
    };

    const handleDistributeRemainingEvenly = () => {
        const unassignedLeadIndices = parsedLeads.map((_, index) => index).filter(index => !assignments[index]);
        const numToDistribute = unassignedLeadIndices.length;
        const numHunters = activeHunters.length;
        if (numHunters === 0 || numToDistribute === 0) return;

        const leadsPerHunter = Math.floor(numToDistribute / numHunters);
        let remainder = numToDistribute % numHunters;

        const newAssignments = { ...assignments };
        let unassignedIndex = 0;

        for (const hunter of activeHunters) {
            let numToAssign = leadsPerHunter + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;

            for (let i = 0; i < numToAssign; i++) {
                if (unassignedIndex < unassignedLeadIndices.length) {
                    const leadIndex = unassignedLeadIndices[unassignedIndex++];
                    newAssignments[leadIndex] = hunter.id;
                }
            }
        }
        setAssignments(newAssignments);
    };
    
    const assignedCounts = useMemo(() => {
        const counts = activeHunters.reduce((acc, sp) => {
            acc[sp.id] = 0;
            return acc;
        }, {} as Record<string, number>);

        Object.values(assignments).forEach(salespersonId => {
            if (counts.hasOwnProperty(salespersonId)) {
                counts[salespersonId]++;
            }
        });
        return counts;
    }, [assignments, activeHunters]);

    const totalDistributed = Object.keys(assignments).length;

    const handleConfirmDistribution = async () => {
        const companyId = salespeople[0]?.companyId;
        if (!companyId) {
            alert("Não foi possível identificar a empresa. Nenhum vendedor cadastrado.");
            return;
        }

        const activeCompany = companies.find(c => c.id === companyId);
        if (!activeCompany) {
            alert("Empresa não encontrada.");
            return;
        }
        const novosLeadsStage = activeCompany.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novosLeadsStage) {
            alert("Pipeline de prospecção não configurado para esta empresa. Etapa 'Novos Leads' não encontrada.");
            return;
        }

        setIsUploading(true);
        try {
            const leadsToUpload = parsedLeads.map((lead, index) => {
                const salespersonId = assignments[index] || null; // Atribui o ID ou nulo se não houver atribuição
                return {
                    company_id: companyId,
                    salesperson_id: salespersonId,
                    lead_name: lead.nome,
                    lead_phone: lead.telefone,
                    source: 'Base da Empresa',
                    stage_id: novosLeadsStage.id,
                };
            });
            
            if (leadsToUpload.length === 0) {
                alert("Nenhum lead para carregar.");
                setIsUploading(false);
                return;
            }
            
            await uploadHunterLeads(leadsToUpload);
            
            const assignedCount = Object.keys(assignments).length;
            const unassignedCount = leadsToUpload.length - assignedCount;

            let message = `${leadsToUpload.length} leads foram carregados com sucesso!`;
            if (unassignedCount > 0) {
                message += `\n${assignedCount} foram atribuídos e ${unassignedCount} aguardam distribuição.`;
            }

            alert(message);
            handleCloseUploadModal();

        } catch (err) {
            console.error("Error uploading hunter leads:", err);
            // The error from supabase already has a user-friendly message for RLS issues.
            const errorMessage = (err as any)?.message || 'Ocorreu um erro desconhecido.';
            alert(`Falha ao carregar leads: ${errorMessage}`);
        } finally {
            setIsUploading(false);
        }
    };


    const handleGoalChange = (salespersonId: string, field: 'type' | 'value', value: any) => {
        setGoals(prev => ({
            ...prev,
            [salespersonId]: {
                ...(prev[salespersonId] || { type: 'monthly', value: 0 }),
                [field]: field === 'value' ? (Number(value) >= 0 ? Number(value) : 0) : value,
            },
        }));
    };

    const handleSaveChanges = async () => {
        setIsSavingGoals(true);
        const updates: Promise<void>[] = [];

        salespeople.forEach(sp => {
            const newGoal = goals[sp.id];
            const oldGoal = sp.prospectAISettings?.hunter_goals;
            
            if (JSON.stringify(newGoal) !== JSON.stringify(oldGoal)) {
                 const updatedSalesperson: TeamMember = {
                    ...sp,
                    prospectAISettings: {
                        ...(sp.prospectAISettings || { deadlines: { initial_contact: { minutes: 60, auto_reassign_enabled: false, reassignment_mode: 'random', reassignment_target_id: null } } }),
                        hunter_goals: newGoal,
                    }
                };
                updates.push(onUpdateSalesperson(updatedSalesperson));
            }
        });

        try {
            await Promise.all(updates);
            if (updates.length > 0) {
                alert('Metas salvas com sucesso!');
            } else {
                alert('Nenhuma meta foi alterada.');
            }
        } catch (error) {
            console.error("Failed to save goals:", error);
            alert('Ocorreu um erro ao salvar as metas.');
        } finally {
            setIsSavingGoals(false);
        }
    };

    const handleDbAssignLead = (leadId: string, salespersonId: string) => {
        setDbAssignments(prev => ({ ...prev, [leadId]: salespersonId }));
    };

    const handleSaveDatabaseDistribution = async () => {
        const assignedLeads = Object.entries(dbAssignments);
        if (assignedLeads.length === 0) {
            alert("Nenhuma atribuição nova foi feita.");
            return;
        }
    
        setIsSavingDistribution(true);
        try {
            const updatePromises = assignedLeads.map(([leadId, salespersonId]) => 
                updateHunterLead(leadId, { salesperson_id: salespersonId })
            );
            await Promise.all(updatePromises);
            alert(`${assignedLeads.length} leads foram distribuídos com sucesso!`);
            setDatabaseModalOpen(false);
            setDbAssignments({});
        } catch (err) {
            console.error("Error distributing leads:", err);
            alert("Ocorreu um erro ao distribuir os leads. Verifique o console para mais detalhes.");
        } finally {
            setIsSavingDistribution(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                        &larr; Voltar para Configurações
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Modo de Prospecção Ativa (Hunter)</h1>
                </div>
            </header>

            <div className="border-b border-dark-border mb-6">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('access')} className={`py-2 px-4 text-sm font-semibold border-b-2 ${activeTab === 'access' ? 'text-dark-primary border-dark-primary' : 'text-dark-secondary border-transparent hover:border-dark-border'}`}>
                        Acesso e Distribuição
                    </button>
                    <button onClick={() => setActiveTab('goals')} className={`py-2 px-4 text-sm font-semibold border-b-2 ${activeTab === 'goals' ? 'text-dark-primary border-dark-primary' : 'text-dark-secondary border-transparent hover:border-dark-border'}`}>
                        Metas de Prospecção
                    </button>
                </nav>
            </div>

            {activeTab === 'access' && (
                <div className="space-y-8">
                    <Card className="p-6">
                        <h3 className="text-xl font-bold text-dark-text mb-2">Abastecimento de Leads</h3>
                        <p className="text-sm text-dark-secondary mb-4">Solicite leads qualificados da nossa base ou suba sua própria lista para distribuição.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button onClick={() => setRequestModalOpen(true)} className="p-4 bg-dark-background border border-dark-border rounded-lg text-left hover:border-dark-primary">
                                <PlusIcon className="w-6 h-6 text-dark-primary mb-2" />
                                <h4 className="font-bold">Solicitar Leads Triad3</h4>
                                <p className="text-xs text-dark-secondary">Peça uma nova lista de leads para nossa equipe.</p>
                            </button>
                            <button onClick={() => setUploadModalOpen(true)} className="p-4 bg-dark-background border border-dark-border rounded-lg text-left hover:border-dark-primary">
                                <UploadIcon className="w-6 h-6 text-dark-primary mb-2" />
                                <h4 className="font-bold">Subir Base de Dados</h4>
                                <p className="text-xs text-dark-secondary">Faça o upload de um arquivo .csv, .xls ou .xlsx.</p>
                            </button>
                            <button onClick={() => setDatabaseModalOpen(true)} className="p-4 bg-dark-background border border-dark-border rounded-lg text-left hover:border-dark-primary">
                                <ClipboardListIcon className="w-6 h-6 text-dark-primary mb-2" />
                                <h4 className="font-bold">Minha Base de Dados</h4>
                                <p className="text-xs text-dark-secondary">Visualize e distribua os leads que você subiu.</p>
                            </button>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <h3 className="text-xl font-bold text-dark-text mb-2">Acesso dos Vendedores</h3>
                        <p className="text-sm text-dark-secondary mb-4">Habilite ou desabilite o modo Hunter para cada vendedor da sua equipe.</p>
                        <div className="space-y-3">
                            {salespeople.map(sp => (
                                <div key={sp.id} className="flex items-center justify-between p-3 bg-dark-background rounded-lg border border-dark-border">
                                    <div className="flex items-center gap-3">
                                        <img src={sp.avatarUrl} alt={sp.name} className="w-10 h-10 rounded-full" />
                                        <span className="font-semibold">{sp.name}</span>
                                    </div>
                                    <label htmlFor={`toggle-hunter-${sp.id}`} className="cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" id={`toggle-hunter-${sp.id}`} className="sr-only peer" checked={sp.isHunterModeActive || false} onChange={() => toggleAccess(sp)} />
                                            <div className="w-11 h-6 bg-dark-border rounded-full peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dark-primary"></div>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
            
            {activeTab === 'goals' && (
                <Card className="p-6">
                    <h3 className="text-xl font-bold text-dark-text mb-2">Metas de Prospecção</h3>
                    <p className="text-sm text-dark-secondary mb-4">Defina metas diárias, semanais ou mensais. Metas mensais serão automaticamente divididas por semana para o vendedor.</p>
                    <div className="space-y-4">
                        {salespeople.map(sp => {
                            const spGoal = goals[sp.id] || { type: 'monthly', value: 0 };
                            return (
                                <div key={sp.id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-3 bg-dark-background rounded-lg border border-dark-border">
                                    <div className="flex items-center gap-3">
                                        <img src={sp.avatarUrl} alt={sp.name} className="w-10 h-10 rounded-full" />
                                        <span className="font-semibold">{sp.name}</span>
                                    </div>
                                    <select
                                        className="input-style"
                                        value={spGoal.type}
                                        onChange={(e) => handleGoalChange(sp.id, 'type', e.target.value)}
                                    >
                                        <option value="monthly">Meta Mensal</option>
                                        <option value="weekly">Meta Semanal</option>
                                        <option value="daily">Meta Diária</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Nº de prospecções"
                                        className="input-style"
                                        value={spGoal.value || ''}
                                        onChange={(e) => handleGoalChange(sp.id, 'value', e.target.value)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex justify-end mt-6 pt-4 border-t border-dark-border">
                        <button onClick={handleSaveChanges} disabled={isSavingGoals} className="px-6 py-2.5 bg-dark-primary text-dark-background font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                            {isSavingGoals ? 'Salvando...' : 'Salvar Metas'}
                        </button>
                    </div>
                </Card>
            )}

            <Modal isOpen={isRequestModalOpen} onClose={() => setRequestModalOpen(false)}>
                <div className="p-4">
                    <h2 className="text-2xl font-bold text-center mb-4">Solicitar Leads</h2>
                    <p className="text-center text-dark-secondary mb-6">Quantos leads você gostaria de solicitar para a sua equipe Hunter?</p>
                    <input type="number" placeholder="Ex: 50" className="w-full input-style text-center text-lg" />
                    <div className="flex justify-end gap-3 pt-6">
                        <button onClick={() => setRequestModalOpen(false)} className="px-4 py-2 rounded-md bg-dark-border/50 hover:bg-dark-border">Cancelar</button>
                        <button onClick={handleRequestLeads} className="px-4 py-2 rounded-md bg-dark-primary text-dark-background font-bold">Enviar Pedido</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDatabaseModalOpen} onClose={() => setDatabaseModalOpen(false)} fullScreen>
                <div className="h-full flex flex-col">
                    <div className="flex-shrink-0">
                        <h2 className="text-2xl font-bold text-center mb-2">Base de Dados</h2>
                        <p className="text-center text-dark-secondary mb-6">
                            Você possui <strong className="text-dark-text">{unassignedLeads.length}</strong> leads não atribuídos.
                        </p>
                    </div>
                    {unassignedLeads.length > 0 ? (
                        <>
                            <div className="flex-grow overflow-y-auto pr-2">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-dark-card/80 backdrop-blur-sm">
                                        <tr>
                                            <th className="p-2">#</th>
                                            <th className="p-2">Nome</th>
                                            <th className="p-2">Telefone</th>
                                            <th className="p-2 w-48">Atribuir Para</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unassignedLeads.map((lead, index) => (
                                            <tr key={lead.id} className="border-b border-dark-border">
                                                <td className="p-2 text-dark-secondary">{index + 1}</td>
                                                <td className="p-2 font-medium">{lead.leadName}</td>
                                                <td className="p-2 text-dark-secondary">{lead.leadPhone}</td>
                                                <td className="p-2">
                                                    <select
                                                        className="input-style text-xs w-full"
                                                        value={dbAssignments[lead.id] || ''}
                                                        onChange={(e) => handleDbAssignLead(lead.id, e.target.value)}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {activeHunters.map(sp => (
                                                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3 pt-4 mt-4 border-t border-dark-border">
                                <button onClick={() => setDatabaseModalOpen(false)} className="btn-secondary">Fechar</button>
                                <button onClick={handleSaveDatabaseDistribution} disabled={isSavingDistribution} className="btn-primary">
                                    {isSavingDistribution ? 'Salvando...' : 'Salvar Distribuição'}
                                </button>
                            </div>
                        </>
                    ) : (
                         <div className="flex-grow flex items-center justify-center">
                            <p className="text-center text-dark-secondary py-8">Todos os leads da sua base já foram distribuídos.</p>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isUploadModalOpen} onClose={handleCloseUploadModal} fullScreen>
                <div className="h-full flex flex-col">
                {uploadStep === 1 && (
                     <div className="p-4 flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full">
                        <h2 className="text-2xl font-bold text-center mb-4">Subir Base de Dados</h2>
                        <p className="text-center text-dark-secondary mb-6">Faça o upload de um arquivo .csv, .xls ou .xlsx com as colunas: `nome`, `telefone`.</p>
                        <button onClick={handleDownloadTemplate} className="w-full mb-4 flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-dark-border/50 hover:bg-dark-border transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                            Baixar Planilha Exemplo (.csv)
                        </button>
                        <div className="w-full h-32 flex items-center justify-center bg-dark-background border-2 border-dashed border-dark-border rounded-md">
                            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2 text-dark-secondary">
                            <UploadIcon className="w-8 h-8"/>
                            <span>Clique para selecionar o arquivo</span>
                            </label>
                            <input id="csv-upload" type="file" className="sr-only" accept=".csv,.xls,.xlsx" onChange={handleFileUpload} disabled={isUploading} />
                        </div>
                        {isUploading && <p className="text-center text-dark-primary mt-4">Processando arquivo...</p>}
                    </div>
                )}
                {uploadStep === 2 && (
                    <div className="flex-grow flex flex-col">
                        <div className="flex-shrink-0">
                            <h2 className="text-2xl font-bold text-center mb-2">Distribuição de Leads</h2>
                            <p className="text-center text-dark-secondary mb-6">
                                Você carregou <strong className="text-dark-text">{parsedLeads.length}</strong> leads. Atribua-os agora ou confirme para salvá-los e distribuir mais tarde.
                            </p>
                            
                            <div className="bg-dark-background p-3 rounded-lg border border-dark-border mb-4">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    {activeHunters.map(sp => (
                                        <div key={sp.id} className="flex items-center gap-2 text-sm">
                                            <img src={sp.avatarUrl} alt={sp.name} className="w-6 h-6 rounded-full" />
                                            <span>{sp.name.split(' ')[0]}:</span>
                                            <span className="font-bold text-dark-primary">{assignedCounts[sp.id] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                                 <p className="text-center font-bold text-sm mt-2 pt-2 border-t border-dark-border">Total Atribuído: {totalDistributed} / {parsedLeads.length}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <button onClick={handleDistributeRemainingEvenly} className="btn-secondary text-xs">Distribuir Restantes Igualmente</button>
                                <button onClick={() => setAssignments({})} className="btn-secondary text-xs">Limpar Atribuições</button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto pr-2">
                             <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-dark-card/80 backdrop-blur-sm">
                                    <tr>
                                        <th className="p-2">#</th>
                                        <th className="p-2">Nome</th>
                                        <th className="p-2">Telefone</th>
                                        <th className="p-2 w-48">Atribuir Para</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedLeads.map((lead, index) => (
                                        <tr key={index} className="border-b border-dark-border">
                                            <td className="p-2 text-dark-secondary">{index + 1}</td>
                                            <td className="p-2 font-medium">{lead.nome}</td>
                                            <td className="p-2 text-dark-secondary">{lead.telefone}</td>
                                            <td className="p-2">
                                                <select
                                                    className="input-style text-xs w-full"
                                                    value={assignments[index] || ''}
                                                    onChange={(e) => handleAssignLead(index, e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {activeHunters.map(sp => (
                                                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3 pt-4 mt-4 border-t border-dark-border">
                             <button onClick={handleCloseUploadModal} className="btn-secondary">Cancelar</button>
                             <button onClick={handleConfirmDistribution} disabled={isUploading} className="btn-primary">
                                {isUploading ? 'Carregando...' : `Confirmar e Carregar ${parsedLeads.length} Leads`}
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </Modal>
            
            <style>{`
                .input-style { width: 100%; padding: 0.5rem 0.75rem; background-color: #0A0F1E; border: 1px solid #243049; border-radius: 0.375rem; color: #E0E0E0; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #00D1FF; color: #0A0F1E; font-weight: bold; transition: opacity 0.2s; }
                .btn-primary:hover { opacity: 0.9; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #243049; color: #E0E0E0; font-weight: bold; transition: background-color 0.2s; }
                .btn-secondary:hover { background-color: #3e4c6e; }
            `}</style>
        </div>
    );
};

export default HunterSettingsScreen;