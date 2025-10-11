

import React, { useState, useMemo, useRef, useEffect } from 'react';
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

interface DashboardScreenProps {
  onLogout: () => void;
  companyId: string;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onLogout, companyId }) => {
    const {
        companies, vehicles, teamMembers, reminders, notifications, prospectaiLeads, hunterLeads,
        markNotificationAsRead, addVehicle, updateVehicle, deleteVehicle, markVehicleAsSold,
        assignSalesperson, toggleVehiclePriority, updateCompany, deleteTeamMember, toggleVehicleAdStatus,
        // FIX: Destructure `updateTeamMember` from the `useData` hook.
        updateTeamMember
    } = useData();

    // State
    const [view, setView] = useState<'dashboard' | 'sales_analysis' | 'prospect_analysis' | 'lembrai' | 'prospectai' | 'prospectai_settings' | 'pipeline_settings' | 'hunter_settings' | 'goal_settings' | 'business_hours_settings'>('dashboard');
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

    const activeCompany = useMemo(() => companies.find(c => c.id === companyId), [companies, companyId]);

    // Memoized data
    const companyVehicles = useMemo(() => vehicles.filter(v => v.companyId === companyId), [vehicles, companyId]);
    const companySalespeople = useMemo(() => teamMembers.filter(tm => tm.companyId === companyId && tm.role === 'Vendedor'), [teamMembers, companyId]);
    const userNotifications = useMemo(() => notifications.filter(n => n.recipientRole === 'company'), [notifications]);
    
    const vehiclesInStock = useMemo(() => companyVehicles.filter(v => v.status === 'available'), [companyVehicles]);
    const vehiclesSold = useMemo(() => companyVehicles.filter(v => v.status === 'sold'), [companyVehicles]);

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

    if (!activeCompany) return <div>Carregando...</div>;

    const features = activeCompany.enabledFeatures || [];
    
    // Sub-screen rendering
    if (view === 'sales_analysis') return <SalesAnalysisScreen company={activeCompany} salespeople={companySalespeople} vehicles={vehiclesSold} updateCompany={updateCompany} updateSalesperson={() => {}} onBack={() => setView('dashboard')} />;
    if (view === 'lembrai') return <LembrAIScreen onBack={() => setView('dashboard')} companyId={companyId} />;
    if (view === 'prospect_analysis') return <CompanyProspectPerformanceScreen company={activeCompany} salespeople={companySalespeople} prospectaiLeads={prospectaiLeads.filter(l => l.companyId === companyId)} hunterLeads={hunterLeads.filter(l => l.companyId === companyId)} onBack={() => setView('dashboard')} />;
    if (view === 'prospectai_settings' && selectedSalespersonForSettings) return <ProspectAISettingsScreen salesperson={selectedSalespersonForSettings} onBack={() => { setView('dashboard'); setSelectedSalespersonForSettings(null); }} />;
    if (view === 'pipeline_settings') return <PipelineSettingsScreen companyId={companyId} onBack={() => setView('dashboard')} />;
    if (view === 'hunter_settings') return <HunterSettingsScreen salespeople={teamMembers.filter(tm => tm.companyId === companyId)} onBack={() => setView('dashboard')} onUpdateSalesperson={updateTeamMember} />;
    if (view === 'goal_settings') return <GoalSettingsScreen companyId={companyId} onBack={() => setView('dashboard')} />;
    if (view === 'business_hours_settings') return <BusinessHoursSettingsScreen companyId={companyId} onBack={() => setView('dashboard')} />;

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
                salespeople={companySalespeople} 
                vehicles={vehiclesInStock}
                isOverdueFilterActive={isOverdueFilterActive}
                onOverdueFilterToggle={() => setOverdueFilterActive(prev => !prev)}
                onAdvancedFilterChange={setFilters}
                activeAdvancedFiltersCount={Object.values(filters).reduce((acc, val) => acc + val.length, 0)}
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

        </div>
    );
}

export default DashboardScreen;