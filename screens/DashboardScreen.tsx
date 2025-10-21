

import React, { useState, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import { useData } from '../hooks/useMockData';
import { Vehicle, TeamMember, Company, ProspectAILead, HunterLead } from '../types';
import KpiCard from '../components/KpiCard';
import VehicleCard from '../components/VehicleCard';
import TaskListCard from '../components/TaskListCard';
import { getDaysInStock } from '../utils/dateUtils';
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
import { CogIcon } from '../components/icons/CogIcon';
import ProspectAISettingsScreen from './ProspectAISettingsScreen';
import PipelineSettingsScreen from './PipelineSettingsScreen';
import HunterSettingsScreen from './HunterSettingsScreen';
import CompanyProspectPerformanceScreen from './CompanyProspectPerformanceScreen';
import { BullseyeIcon } from '../components/icons/BullseyeIcon';
import GoalSettingsScreen from './GoalSettingsScreen';
import BusinessHoursSettingsScreen from './BusinessHoursSettingsScreen';
import { CarIcon } from '../components/icons/CarIcon';
import { DollarSignIcon } from '../components/icons/DollarSignIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import Card from '../components/Card';
import { ToolboxIcon } from '../components/icons/ToolboxIcon';
import ToolboxViewer from '../components/ToolboxViewer';
import { CrosshairIcon } from '../components/icons/CrosshairIcon';
import HunterScreen from './HunterScreen';
import { LiveIcon } from '../components/icons/LiveIcon';
import { DocumentTextIcon, DownloadIcon, UploadIcon } from '../components/icons';
import * as XLSX from 'xlsx';
import RelatoriosScreen from './RelatoriosScreen';
// @-fix: Import 'LiveAgentConfigScreen' to resolve the "Cannot find name" error.
import LiveAgentConfigScreen from './LiveAgentConfigScreen';

interface DashboardScreenProps {
  onLogout: () => void;
  companyId: string;
}

interface ParsedLead {
    nome: string;
    telefone: string;
}

const parseSpreadsheet = (data: string | ArrayBuffer, type: 'string' | 'array'): ParsedLead[] => {
    const findValueByKey = (obj: any, keys: string[]): string => {
        const lowerCaseKeys = keys.map(k => k.toLowerCase());
        for (const key in obj) {
            if (lowerCaseKeys.includes(key.toLowerCase())) {
                return String(obj[key] || "").trim();
            }
        }
        return "";
    };

    const workbook = XLSX.read(data, { type });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error("Nenhuma planilha encontrada no arquivo.");
    }
    const worksheet = workbook.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const mappedLeads = json.map(row => {
        const nome = findValueByKey(row, ['nome', 'name']);
        const telefone = findValueByKey(row, ['telefone', 'phone']);
        return { nome, telefone };
    }).filter(lead => lead.nome && lead.telefone);

    if (mappedLeads.length === 0) {
        throw new Error('Nenhum lead válido encontrado. Verifique se a planilha possui colunas de nome e telefone (variações como "NOME", "Name", "TELEFONE", "Phone" são aceitas) e se não está vazia.');
    }
    
    return mappedLeads;
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onLogout, companyId }) => {
    const {
        companies, vehicles, teamMembers, reminders, notifications, prospectaiLeads, hunterLeads,
        markNotificationAsRead, addVehicle, updateVehicle, deleteVehicle, markVehicleAsSold,
        assignSalesperson, toggleVehiclePriority, updateCompany, deleteTeamMember, toggleVehicleAdStatus,
        updateTeamMember, toolboxUrl, uploadHunterLeads,
    } = useData();
    
    const activeCompany = useMemo(() => companies.find(c => c.id === companyId), [companies, companyId]);
    const features = activeCompany?.enabledFeatures || [];
    const isProspectOnly = features.includes('prospectai') && !features.includes('estoque_inteligente');

    // State
    const [view, setView] = useState<'dashboard' | 'sales_analysis' | 'prospect_analysis' | 'lembrai' | 'prospectai' | 'prospectai_settings' | 'pipeline_settings' | 'hunter_settings' | 'goal_settings' | 'business_hours_settings' | 'live_agent_config' | 'relatorios' | 'prospect_automations'>(isProspectOnly ? 'prospectai' : 'dashboard');
    const [stockView, setStockView] = useState<'available' | 'sold'>('available');
    const [isCompanyFormOpen, setCompanyFormOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isVehicleFormOpen, setVehicleFormOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
    const [isAssignModalOpen, setAssignModalOpen] = useState(false);
    const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
    const [isMarketingModalOpen, setMarketingModalOpen] = useState(false);
    const [isTeamManagementOpen, setTeamManagementOpen] = useState(false);
    const [isDeleteTeamMemberConfirmOpen, setDeleteTeamMemberConfirmOpen] = useState(false);
    const [deletingTeamMemberId, setDeletingTeamMemberId] = useState<string | null>(null);
    const [isSalespersonSettingsOpen, setSalespersonSettingsOpen] = useState(false);
    const [selectedSalespersonForSettings, setSelectedSalespersonForSettings] = useState<TeamMember | null>(null);

    const [filters, setFilters] = useState<AdvancedFilters>({
        salespersonIds: [],
        stockDays: [],
        priceRanges: [],
        modelNames: [],
    });
    const [isOverdueFilterActive, setOverdueFilterActive] = useState(false);
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<string | null>(null);
    const [isPriorityFilterActive, setPriorityFilterActive] = useState(false);
    const [highlightedVehicleId, setHighlightedVehicleId] = useState<string | null>(null);
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [selectedProspectSalesperson, setSelectedProspectSalesperson] = useState<TeamMember | null>(null);
    const [pipelineView, setPipelineView] = useState<'farm' | 'hunter' | null>(null);
    const [isToolboxOpen, setIsToolboxOpen] = useState(false);
    const [isProspectSettingsOpen, setIsProspectSettingsOpen] = useState(false);
    const prospectSettingsRef = useRef<HTMLDivElement>(null);

    // State for Hunter Lead Upload
    const [isUploadHunterModalOpen, setUploadHunterModalOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState(1);
    const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
    const [assignments, setAssignments] = useState<Record<number, string>>({});
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (prospectSettingsRef.current && !prospectSettingsRef.current.contains(event.target as Node)) {
                setIsProspectSettingsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    // Memoized data
    const companyVehicles = useMemo(() => vehicles.filter(v => v.companyId === companyId), [vehicles, companyId]);
    const companySalespeople = useMemo(() => teamMembers.filter(tm => tm.companyId === companyId && tm.role === 'Vendedor'), [teamMembers, companyId]);
    const userNotifications = useMemo(() => notifications.filter(n => n.recipientRole === 'company'), [notifications]);
    
    const vehiclesInStock = useMemo(() => companyVehicles.filter(v => v.status === 'available'), [companyVehicles]);
    const vehiclesSold = useMemo(() => companyVehicles.filter(v => v.status === 'sold'), [companyVehicles]);
    
    const activeHunters = useMemo(() => companySalespeople.filter(sp => sp.isHunterModeActive), [companySalespeople]);

    const vehiclesToDisplay = useMemo(() => {
        let baseVehicles = stockView === 'available' ? vehiclesInStock : vehiclesSold;

        if (selectedSalespersonId) {
            baseVehicles = baseVehicles.filter(v => v.salespersonId === selectedSalespersonId);
        }

        let filtered = [...baseVehicles];

        if (isOverdueFilterActive) {
            filtered = filtered.filter(v => getDaysInStock(v.entryDate) > 30);
        }

        if (isPriorityFilterActive) {
            filtered = filtered.filter(v => v.isPriority);
            if (highlightedVehicleId) {
                const highlighted = filtered.find(v => v.id === highlightedVehicleId);
                if (highlighted) {
                    return [highlighted, ...filtered.filter(v => v.id !== highlightedVehicleId)];
                }
            }
        }
        
        const { salespersonIds, stockDays, priceRanges, modelNames } = filters;
        if(salespersonIds.length > 0) {
            filtered = filtered.filter(v => (v.salespersonId && salespersonIds.includes(v.salespersonId)) || (!v.salespersonId && salespersonIds.includes('unassigned')))
        }
        if(modelNames.length > 0) {
            filtered = filtered.filter(v => modelNames.includes(v.model));
        }
        if (stockDays.length > 0) {
            filtered = filtered.filter(v => {
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
            filtered = filtered.filter(v => {
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

        return filtered.sort((a,b) => (b.isPriority ? 1 : -1) - (a.isPriority ? 1 : -1) || new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    }, [stockView, vehiclesInStock, vehiclesSold, selectedSalespersonId, isOverdueFilterActive, isPriorityFilterActive, highlightedVehicleId, filters]);

    const priorityVehicles = useMemo(() => vehiclesInStock.filter(v => v.isPriority), [vehiclesInStock]);
    const totalStockValue = useMemo(() => vehiclesInStock.reduce((sum, v) => sum + v.announcedPrice, 0), [vehiclesInStock]);
    const totalMonthlyGoal = useMemo(() => companySalespeople.reduce((sum, sp) => sum + sp.monthlySalesGoal, 0), [companySalespeople]);

    // Handlers
    const handleAddVehicle = () => { setEditingVehicle(undefined); setVehicleFormOpen(true); };
    const handleEditVehicle = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setVehicleFormOpen(true); };
    const handleDeleteRequest = (id: string) => { setDeletingVehicleId(id); setDeleteConfirmOpen(true); };
    const confirmDeletion = () => { if (deletingVehicleId) { deleteVehicle(deletingVehicleId); } setDeleteConfirmOpen(false); setDeletingVehicleId(null); };
    const handleAssign = (vehicle: Vehicle) => { setAssigningVehicle(vehicle); setAssignModalOpen(true); };
    const confirmAssignment = (salespersonId: string | null) => { if (assigningVehicle) { assignSalesperson(assigningVehicle.id!, salespersonId); } setAssignModalOpen(false); };
    const handlePriorityFilterToggle = () => { setPriorityFilterActive(prev => !prev); setHighlightedVehicleId(null); };
    const handlePriorityItemClick = (vehicleId: string) => { setPriorityFilterActive(true); setHighlightedVehicleId(vehicleId); };
    const handleDeleteMemberRequest = (id: string) => { setDeletingTeamMemberId(id); setDeleteTeamMemberConfirmOpen(true); };
    const confirmDeleteMember = () => { if (deletingTeamMemberId) { deleteTeamMember(deletingTeamMemberId); } setDeleteTeamMemberConfirmOpen(false); setDeletingTeamMemberId(null); };
    
    const handleSalespersonSelect = (salesperson: TeamMember) => {
        setSelectedProspectSalesperson(salesperson);
        setPipelineView('farm'); // Go directly to the Farm view
    };
    const handleBackToSalespersonList = () => {
        setSelectedProspectSalesperson(null);
        setPipelineView(null);
    };

    // Hunter Upload Handlers
    const handleCloseUploadModal = () => {
        setUploadHunterModalOpen(false);
        setTimeout(() => {
            setUploadStep(1);
            setParsedLeads([]);
            setAssignments({});
            setIsUploading(false);
        }, 300);
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        reader.onload = async (event) => {
            try {
                if (!event.target?.result) {
                    throw new Error("Não foi possível ler o arquivo.");
                }
                
                const leads = parseSpreadsheet(event.target.result, fileExtension === 'csv' ? 'string' : 'array');
                
                setParsedLeads(leads);
                setAssignments({});
                setUploadStep(2);

            } catch (err: any) {
                alert(`Erro ao processar arquivo: ${err.message}`);
            } finally {
                setIsUploading(false);
            }
        };

        if (fileExtension === 'csv') {
            reader.readAsText(file);
        } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
            reader.readAsArrayBuffer(file);
        } else {
            alert("Formato de arquivo não suportado. Use .csv, .xls ou .xlsx");
            setIsUploading(false);
            return;
        }
        
        e.target.value = '';
    };

    const handleAssignLead = (leadIndex: number, salespersonId: string) => {
        setAssignments(prev => {
            const newAssignments = { ...prev };
            if (salespersonId) newAssignments[leadIndex] = salespersonId;
            else delete newAssignments[leadIndex];
            return newAssignments;
        });
    };

    const handleDistributeRemainingEvenly = () => {
        const unassignedLeadIndices = parsedLeads.map((_, index) => index).filter(index => !assignments[index]);
        if (activeHunters.length === 0 || unassignedLeadIndices.length === 0) return;

        const newAssignments = { ...assignments };
        unassignedLeadIndices.forEach((leadIndex, i) => {
            newAssignments[leadIndex] = activeHunters[i % activeHunters.length].id;
        });
        setAssignments(newAssignments);
    };

    const assignedCounts = useMemo(() => {
        const counts = activeHunters.reduce((acc, sp) => ({ ...acc, [sp.id]: 0 }), {} as Record<string, number>);
        Object.values(assignments).forEach(spId => { if (counts[spId] !== undefined) counts[spId]++; });
        return counts;
    }, [assignments, activeHunters]);

    const totalDistributed = Object.keys(assignments).length;

    const handleConfirmDistribution = async () => {
        if (!activeCompany) return;
        const novosLeadsStage = activeCompany.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novosLeadsStage) {
            alert("Pipeline de prospecção não configurado. Etapa 'Novos Leads' não encontrada.");
            return;
        }

        setIsUploading(true);
        try {
            const leadsToUpload = parsedLeads.map((lead, index) => ({
                company_id: companyId,
                salesperson_id: assignments[index] || null,
                lead_name: lead.nome,
                lead_phone: lead.telefone,
                source: 'Base da Empresa' as const,
                stage_id: novosLeadsStage.id,
            }));
            
            await uploadHunterLeads(leadsToUpload);
            alert(`${leadsToUpload.length} leads foram carregados com sucesso!`);
            handleCloseUploadModal();
        } catch (err) {
            alert(`Falha ao carregar leads: ${(err as Error).message}`);
        } finally {
            setIsUploading(false);
        }
    };
     const handleDownloadTemplate = () => {
        const csvContent = "\uFEFFnome,telefone\nJoão da Silva,11987654321\nMaria Oliveira,21912345678";
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

    if (!activeCompany) return <div>Carregando...</div>;

    const ProspectAutomationsScreen = () => (
        <div className="animate-fade-in">
            <button onClick={() => setView('prospectai')} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-6">
                &larr; Voltar para Visão Geral
            </button>
            <h1 className="text-3xl font-bold text-dark-text mb-2">Prazos e Automações (Farm)</h1>
            <p className="text-dark-secondary mb-8">Selecione um vendedor para configurar os prazos de atendimento e as regras de remanejamento automático para os leads que ele recebe.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {companySalespeople.map(salesperson => (
                    <Card key={salesperson.id} onClick={() => { setSelectedSalespersonForSettings(salesperson); setView('prospectai_settings'); }}
                        className="p-6 rounded-2xl text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary bg-dark-card-active border-transparent border-2">
                        <img src={salesperson.avatarUrl} alt={salesperson.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-dark-border"/>
                        <h4 className="font-bold text-lg text-dark-text">{salesperson.name}</h4>
                        <p className="text-sm text-dark-secondary">{salesperson.role}</p>
                    </Card>
                ))}
                {companySalespeople.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-dark-card/50 rounded-2xl border border-dark-border">
                        <h3 className="text-xl font-bold text-dark-text">Nenhum Vendedor Encontrado</h3>
                        <p className="text-dark-secondary mt-2">Cadastre vendedores na seção "Gerenciar Equipe" para configurar suas automações.</p>
                    </div>
                )}
            </div>
        </div>
    );
    
    // Sub-screen rendering
    if (view === 'sales_analysis') return <SalesAnalysisScreen company={activeCompany} salespeople={companySalespeople} vehicles={vehiclesSold} updateCompany={updateCompany} updateSalesperson={() => {}} onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} />;
    if (view === 'lembrai') return <LembrAIScreen onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} companyId={companyId} />;
    if (view === 'prospect_analysis') return <CompanyProspectPerformanceScreen company={activeCompany} salespeople={companySalespeople} prospectaiLeads={prospectaiLeads.filter(l => l.companyId === companyId)} hunterLeads={hunterLeads.filter(l => l.companyId === companyId)} onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} />;
    if (view === 'prospect_automations') return <ProspectAutomationsScreen />;
    if (view === 'prospectai_settings' && selectedSalespersonForSettings) return <ProspectAISettingsScreen salesperson={selectedSalespersonForSettings} onBack={() => { setView('prospect_automations'); setSelectedSalespersonForSettings(null); }} />;
    if (view === 'pipeline_settings') return <PipelineSettingsScreen companyId={companyId} onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} />;
    if (view === 'hunter_settings') return <HunterSettingsScreen salespeople={teamMembers.filter(tm => tm.companyId === companyId)} onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} onUpdateSalesperson={updateTeamMember} />;
    if (view === 'goal_settings') return <GoalSettingsScreen companyId={companyId} onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} />;
    if (view === 'business_hours_settings') return <BusinessHoursSettingsScreen companyId={companyId} onBack={() => setView(isProspectOnly ? 'prospectai' : 'dashboard')} />;
    if (view === 'live_agent_config') return <LiveAgentConfigScreen companyId={companyId} onBack={() => setView('prospectai')} />;
    if (view === 'relatorios') return <RelatoriosScreen companyId={companyId} onBack={() => setView('prospectai')} />;

    if (view === 'prospectai') {
        if (selectedProspectSalesperson) {
            if (pipelineView === 'farm') {
                return (
                    <ProspectAIScreen 
                        user={selectedProspectSalesperson}
                        onBack={handleBackToSalespersonList}
                        onSwitchToHunter={selectedProspectSalesperson.isHunterModeActive ? () => setPipelineView('hunter') : undefined}
                        onLogout={onLogout}
                        showBackButton={true}
                        isManagerView={true}
                        allSalespeople={companySalespeople}
                    />
                );
            }
            if (pipelineView === 'hunter' && selectedProspectSalesperson.isHunterModeActive) {
                return (
                    <HunterScreen
                        user={selectedProspectSalesperson}
                        activeCompany={activeCompany}
                        onBack={() => setPipelineView('farm')}
                        isManagerView={true}
                    />
                );
            }
        }
        
        const btnHeaderStyle = "flex items-center gap-2 bg-dark-card border border-dark-border px-3 py-2 rounded-lg hover:border-dark-primary transition-colors font-medium text-sm";
        const dropdownItemStyle = "block w-full text-left px-4 py-2 text-sm text-dark-text hover:bg-dark-border/50 rounded-md cursor-pointer";

        return (
            <>
                <header className="flex justify-between items-center mb-8">
                    <div>
                        {/* Title will be inside the view */}
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell notifications={userNotifications} onMarkAsRead={markNotificationAsRead} />
                        <UserProfileDropdown company={activeCompany} onEditProfile={() => setCompanyFormOpen(true)} onChangePassword={() => setChangePasswordModalOpen(true)} onLogout={onLogout} onManageTeam={() => setTeamManagementOpen(true)} />
                    </div>
                </header>
                <div className="animate-fade-in">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Pipeline de Prospecção - Visão Geral</h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => setView('relatorios')} className={btnHeaderStyle}>
                                <DocumentTextIcon className="w-4 h-4" />
                                Relatórios Diários
                            </button>
                            <button onClick={() => setView('prospect_analysis')} className={btnHeaderStyle}><BullseyeIcon className="w-4 h-4" />Análise de Prospecção</button>
                            <button onClick={() => setView('live_agent_config')} className={btnHeaderStyle}>
                                <LiveIcon className="w-4 h-4" />
                                Configurar Agente LIVE
                            </button>
                            {toolboxUrl && <button onClick={() => setIsToolboxOpen(true)} className={btnHeaderStyle}><ToolboxIcon className="w-4 h-4" />ToolBox Triad3</button>}
                            <div className="relative" ref={prospectSettingsRef}>
                                <button onClick={() => setIsProspectSettingsOpen(prev => !prev)} className={btnHeaderStyle}><CogIcon className="w-4 h-4" />Configurar ProspectAI</button>
                                {isProspectSettingsOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-60 bg-dark-card border border-dark-border rounded-lg shadow-lg z-10 p-2">
                                        <a onClick={() => { setView('pipeline_settings'); setIsProspectSettingsOpen(false); }} className={dropdownItemStyle}>Editor de Pipeline (Farm)</a>
                                        <a onClick={() => { setView('prospect_automations'); setIsProspectSettingsOpen(false); }} className={dropdownItemStyle}>Prazos e Automações</a>
                                        <a onClick={() => { setView('hunter_settings'); setIsProspectSettingsOpen(false); }} className={dropdownItemStyle}>Modo Hunter</a>
                                        <a onClick={() => { setView('goal_settings'); setIsProspectSettingsOpen(false); }} className={dropdownItemStyle}>Metas</a>
                                        <a onClick={() => { setView('business_hours_settings'); setIsProspectSettingsOpen(false); }} className={dropdownItemStyle}>Horário de Funcionamento</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <p className="mb-8 text-dark-secondary">Selecione um vendedor para visualizar seu pipeline individual.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {companySalespeople.map(salesperson => (
                            <Card key={salesperson.id} onClick={() => handleSalespersonSelect(salesperson)} 
                                className="p-6 rounded-2xl text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:border-dark-primary bg-dark-card-active border-transparent border-2">
                                <img src={salesperson.avatarUrl} alt={salesperson.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-dark-border"/>
                                <h4 className="font-bold text-lg text-dark-text">{salesperson.name}</h4>
                                <p className="text-sm text-dark-secondary">{salesperson.role}</p>
                            </Card>
                        ))}
                    </div>
                    {isToolboxOpen && toolboxUrl && (
                        <ToolboxViewer url={toolboxUrl} onClose={() => setIsToolboxOpen(false)} />
                    )}
                </div>
                 <Modal isOpen={isCompanyFormOpen} onClose={() => setCompanyFormOpen(false)}><CompanyForm initialData={activeCompany} onClose={() => setCompanyFormOpen(false)} /></Modal>
                <Modal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}><ChangePasswordForm onClose={() => setChangePasswordModalOpen(false)} /></Modal>
                <Modal isOpen={isTeamManagementOpen} onClose={() => setTeamManagementOpen(false)} maxWidthClass="max-w-3xl"><SalesTeamManagement teamMembers={teamMembers.filter(tm => tm.companyId === companyId)} onClose={() => setTeamManagementOpen(false)} onDeleteMember={handleDeleteMemberRequest} companyId={companyId} /></Modal>
            </>
        )
    }


    return (
        <div className="container mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">{activeCompany.name}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationBell notifications={userNotifications} onMarkAsRead={markNotificationAsRead} />
                    <UserProfileDropdown company={activeCompany} onEditProfile={() => setCompanyFormOpen(true)} onChangePassword={() => setChangePasswordModalOpen(true)} onLogout={onLogout} onManageTeam={() => setTeamManagementOpen(true)} />
                </div>
            </header>

            <FilterBar 
                onAddVehicle={handleAddVehicle} 
                onOpenSalesAnalysis={() => setView('sales_analysis')}
                onOpenProspectAnalysis={() => setView('prospect_analysis')}
                onOpenMarketingModal={() => setMarketingModalOpen(true)}
                onOpenLembrAI={() => setView('lembrai')}
                onOpenProspectAI={() => setView('prospectai')}
                onUploadHunterLeads={() => setUploadHunterModalOpen(true)}
                salespeople={companySalespeople} 
                vehicles={vehiclesInStock}
                isOverdueFilterActive={isOverdueFilterActive}
                onOverdueFilterToggle={() => setOverdueFilterActive(prev => !prev)}
                onAdvancedFilterChange={setFilters}
                activeAdvancedFiltersCount={Object.values(filters).reduce((acc: number, val) => acc + (Array.isArray(val) ? val.length : 0), 0)}
                selectedSalespersonId={selectedSalespersonId}
                onSalespersonSelect={setSelectedSalespersonId}
                stockView={stockView}
                onStockViewChange={setStockView}
                enabledFeatures={features}
                showAddVehicle={features.includes('estoque_inteligente')}
                showSalesAnalysis={features.includes('estoque_inteligente')}
                showMarketing={features.includes('marketing')}
                showLembrAI={features.includes('estoque_inteligente')}
                showProspectAI={features.includes('prospectai')}
                showUploadHunterLeads={features.includes('prospectai')}
                showStockViewToggle={features.includes('estoque_inteligente')}
            />
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KpiCard title="Veículos em Estoque" value={vehiclesInStock.length.toString()} icon={<CarIcon />} />
                        <KpiCard title="Valor do Estoque" value={formatCurrency(totalStockValue)} icon={<DollarSignIcon />} />
                        <SalesGoalKpiCard title="Meta de Vendas da Equipe" currentValue={vehiclesSold.filter(v => new Date(v.saleDate!).getMonth() === new Date().getMonth()).length} goalValue={totalMonthlyGoal} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-4 animate-fade-in">{stockView === 'available' ? 'Estoque Atual' : 'Veículos Vendidos'}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {vehiclesToDisplay.map((vehicle, index) => (
                                <VehicleCard key={vehicle.id} id={`vehicle-card-${vehicle.id}`} vehicle={vehicle} company={activeCompany} salesperson={teamMembers.find(s => s.id === vehicle.salespersonId)} isSoldView={stockView === 'sold'} isHighlighted={highlightedVehicleId === vehicle.id} onEdit={() => handleEditVehicle(vehicle)} onDelete={() => handleDeleteRequest(vehicle.id!)} onAssign={() => handleAssign(vehicle)} onMarkAsSold={() => markVehicleAsSold(vehicle.id!)} onTogglePriority={() => toggleVehiclePriority(vehicle.id!)} onImageClick={() => vehicle.imageUrl && setExpandedImageUrl(vehicle.imageUrl)} style={{ animationDelay: `${index * 50}ms` }} />
                            ))}
                        </div>
                        {vehiclesToDisplay.length === 0 && <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border"><h3 className="text-xl font-bold text-dark-text">Nenhum Veículo Encontrado</h3><p className="text-dark-secondary mt-2">Tente ajustar os filtros de busca.</p></div>}
                    </div>
                </div>
                <div className="xl:col-span-1 space-y-8">
                    <TaskListCard title="Veículos Prioritários" items={priorityVehicles} onFilterToggle={handlePriorityFilterToggle} isFilterActive={isPriorityFilterActive} onItemClick={handlePriorityItemClick} />
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isCompanyFormOpen} onClose={() => setCompanyFormOpen(false)}><CompanyForm initialData={activeCompany} onClose={() => setCompanyFormOpen(false)} /></Modal>
            <Modal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}><ChangePasswordForm onClose={() => setChangePasswordModalOpen(false)} /></Modal>
            <Modal isOpen={isVehicleFormOpen} onClose={() => setVehicleFormOpen(false)} maxWidthClass="max-w-4xl"><VehicleForm initialData={editingVehicle} onClose={() => setVehicleFormOpen(false)} companyId={companyId} /></Modal>
            <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={confirmDeletion} title="Confirmar Exclusão"><p>Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.</p></ConfirmationModal>
            <AssignSalespersonModal isOpen={isAssignModalOpen} onClose={() => setAssignModalOpen(false)} onAssign={confirmAssignment} salespeople={companySalespeople} currentSalespersonId={assigningVehicle?.salespersonId} />
            {isMarketingModalOpen && <MarketingRequestModal isOpen={isMarketingModalOpen} onClose={() => setMarketingModalOpen(false)} company={activeCompany} totalAdBudget={vehiclesInStock.reduce((sum,v) => sum+v.adCost, 0)} onSendRequest={({ message, driveUrl, budget }) => { updateCompany({ ...activeCompany, marketingDriveUrl: driveUrl, monthlyAdBudget: budget }); if(message) alert('Mensagem enviada (simulação).'); setMarketingModalOpen(false); }} />}
            {expandedImageUrl && <ImageLightbox imageUrl={expandedImageUrl} onClose={() => setExpandedImageUrl(null)} />}
            <Modal isOpen={isTeamManagementOpen} onClose={() => setTeamManagementOpen(false)} maxWidthClass="max-w-3xl"><SalesTeamManagement teamMembers={teamMembers.filter(tm => tm.companyId === companyId)} onClose={() => setTeamManagementOpen(false)} onDeleteMember={handleDeleteMemberRequest} companyId={companyId} /></Modal>
            <ConfirmationModal isOpen={isDeleteTeamMemberConfirmOpen} onClose={() => setDeleteTeamMemberConfirmOpen(false)} onConfirm={confirmDeleteMember} title="Confirmar Exclusão"><p>Tem certeza que deseja remover este membro da equipe? Esta ação não pode ser desfeita.</p></ConfirmationModal>
            
            <Modal isOpen={isUploadHunterModalOpen} onClose={handleCloseUploadModal} fullScreen>
                <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
                {uploadStep === 1 && (
                     <div className="flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full">
                        <h2 className="text-2xl font-bold text-center mb-4">Subir Base de Dados (Hunter)</h2>
                        <p className="text-center text-dark-secondary mb-6">Faça o upload de um arquivo .csv, .xls ou .xlsx com as colunas: `nome`, `telefone`.</p>
                        <button onClick={handleDownloadTemplate} className="w-full mb-4 flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-dark-border/50 hover:bg-dark-border transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                            Baixar Planilha Exemplo (.csv)
                        </button>
                        <div className="w-full h-32 flex items-center justify-center bg-dark-background border-2 border-dashed border-dark-border rounded-md">
                            <label htmlFor="csv-upload-manager" className="cursor-pointer flex flex-col items-center gap-2 text-dark-secondary">
                            <UploadIcon className="w-8 h-8"/>
                            <span>Clique para selecionar o arquivo</span>
                            </label>
                            <input id="csv-upload-manager" type="file" className="sr-only" accept=".csv,.xls,.xlsx" onChange={handleFileUpload} disabled={isUploading} />
                        </div>
                        {isUploading && <p className="text-center text-dark-primary mt-4">Processando arquivo...</p>}
                    </div>
                )}
                {uploadStep === 2 && (
                    <div className="flex-grow flex flex-col min-h-0">
                        <div className="flex-shrink-0">
                            <h2 className="text-2xl font-bold text-center mb-2">Distribuição de Leads</h2>
                            <p className="text-center text-dark-secondary mb-6">
                                Você carregou <strong className="text-dark-text">{parsedLeads.length}</strong> leads. Atribua-os aos vendedores com Modo Hunter ativo.
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

                        <div className="flex-grow overflow-y-auto pr-2 min-h-0">
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
                                                    className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md text-xs"
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
                <style>{`
                    .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #00D1FF; color: #0A0F1E; font-weight: bold; transition: opacity 0.2s; }
                    .btn-primary:hover { opacity: 0.9; }
                    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                    .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #243049; color: #E0E0E0; font-weight: bold; transition: background-color 0.2s; }
                    .btn-secondary:hover { background-color: #3e4c6e; }
                `}</style>
            </Modal>
        </div>
    );
}

export default DashboardScreen;