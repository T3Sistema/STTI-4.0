import React, { useState, useMemo, useEffect, FormEvent, ChangeEvent } from 'react';
import { useData } from '../hooks/useMockData';
import { Vehicle, TeamMember, HunterLead, PipelineStage, Company, ProspectAILead } from '../types';
import KpiCard from '../components/KpiCard';
import VehicleCard from '../components/VehicleCard';
import { formatCurrency } from '../utils/calculationUtils';
import SalesGoalKpiCard from '../components/SalesGoalKpiCard';
import UserProfileDropdown from '../components/UserProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ImageLightbox from '../components/ImageLightbox';
import MarketingAssetsCard from '../components/MarketingAssetsCard';
import SalespersonPerformanceScreen from './SalespersonPerformanceScreen';
import { ChartBarIcon } from '../components/icons/ChartBarIcon';
import { CarIcon } from '../components/icons/CarIcon';
import FilterBar, { AdvancedFilters } from '../components/FilterBar';
import { getDaysInStock, formatTimeUntil, formatDuration } from '../utils/dateUtils';
import Modal from '../components/Modal';
import UserProfileForm from '../components/forms/UserProfileForm';
import ChangePasswordForm from '../components/forms/ChangePasswordForm';
import ProspectAIScreen from './ProspectAIScreen';
import HunterScreen from './HunterScreen';
import ToolboxViewer from '../components/ToolboxViewer';
import DisparadorAutomaticoScreen from './DisparadorAutomaticoScreen';
import { CrosshairIcon } from '../components/icons';


interface SalespersonDashboardScreenProps {
  user: TeamMember;
  onLogout: () => void;
}

type StockView = 'assigned' | 'all';

const SalespersonDashboardScreen: React.FC<SalespersonDashboardScreenProps> = ({ user, onLogout }) => {
    const { 
        companies, vehicles, teamMembers, notifications, prospectaiLeads, hunterLeads,
        markVehicleAsSold, markNotificationAsRead, addNotification, toolboxUrl,
    } = useData();
    
    // View State
    const [view, setView] = useState<'dashboard' | 'performance'>('dashboard');
    const [stockView, setStockView] = useState<StockView>('assigned');
    
    // Modal States
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isToolboxOpen, setIsToolboxOpen] = useState(false);
    const [showDisparador, setShowDisparador] = useState(false);
    
    // Filter States
    const [filters, setFilters] = useState<AdvancedFilters>({
        salespersonIds: [],
        stockDays: [],
        priceRanges: [],
        modelNames: [],
    });
    const [isOverdueFilterActive, setOverdueFilterActive] = useState(false);
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<string | null>(null);


    // Data specific to this user
    const activeCompany = companies.find(c => c.id === user.companyId);
    const features = activeCompany?.enabledFeatures || [];
    const availableToolsCount = features.filter(f => f === 'estoque_inteligente' || f === 'prospectai').length;

    // Determine initial view based on available features
    const getInitialSubView = () => {
        if (features.includes('prospectai') && !features.includes('estoque_inteligente')) {
            return 'prospectAI';
        }
        return 'dashboard';
    };
    const [currentSubView, setCurrentSubView] = useState<'dashboard' | 'prospectAI' | 'hunter'>(getInitialSubView);

    const userNotifications = notifications.filter(n =>
        (n.recipientRole === 'salesperson' && !n.userId) || // Notificações genéricas para vendedores
        n.userId === user.id // Notificações específicas para este usuário
    );

    // APPOINTMENT NOTIFICATION LOGIC
    useEffect(() => {
        if (!activeCompany) return;

        const NOTIFIED_APPOINTMENTS_KEY = `notified_appointments_${user.id}`;

        const checkAppointments = () => {
            const notifiedIds: string[] = JSON.parse(sessionStorage.getItem(NOTIFIED_APPOINTMENTS_KEY) || '[]');
            
            const agendadoStage = activeCompany.pipeline_stages.find(stage => stage.name === 'Agendado');
            if (!agendadoStage) return;

            const upcomingAppointments = prospectaiLeads.filter(lead => {
                if (lead.salespersonId !== user.id || lead.stage_id !== agendadoStage.id || !lead.appointment_at) {
                    return false;
                }
                const appointmentDate = new Date(lead.appointment_at);
                const now = new Date();
                const diffHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                
                // Notificar sobre agendamentos nas próximas 48 horas (hoje e amanhã) que ainda não ocorreram.
                return diffHours > 0 && diffHours <= 48;
            });

            const newNotifiedIds = [...notifiedIds];

            upcomingAppointments.forEach(lead => {
                if (!notifiedIds.includes(lead.id)) {
                    const timeUntil = formatTimeUntil(lead.appointment_at!);
                    const lastFeedback = lead.feedback && lead.feedback.length > 0 ? lead.feedback[lead.feedback.length - 1].text : null;
                    
                    let message = `Lembrete: Agendamento com ${lead.leadName} ${timeUntil}.`;
                    if (lastFeedback) {
                        message += ` | Último feedback: "${lastFeedback}"`;
                    }
                    
                    // Envia uma notificação específica para este usuário
                    addNotification(message, 'salesperson', user.id);
                    
                    newNotifiedIds.push(lead.id);
                }
            });

            sessionStorage.setItem(NOTIFIED_APPOINTMENTS_KEY, JSON.stringify(newNotifiedIds));
        };

        // Verifica imediatamente ao carregar e depois a cada minuto
        checkAppointments();
        const intervalId = setInterval(checkAppointments, 60000); 

        return () => clearInterval(intervalId);

    }, [user.id, user.companyId, prospectaiLeads, addNotification, activeCompany]);


    // Vehicle data
    const allCompanyVehicles = useMemo(() => vehicles.filter(v => v.companyId === user.companyId && v.status === 'available'), [vehicles, user.companyId]);
    const assignedVehicles = useMemo(() => allCompanyVehicles.filter(v => v.salespersonId === user.id), [allCompanyVehicles, user.id]);
    const allSalespeople = useMemo(() => teamMembers.filter(tm => tm.companyId === user.companyId && tm.role === 'Vendedor'), [teamMembers, user.companyId]);
    
    const soldVehiclesThisMonth = useMemo(() => {
      return vehicles.filter(v => {
        if (v.status !== 'sold' || v.salespersonId !== user.id || !v.saleDate) return false;
        const saleDate = new Date(v.saleDate);
        const today = new Date();
        return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
      });
    }, [vehicles, user.id]);

    // KPI Calculations
    const totalAssignedValue = assignedVehicles.reduce((sum, v) => sum + (v.announcedPrice || 0) - (v.discount || 0), 0);

    const salesGoalProps = {
        title: `Minha Meta de Vendas`,
        currentValue: soldVehiclesThisMonth.length,
        goalValue: user.monthlySalesGoal,
    };
    
    const vehiclesToDisplay = useMemo(() => {
        if (stockView === 'assigned') {
            return assignedVehicles;
        }

        let baseVehicles = allCompanyVehicles;

        // Apply main salesperson dropdown filter first
        if (selectedSalespersonId) {
            baseVehicles = baseVehicles.filter(v => v.salespersonId === selectedSalespersonId);
        }

        let vehiclesToFilter = [...baseVehicles];

        if (isOverdueFilterActive) {
            vehiclesToFilter = vehiclesToFilter.filter(v => getDaysInStock(v.entryDate) > 30);
        }

        const { salespersonIds, stockDays, priceRanges, modelNames } = filters;
        
        if (salespersonIds.length > 0) {
            vehiclesToFilter = vehiclesToFilter.filter(v => 
                (v.salespersonId && salespersonIds.includes(v.salespersonId))
            );
        }

        if (modelNames.length > 0) {
            vehiclesToFilter = vehiclesToFilter.filter(v => modelNames.includes(`${v.brand} ${v.model}`));
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

    }, [stockView, assignedVehicles, allCompanyVehicles, isOverdueFilterActive, filters, selectedSalespersonId]);

    const stockTitle = stockView === 'assigned' ? 'Meus Veículos Atribuídos' : 'Estoque Completo da Loja';

    if (!activeCompany) {
        return <div>Carregando dados...</div>;
    }

    if (showDisparador) {
        return <DisparadorAutomaticoScreen user={user} onBack={() => setShowDisparador(false)} />;
    }
    
    if (view === 'performance' && features.includes('estoque_inteligente')) {
        const allSoldVehicles = vehicles.filter(v => v.status === 'sold' && v.companyId === user.companyId);
        return (
             <SalespersonPerformanceScreen 
                salespeople={allSalespeople}
                vehicles={allSoldVehicles}
                currentUser={user}
                onBack={() => setView('dashboard')}
             />
        );
    }

    if (currentSubView === 'prospectAI' && features.includes('prospectai')) {
        return <ProspectAIScreen
            onBack={() => setCurrentSubView('dashboard')}
            onSwitchToHunter={() => setCurrentSubView('hunter')}
            user={user}
            onLogout={onLogout}
            showBackButton={availableToolsCount > 1}
            allSalespeople={allSalespeople}
        />;
    }
    
    return (
        <div className="container mx-auto">
             <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">
                        Bem-vindo, <span className="text-dark-primary">{user.name.split(' ')[0]}</span>!
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationBell
                        notifications={userNotifications}
                        onMarkAsRead={markNotificationAsRead}
                    />
                    <UserProfileDropdown
                        company={{ ...activeCompany, name: user.name, logoUrl: user.avatarUrl, email: user.email }}
                        onEditProfile={() => setEditProfileModalOpen(true)}
                        onChangePassword={() => setChangePasswordModalOpen(true)}
                        onLogout={onLogout}
                    />
                </div>
            </header>

            <div className="mb-8 animate-fade-in flex flex-wrap items-center justify-between gap-4">
                <div className="bg-dark-card p-1 rounded-lg border border-dark-border flex flex-wrap items-center gap-1">
                    {features.includes('estoque_inteligente') && (
                      <>
                        <button 
                            onClick={() => {
                                setCurrentSubView('dashboard');
                                setStockView('assigned');
                            }}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${stockView === 'assigned' && currentSubView === 'dashboard' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}
                        >
                            Meus Veículos
                        </button>
                        <button 
                            onClick={() => {
                                setCurrentSubView('dashboard');
                                setStockView('all');
                            }}
                             className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${stockView === 'all' && currentSubView === 'dashboard' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}
                        >
                            Estoque da Loja
                        </button>
                      </>
                    )}
                    {features.includes('prospectai') && (
                        <button 
                            onClick={() => setCurrentSubView('prospectAI')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${currentSubView === 'prospectAI' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}
                        >
                            ProspectAI (Farm)
                        </button>
                    )}
                    {features.includes('prospectai') && user.isHunterModeActive && (
                        <button 
                            onClick={() => setCurrentSubView('hunter')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${currentSubView === 'hunter' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}
                        >
                            ProspectAI (Hunter)
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {features.includes('estoque_inteligente') && (
                        <button
                            onClick={() => setView('performance')}
                            className="flex items-center gap-2 bg-dark-primary text-dark-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-bold text-sm"
                        >
                            <ChartBarIcon className="w-4 h-4" />
                            Minha Performance
                        </button>
                    )}
                    {features.includes('disparador_automatico') && user.isHunterModeActive && (
                        <button
                            onClick={() => setShowDisparador(true)}
                            className="relative flex items-center gap-2 bg-dark-primary text-dark-background px-4 py-2 rounded-lg font-bold text-sm animate-aura-pulse shadow-lg"
                        >
                            <CrosshairIcon className="w-4 h-4" />
                            <span>Disparador Automático</span>
                        </button>
                    )}
                </div>
            </div>
            
            {currentSubView === 'hunter' && features.includes('prospectai') && user.isHunterModeActive
                ? <HunterScreen user={user} activeCompany={activeCompany} />
                : features.includes('estoque_inteligente') && currentSubView === 'dashboard' ? (
              <>
                <FilterBar
                    salespeople={allSalespeople}
                    vehicles={allCompanyVehicles}
                    isOverdueFilterActive={isOverdueFilterActive}
                    onOverdueFilterToggle={() => setOverdueFilterActive(prev => !prev)}
                    onAdvancedFilterChange={setFilters}
                    // FIX: Use Array.isArray(val) as a type guard before accessing `val.length` on `unknown`.
                    activeAdvancedFiltersCount={Object.values(filters).reduce((acc: number, val) => acc + (Array.isArray(val) ? (val as string[]).length : 0), 0)}
                    selectedSalespersonId={selectedSalespersonId}
                    onSalespersonSelect={setSelectedSalespersonId}
                    areFiltersDisabled={stockView === 'assigned'}
                    // Hide buttons not relevant for salesperson
                    showAddVehicle={false}
                    showSalesAnalysis={false}
                    showMarketing={false}
                    showLembrAI={false}
                    showStockViewToggle={false}
                    showProspectAI={false}
                />
                
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="xl:col-span-3 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <KpiCard title="Veículos Atribuídos" value={assignedVehicles.length.toString()} trend="Prontos para venda" icon={<CarIcon />} />
                            <SalesGoalKpiCard {...salesGoalProps} />
                            <KpiCard title="Valor em Estoque" value={formatCurrency(totalAssignedValue)} trend="Sob sua responsabilidade" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4 animate-fade-in">
                                {stockTitle}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {vehiclesToDisplay.map((vehicle, index) => (
                                    <VehicleCard 
                                        key={vehicle.id}
                                        id={`vehicle-card-${vehicle.id}`} 
                                        vehicle={vehicle}
                                        company={activeCompany}
                                        salesperson={teamMembers.find(s => s.id === vehicle.salespersonId)}
                                        onMarkAsSold={() => markVehicleAsSold(vehicle.id!)}
                                        onImageClick={() => vehicle.imageUrl && setExpandedImageUrl(vehicle.imageUrl)}
                                        isSalespersonView={true}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    />
                                ))}
                            </div>
                            {vehiclesToDisplay.length === 0 && (
                                <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border">
                                    <h3 className="text-xl font-bold text-dark-text">Nenhum Veículo Encontrado</h3>
                                    <p className="text-dark-secondary mt-2">
                                        {stockView === 'assigned' 
                                            ? 'Você não possui veículos atribuídos no momento.' 
                                            : 'Tente ajustar os filtros ou selecione outro vendedor.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="xl:col-span-1 space-y-8">
                        <MarketingAssetsCard driveUrl={activeCompany.marketingDriveUrl} />
                    </div>
                </div>
              </>
            ) : (
                 <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border mt-8">
                    <h3 className="text-xl font-bold text-dark-text">Bem-vindo(a), {user.name.split(' ')[0]}!</h3>
                    <p className="text-dark-secondary mt-2">
                       {features.length > 0 ? 'Sua visão de estoque está desabilitada. Use o menu acima para acessar as ferramentas disponíveis.' : 'Nenhuma ferramenta habilitada para seu perfil.'}
                    </p>
                </div>
            )}


             {expandedImageUrl && (
                <ImageLightbox
                    imageUrl={expandedImageUrl}
                    onClose={() => setExpandedImageUrl(null)}
                />
            )}
            
            <Modal isOpen={isEditProfileModalOpen} onClose={() => setEditProfileModalOpen(false)}>
                <UserProfileForm initialData={user} onClose={() => setEditProfileModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}>
                <ChangePasswordForm onClose={() => setChangePasswordModalOpen(false)} />
            </Modal>
            
            {isToolboxOpen && toolboxUrl && (
                <ToolboxViewer url={toolboxUrl} onClose={() => setIsToolboxOpen(false)} />
            )}
        </div>
    );
};

export default SalespersonDashboardScreen;