import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { useData } from '../hooks/useMockData';
import Card from '../components/Card';
import { Company, MonitorSettings, TeamMember } from '../types';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { MonitorIcon } from '../components/icons/MonitorIcon';
import AdminMonitorViewer from '../components/AdminMonitorViewer';

type View = 'company_selection' | 'user_selection' | 'chat_view';
type Period = '7d' | '30d' | 'all' | 'custom';

const MonitorSettingsScreen: React.FC = () => {
    const { monitorSettings, updateMonitorSettings, teamMembers, companies, monitorChatHistory } = useData();
    const [prompt, setPrompt] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    
    const [view, setView] = useState<View>('company_selection');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);

    const [period, setPeriod] = useState<Period>('30d');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
    });

    const activeCompanies = useMemo(() => 
        companies.filter(c => c.isActive).sort((a, b) => a.name.localeCompare(b.name)), 
    [companies]);

    const usersOfSelectedCompany = useMemo(() => {
        if (!selectedCompany) return [];
        return teamMembers
            .filter(tm => tm.companyId === selectedCompany.id && (tm.role === 'Vendedor' || tm.role === 'Gestor de Tráfego'))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [teamMembers, selectedCompany]);

    const interactionCountsByUser = useMemo(() => {
        const counts: Record<string, number> = {};
        if (!selectedCompany) return counts;

        let userMessages = monitorChatHistory.filter(msg => usersOfSelectedCompany.some(u => u.id === msg.user_id));

        if (period !== 'all') {
            let startDate: Date;
            let endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            if (period === '7d') {
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === '30d') {
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
            } else { // custom
                if (!customRange.start || !customRange.end) return counts;
                startDate = new Date(customRange.start + 'T00:00:00');
                endDate = new Date(customRange.end + 'T23:59:59');
            }
             userMessages = userMessages.filter(msg => {
                const msgDate = new Date(msg.created_at);
                return msgDate >= startDate && msgDate <= endDate;
            });
        }
        
        usersOfSelectedCompany.forEach(user => {
            counts[user.id] = userMessages.filter(msg => msg.user_id === user.id).length;
        });

        return counts;
    }, [period, customRange, selectedCompany, usersOfSelectedCompany, monitorChatHistory]);


    useEffect(() => {
        if (monitorSettings) {
            setPrompt(monitorSettings.prompt || '');
            setApiKey(monitorSettings.api_key || '');
        }
    }, [monitorSettings]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');
        setError('');

        try {
            await updateMonitorSettings({ prompt, api_key: apiKey });
            setSuccessMessage('Configurações salvas com sucesso!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao salvar.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCompanySelect = (company: Company) => {
        setSelectedCompany(company);
        setView('user_selection');
    };

    const handleUserSelect = (user: TeamMember) => {
        setSelectedUser(user);
        setView('chat_view');
    };

    const handleBackToCompanies = () => {
        setView('company_selection');
        setSelectedCompany(null);
        setSelectedUser(null);
    };

    const handleBackToUsers = () => {
        setView('user_selection');
        setSelectedUser(null);
    };
    
    const renderViewerContent = () => {
        switch (view) {
            case 'company_selection':
                return (
                    <>
                        <h3 className="text-lg font-semibold text-dark-text mb-4">Selecione uma empresa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeCompanies.map(company => {
                                const companyUserIds = teamMembers.filter(tm => tm.companyId === company.id).map(tm => tm.id);
                                const interactionCount = monitorChatHistory.filter(msg => companyUserIds.includes(msg.user_id)).length;

                                return (
                                     <Card
                                        key={company.id}
                                        className="p-5 transition-transform duration-300 hover:scale-105 hover:border-dark-primary cursor-pointer animate-stagger opacity-0"
                                        style={{ animationFillMode: 'forwards' }}
                                        onClick={() => handleCompanySelect(company)}
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            <img src={company.logoUrl} alt={company.name} className="w-14 h-14 rounded-full" />
                                            <div>
                                                <h3 className="text-lg font-bold text-dark-text">{company.name}</h3>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${company.isActive ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {company.isActive ? 'Ativa' : 'Pendente'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-dark-border flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2 text-dark-secondary">
                                                <MonitorIcon className="w-5 h-5" />
                                                <span>Interações com Monitor</span>
                                            </div>
                                            <span className="font-bold text-dark-text text-lg">{interactionCount}</span>
                                        </div>
                                    </Card>
                                );
                            })}
                            {activeCompanies.length === 0 && <p className="text-dark-secondary col-span-full text-center py-8">Nenhuma empresa ativa encontrada.</p>}
                        </div>
                    </>
                );
            case 'user_selection':
                if (!selectedCompany) return null;
                 const periodOptions: { id: Period; label: string }[] = [
                    { id: '7d', label: 'Últimos 7 dias' },
                    { id: '30d', label: 'Últimos 30 dias' },
                    { id: 'all', label: 'Todo o Período' },
                    { id: 'custom', label: 'Personalizado' },
                ];

                return (
                    <>
                        <button onClick={handleBackToCompanies} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-primary mb-4">&larr; Voltar para Empresas</button>
                        <h3 className="text-lg font-semibold text-dark-text mb-4">Selecione um usuário de <span className="text-dark-primary">{selectedCompany.name}</span></h3>
                        
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                            <div className="bg-dark-background p-1 rounded-lg border border-dark-border flex flex-wrap items-center gap-1">
                                {periodOptions.map(opt => (
                                    <button key={opt.id} onClick={() => setPeriod(opt.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === opt.id ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {period === 'custom' && (
                                <div className="flex items-center gap-2 animate-fade-in bg-dark-background p-1 rounded-lg border border-dark-border">
                                    <input type="date" value={customRange.start} onChange={(e) => setCustomRange(r => ({...r, start: e.target.value}))} className="filter-date-input"/>
                                    <span className="text-dark-secondary text-xs">até</span>
                                    <input type="date" value={customRange.end} onChange={(e) => setCustomRange(r => ({...r, end: e.target.value}))} className="filter-date-input"/>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {usersOfSelectedCompany.map(user => (
                                <Card key={user.id} onClick={() => handleUserSelect(user)} className="p-4 flex flex-col gap-3 cursor-pointer hover:border-dark-primary transition-colors animate-fade-in">
                                    <div className="flex items-center gap-4 w-full">
                                        <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full" />
                                        <div className="flex-1">
                                            <p className="font-bold text-dark-text">{user.name}</p>
                                            <p className="text-xs text-dark-secondary">{user.role}</p>
                                        </div>
                                    </div>
                                    <div className="w-full pt-3 border-t border-dark-border flex justify-between items-center text-sm">
                                        <span className="text-dark-secondary font-medium">Interações no período:</span>
                                        <span className="font-bold text-lg text-dark-primary">{interactionCountsByUser[user.id] || 0}</span>
                                    </div>
                                </Card>
                            ))}
                            {usersOfSelectedCompany.length === 0 && (
                                <div className="col-span-full text-center py-16 text-dark-secondary bg-dark-background rounded-lg border border-dark-border">
                                    <p>Nenhum vendedor ou gestor de tráfego encontrado nesta empresa.</p>
                                </div>
                            )}
                        </div>
                    </>
                );
            case 'chat_view':
                if (!selectedUser) return null;
                return (
                     <>
                        <button onClick={handleBackToUsers} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-primary mb-4">&larr; Voltar para Usuários</button>
                        <AdminMonitorViewer user={selectedUser} />
                    </>
                );
            default:
                return null;
        }
    };


    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <header className="flex flex-col items-center text-center gap-4 mb-8">
                <div className="p-4 bg-dark-card border border-dark-border rounded-full">
                    <MonitorIcon className="w-10 h-10 text-dark-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Configurações do Monitor</h1>
                <p className="text-dark-secondary max-w-2xl">
                    Personalize o comportamento do agente Monitor e configure a integração com a API da OpenAI para ativar a inteligência artificial.
                </p>
            </header>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="monitor-prompt" className="block text-lg font-semibold text-dark-text mb-2">
                            Prompt do Sistema (Personalidade do Monitor)
                        </label>
                        <p className="text-sm text-dark-secondary mb-3">
                            Este texto define como o Monitor deve se comportar, seu tom de voz e suas principais diretrizes.
                        </p>
                        <textarea
                            id="monitor-prompt"
                            rows={8}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full p-3 bg-dark-background border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dark-primary transition-colors"
                            placeholder="Ex: Você é o Monitor, um assistente prestativo..."
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="api-key" className="block text-lg font-semibold text-dark-text mb-2">
                            Chave de API (OpenAI - GPT-4o Mini)
                        </label>
                         <p className="text-sm text-dark-secondary mb-3">
                            Cole aqui sua chave secreta da API da OpenAI para ativar o chat.
                        </p>
                        <div className="relative">
                            <input
                                id="api-key"
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-3 pr-12 bg-dark-background border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dark-primary transition-colors"
                                placeholder="sk-..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute inset-y-0 right-0 flex items-center px-4 text-dark-secondary hover:text-dark-primary"
                                aria-label={showApiKey ? "Esconder chave" : "Mostrar chave"}
                            >
                                {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4 border-t border-dark-border">
                        {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-dark-primary text-dark-background font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="p-6 mt-8">
                <h2 className="text-xl font-bold text-dark-text mb-4">Visualizador de Monitor por Usuário</h2>
                {renderViewerContent()}
            </Card>
            <style>{`
                .filter-date-input { background-color: #10182C; border: 1px solid #243049; color: #E0E0E0; padding: 0.375rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 500; color-scheme: dark; }
                .filter-date-input::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
            `}</style>
        </div>
    );
};

export default MonitorSettingsScreen;