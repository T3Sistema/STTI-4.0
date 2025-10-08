import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../hooks/useMockData';
import { Vehicle, TeamMember, Company } from '../types';
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

    // New states for ProspectAI settings view
    const [prospectAIView, setProspectAIView] = useState<'overview' | 'settings_choice' | 'pipeline_settings' | 'deadline_settings_list' | 'deadline_settings_form' | 'hunter_settings' | 'goal_settings'>('overview');
    const [selectedSalespersonForSettings, setSelectedSalespersonForSettings] = useState<TeamMember | null>(null);


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
    
    // This guard is crucial. If the companyId is somehow invalid or data is loading,
    // we prevent the rest of the component from rendering.
    if (!activeCompany) {
        return <div>Carregando dados da empresa...</div>;
    }
    
    const companyFeatures = activeCompany?.enabledFeatures || [];

    useEffect(() => {
        // Redirect if company has only one specific feature enabled, like ProspectAI
        if (companyFeatures && companyFeatures.length === 1) {
            const singleFeature = companyFeatures[0];
            if (singleFeature === 'prospectai') {
                setCurrentView('prospectAI');
            }
        }
    }, [activeCompany, companyFeatures]); // Depend on the company object to re-evaluate when it changes.
    
    // Reset prospect AI view when switching main views
    useEffect(() => {
        if (currentView !== 'prospectAI') {
            setProspectAIView('overview');
        }
    }, [currentView]);

    const companyTeamMembers = teamMembers.filter(s => s.companyId === activeCompany?.id);
    const companySalespeople = companyTeamMembers.filter(tm => tm.role === 'Vendedor');
    const userNotifications = notifications.filter(n => n.recipientRole === 'company');

    // Base vehicle data filtered by selected salesperson
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

    // KPI Calculations
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


    // Advanced Filter Logic
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


    // Handlers for Modals
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
        setStockView('available'); // Switch to available stock view if not already
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
        }, 100); // Small delay to allow view switch
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

     if (currentView === 'prospectAI') {
        if (selectedProspectUser) {
            return <ProspectAIScreen 
                user={selectedProspectUser} 
                onBack={() => setSelectedProspectUser(null)} 
                onLogout={onLogout}
                showBackButton={true}
                isManagerView={true}
                allSalespeople={companySalespeople}
            />;
        }

        // --- NEW SETTINGS VIEWS FOR MANAGER ---
        if (prospectAIView === 'deadline_settings_list') {
            return (
                <div className="animate-fade-in">
                    <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                         <div>
                            <button onClick={() => setProspectAIView('settings_choice')} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                                &larr; Voltar para Configurações
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
                            onClick={() => setProspectAIView('deadline_settings_list')}
                        >
                            <ClockIcon className="w-12 h-12 text-dark-primary" />
                            <h4 className="text-xl font-bold text-dark-text">Prazos e Alertas</h4>
                            <p className="text-sm text-dark-secondary">Defina os tempos de resposta e automações para a equipe.</p>
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

        // --- Original ProspectAI Overview (prospectAIView === 'overview') ---
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
                            onClick={() => setSelectedProspectUser(sp)}
                        >
                            <img src={sp.avatarUrl} alt={sp.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-dark-border" />
                            <h4 className="font-bold text-dark-text">{sp.name}</h4>
                            <p className="text-sm text-dark-secondary">{sp.role}</p>
                        </Card>
                    ))}
                </div>

                {/* Modals required for UserProfileDropdown */}
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
                // @-fix: Use Array.isArray(val) as a type guard before accessing `val.length`. Also added explicit types to the reduce function accumulator and value to resolve a TypeScript error where `val` was inferred as 'unknown', preventing safe access to array properties.
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
                    {/* Main Content Area */}
                    <div className="xl:col-span-3 space-y-8">
                        {/* KPI Cards Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KpiCard title="Veículos em Estoque" value={availableVehicles.length.toString()} trend={stockTrend} />
                            <SalesGoalKpiCard {...salesGoalProps} />
                            <KpiCard title="Prejuízo Acumulado" value={formatCurrency(totalLoss)} isLoss={true} />
                            <KpiCard title="Vendedores Ativos" value={companySalespeople.length.toString()} trend="Nenhuma alteração" />
                        </div>

                        {/* Vehicle List Section */}
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

                    {/* Sidebar */}
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


            {/* Modals */}
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