import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useMockData';
import Card from '../components/Card';
import { ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from '../components/icons';
import { Company } from '../types';
import CompanyInfoCard from '../components/CompanyInfoCard';

interface RelatoriosScreenProps {
    companyId: string | null;
    onBack?: () => void;
}

// Componente para analisar e formatar o conteúdo do relatório
const ReportParser: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Verifica se é um item de lista
        if (line.startsWith('* ')) {
            // Se não estivermos em uma lista, cria uma nova tag <ul>
            if (!inList) {
                inList = true;
                elements.push(<ul key={`ul-${i}`} className="space-y-2 pl-2"></ul>);
            }
            // Adiciona o <li> dentro da <ul>
            const lastElement = elements[elements.length - 1] as React.ReactElement;
            const newChildren = [
                ...React.Children.toArray(lastElement.props.children),
                <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-dark-primary mt-1.5 text-xs">●</span>
                    {/* Usa dangerouslySetInnerHTML para renderizar negrito (**) dentro do item */}
                    <span className="flex-1 text-dark-secondary" dangerouslySetInnerHTML={{ __html: line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-dark-text">$1</strong>') }} />
                </li>
            ];
            elements[elements.length - 1] = React.cloneElement(lastElement, {}, newChildren);
        } else {
            // Se não for um item de lista, encerra a lista anterior
            inList = false;
            
            if (line.startsWith('### ')) {
                elements.push(<h3 key={i} className="text-lg font-bold text-dark-primary mt-6 mb-2 pb-2 border-b border-dark-border">{line.substring(4)}</h3>);
            } else if (line.startsWith('**')) {
                // Lida com linhas do tipo **Label:** Valor
                const parts = line.split('**');
                if (parts.length >= 3) {
                     elements.push(
                        <p key={i} className="text-sm">
                            <strong className="font-semibold text-dark-text">{parts[1]}</strong>
                            <span className="text-dark-secondary ml-2">{parts[2]}</span>
                        </p>
                    );
                }
            } else if (line.trim() === '---') {
                elements.push(<hr key={i} className="border-dark-border/50 my-4" />);
            } else if (line.trim() !== '') {
                // Linhas de texto comuns
                elements.push(<p key={i} className="text-sm text-dark-secondary">{line}</p>);
            }
        }
    }

    return <div className="space-y-1">{elements}</div>;
};


const RelatoriosScreen: React.FC<RelatoriosScreenProps> = ({ companyId, onBack }) => {
    const { dailyReports, companies, vehicles } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
        if (!companyId) return null;
        return companies.find(c => c.id === companyId) || null;
    });

    const activeCompanies = useMemo(() => companies.filter(c => c.isActive).sort((a,b) => a.name.localeCompare(b.name)), [companies]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
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
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [selectedDate]);

    const report = useMemo(() => {
        if (!selectedCompany) return null;
        return dailyReports.find(r => r.company_id === selectedCompany.id && r.report_date === formattedDate);
    }, [dailyReports, selectedCompany, formattedDate]);

    // Admin view: Select a company first
    if (!companyId && !selectedCompany) {
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
                        <p className="text-dark-secondary mt-1">Selecione uma empresa para visualizar os relatórios.</p>
                    </div>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCompanies.map(company => (
                        <CompanyInfoCard
                            key={company.id}
                            company={company}
                            vehicleCount={vehicles.filter(v => v.companyId === company.id && v.status === 'available').length}
                            onClick={() => setSelectedCompany(company)}
                        />
                    ))}
                    {activeCompanies.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-dark-card rounded-2xl border border-dark-border">
                            <h3 className="text-xl font-bold text-dark-text">Nenhuma Empresa Ativa</h3>
                            <p className="text-dark-secondary mt-2">Não há empresas ativas para exibir relatórios.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (!selectedCompany) {
            return (
                <div className="text-center py-16">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-dark-secondary" />
                    <h3 className="text-xl font-bold text-dark-text mt-4">Empresa não encontrada</h3>
                </div>
            );
        }

        if (report) {
            return <ReportParser content={report.report_content} />;
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
                    {!companyId && (
                        <button onClick={() => setSelectedCompany(null)} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                            &larr; Voltar para Seleção de Empresas
                        </button>
                    )}
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Relatórios Diários de Prospecção</h1>
                    <p className="text-dark-secondary mt-1">
                        Visualizando relatórios para {selectedCompany?.name || '...'}
                    </p>
                </div>
            </header>

            <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 pb-6 border-b border-dark-border">
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

                <div className="min-h-[40vh] max-h-[65vh] overflow-y-auto bg-dark-background p-6 rounded-lg border border-dark-border/50">
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