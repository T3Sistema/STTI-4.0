import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useMockData';
import Card from '../components/Card';
import { ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from '../components/icons';

interface RelatoriosScreenProps {
    companyId: string | null;
    onBack?: () => void;
}

const RelatoriosScreen: React.FC<RelatoriosScreenProps> = ({ companyId, onBack }) => {
    const { dailyReports, companies } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const activeCompanies = useMemo(() => companies.filter(c => c.isActive), [companies]);
    const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(companyId || (activeCompanies.length > 0 ? activeCompanies[0].id : null));

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
        // The input type="date" provides a string like "YYYY-MM-DD".
        // Creating a new Date from this string can lead to timezone issues as it's often interpreted as UTC.
        // By replacing hyphens with slashes, we hint to the Date constructor to parse it as a local date,
        // which is more reliable across browsers for avoiding timezone shifts.
        const date = dateString ? new Date(dateString.replace(/-/g, '/')) : new Date();
        setSelectedDate(date);
    };

    const navigateDays = (amount: number) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + amount);
            return newDate;
        });
    };
    
    const formattedDate = useMemo(() => {
        // Creates a "YYYY-MM-DD" string based on the local date components, avoiding timezone conversion issues with toISOString().
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [selectedDate]);

    const report = useMemo(() => {
        if (!currentCompanyId) return null;
        return dailyReports.find(r => r.company_id === currentCompanyId && r.report_date === formattedDate);
    }, [dailyReports, currentCompanyId, formattedDate]);

    const companyName = useMemo(() => {
        return companies.find(c => c.id === currentCompanyId)?.name || 'Empresa desconhecida';
    }, [companies, currentCompanyId]);


    const renderContent = () => {
        if (!currentCompanyId) {
            return (
                <div className="text-center py-16">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-dark-secondary" />
                    <h3 className="text-xl font-bold text-dark-text mt-4">Selecione uma Empresa</h3>
                    <p className="text-dark-secondary mt-2">Escolha uma empresa para visualizar os relatórios diários.</p>
                </div>
            );
        }

        if (report) {
            return (
                <div className="whitespace-pre-wrap text-dark-text leading-relaxed p-4">
                    {report.report_content}
                </div>
            );
        }

        return (
            <div className="text-center py-16">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-dark-secondary" />
                <h3 className="text-xl font-bold text-dark-text mt-4">Nenhum Relatório Encontrado</h3>
                <p className="text-dark-secondary mt-2">Não há relatório de prospecção para esta data.</p>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
             <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                     {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                            &larr; Voltar
                        </button>
                    )}
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Relatórios Diários de Prospecção</h1>
                    <p className="text-dark-secondary mt-1">
                        {companyId ? `Visualizando relatórios para ${companyName}` : "Selecione uma empresa e uma data para ver o relatório."}
                    </p>
                </div>
            </header>

            <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-dark-border">
                    {!companyId && (
                        <div className="w-full sm:w-auto">
                            <label htmlFor="company-select" className="block text-sm font-medium text-dark-secondary mb-1">Empresa</label>
                            <select
                                id="company-select"
                                value={currentCompanyId || ''}
                                onChange={e => setCurrentCompanyId(e.target.value)}
                                className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md"
                            >
                                {activeCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-2 justify-center flex-1">
                        <button onClick={() => navigateDays(-1)} className="p-2 rounded-md hover:bg-dark-border"><ChevronLeftIcon /></button>
                        <input
                            type="date"
                            value={formattedDate}
                            onChange={handleDateChange}
                            className="input-date"
                        />
                        <button onClick={() => navigateDays(1)} className="p-2 rounded-md hover:bg-dark-border"><ChevronRightIcon /></button>
                    </div>
                </div>

                <div className="min-h-[40vh] bg-dark-background p-4 rounded-lg border border-dark-border/50">
                    <h3 className="text-xl font-bold mb-4 text-dark-text">
                        Relatório de {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </h3>
                    {renderContent()}
                </div>
            </Card>

            <style>{`
                .input-date {
                    background-color: #1A1F29;
                    border: 1px solid #243049;
                    color: #E0E0E0;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 1rem;
                    font-weight: 500;
                    color-scheme: dark;
                }
                .input-date::-webkit-calendar-picker-indicator {
                    filter: invert(0.8);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default RelatoriosScreen;