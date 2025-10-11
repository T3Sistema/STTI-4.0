import React, { useState, useMemo } from 'react';
import { Company, ProspectAILead, HunterLead, TeamMember, PipelineStage } from '../types';
import Card from '../components/Card';
import { formatDuration } from '../utils/dateUtils';
import { BriefcaseIcon, BullseyeIcon, CheckCircleIcon, ClockIcon, UserGroupIcon, UsersIcon, XCircleIcon } from '../components/icons';

type Period = 'last_7_days' | 'last_30_days' | 'this_month' | 'all';

interface Metrics {
    totalLeads: number;
    inNegotiation: number;
    finalized: number;
    converted: number;
    avgFirstResponse: number; // in ms
    avgFirstFeedback: number; // in ms
}

interface GrupoMetricsScreenProps {
    accessibleCompanies: Company[];
    prospectaiLeads: ProspectAILead[];
    hunterLeads: HunterLead[];
    teamMembers: TeamMember[];
}

const Kpi: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-dark-secondary">
            {icon}
            <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-4xl font-bold text-dark-primary">{value}</p>
    </Card>
);

const calculateMetrics = (
    leads: (ProspectAILead | HunterLead)[],
    companyPipelines: Record<string, PipelineStage[]>
): Metrics => {
    const inNegotiationStageNames = ['Primeira Tentativa', 'Segunda Tentativa', 'Terceira Tentativa', 'Agendado'];
    
    let inNegotiation = 0;
    let finalized = 0;
    let converted = 0;

    leads.forEach(lead => {
        const pipeline = companyPipelines[lead.companyId];
        if (!pipeline) return;

        const stage = pipeline.find(s => s.id === lead.stage_id);
        if (!stage) return;

        if (inNegotiationStageNames.includes(stage.name)) {
            inNegotiation++;
        } else if (stage.name === 'Finalizados') {
            finalized++;
            if (lead.outcome === 'convertido') {
                converted++;
            }
        }
    });

    const farmLeads = leads.filter(l => 'prospected_at' in l) as ProspectAILead[];
    
    const responseTimes = farmLeads
        .filter(l => l.prospected_at)
        .map(l => new Date(l.prospected_at!).getTime() - new Date(l.createdAt).getTime())
        .filter(t => t > 0);

    const feedbackTimes = farmLeads
        .filter(l => l.prospected_at && l.feedback && l.feedback.length > 0)
        .map(l => new Date(l.feedback![0].createdAt).getTime() - new Date(l.prospected_at!).getTime())
        .filter(t => t > 0);

    const avgFirstResponse = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const avgFirstFeedback = feedbackTimes.length > 0 ? feedbackTimes.reduce((a, b) => a + b, 0) / feedbackTimes.length : 0;
    
    return {
        totalLeads: leads.length,
        inNegotiation,
        finalized,
        converted,
        avgFirstResponse,
        avgFirstFeedback,
    };
};

const GrupoMetricsScreen: React.FC<GrupoMetricsScreenProps> = ({ accessibleCompanies, prospectaiLeads, hunterLeads, teamMembers }) => {
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>('last_30_days');

    const companyPipelines = useMemo(() => 
        accessibleCompanies.reduce((acc, company) => {
            acc[company.id] = company.pipeline_stages;
            return acc;
        }, {} as Record<string, PipelineStage[]>)
    , [accessibleCompanies]);
    
    const filteredLeads = useMemo(() => {
        let startDate: Date;
        const now = new Date();

        switch (period) {
            case 'last_7_days': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
            case 'last_30_days': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); break;
            case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'all':
            default: return [...prospectaiLeads, ...hunterLeads];
        }
        startDate.setHours(0, 0, 0, 0);

        const allLeads = [...prospectaiLeads, ...hunterLeads];
        return allLeads.filter(lead => new Date(lead.createdAt) >= startDate);
    }, [prospectaiLeads, hunterLeads, period]);

    const companyMetrics = useMemo(() => {
        const metrics: Record<string, Metrics> = {};
        accessibleCompanies.forEach(company => {
            const companyLeads = filteredLeads.filter(l => l.companyId === company.id);
            metrics[company.id] = calculateMetrics(companyLeads, companyPipelines);
        });
        return metrics;
    }, [accessibleCompanies, filteredLeads, companyPipelines]);
    
    const groupTotalMetrics = useMemo(() => {
        const accessibleCompanyIds = new Set(accessibleCompanies.map(c => c.id));
        const groupLeads = filteredLeads.filter(l => accessibleCompanyIds.has(l.companyId));
        return calculateMetrics(groupLeads, companyPipelines);
    }, [accessibleCompanies, filteredLeads, companyPipelines]);
    
    const selectedCompany = useMemo(() => 
        accessibleCompanies.find(c => c.id === selectedCompanyId)
    , [accessibleCompanies, selectedCompanyId]);

    const salespersonMetrics = useMemo(() => {
        if (!selectedCompany) return [];
        
        const companyLeads = filteredLeads.filter(l => l.companyId === selectedCompany.id);
        const salespeople = teamMembers.filter(tm => tm.companyId === selectedCompany.id && tm.role === 'Vendedor');

        return salespeople.map(sp => {
            const spLeads = companyLeads.filter(l => l.salespersonId === sp.id);
            return {
                salesperson: sp,
                metrics: calculateMetrics(spLeads, companyPipelines)
            };
        });
    }, [selectedCompany, filteredLeads, teamMembers, companyPipelines]);

    const renderMetrics = (metrics: Metrics) => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <Kpi title="Total de Leads" value={metrics.totalLeads.toString()} icon={<UsersIcon />} />
            <Kpi title="Em Negociação" value={metrics.inNegotiation.toString()} icon={<BullseyeIcon />} />
            <Kpi title="Finalizados" value={metrics.finalized.toString()} icon={<BriefcaseIcon />} />
            <Kpi title="Convertidos" value={metrics.converted.toString()} icon={<CheckCircleIcon />} />
            <Kpi title="T.M. 1º Atendimento" value={formatDuration(metrics.avgFirstResponse)} icon={<ClockIcon />} />
            <Kpi title="T.M. 1º Feedback" value={formatDuration(metrics.avgFirstFeedback)} icon={<ClockIcon />} />
        </div>
    );
    
    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-dark-text">Análise de Métricas</h2>
                <div className="bg-dark-card p-1 rounded-lg border border-dark-border flex flex-wrap items-center gap-1">
                    <button onClick={() => setPeriod('last_7_days')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === 'last_7_days' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>7 Dias</button>
                    <button onClick={() => setPeriod('last_30_days')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === 'last_30_days' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>30 Dias</button>
                    <button onClick={() => setPeriod('this_month')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === 'this_month' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>Este Mês</button>
                    <button onClick={() => setPeriod('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === 'all' ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>Total</button>
                </div>
            </div>

            <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Métricas Gerais do Grupo</h3>
                {renderMetrics(groupTotalMetrics)}
            </Card>

            <div className="bg-dark-card rounded-2xl shadow-lg border border-dark-border p-6">
                 <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold">
                        {selectedCompany ? `Métricas por Vendedor - ${selectedCompany.name}` : 'Métricas por Empresa'}
                    </h3>
                    {selectedCompany && (
                         <button onClick={() => setSelectedCompanyId(null)} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text">
                            &larr; Voltar para visão geral
                        </button>
                    )}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-dark-border">
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider">{selectedCompany ? 'Vendedor' : 'Empresa'}</th>
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider text-center">Leads</th>
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider text-center">Em Negociação</th>
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider text-center">Finalizados</th>
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider text-center">Convertidos</th>
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider text-center">T.M. 1º Atend.</th>
                                <th className="p-3 font-semibold text-dark-secondary uppercase tracking-wider text-center">T.M. 1º Feed.</th>
                            </tr>
                        </thead>
                        <tbody>
                             {selectedCompany ? (
                                salespersonMetrics.map(({ salesperson, metrics }) => (
                                    <tr key={salesperson.id} className="border-b border-dark-border last:border-b-0 hover:bg-dark-background/50 transition-colors">
                                        <td className="p-3 flex items-center gap-3">
                                            <img src={salesperson.avatarUrl} alt={salesperson.name} className="w-8 h-8 rounded-full" />
                                            {salesperson.name}
                                        </td>
                                        <td className="p-3 text-center font-medium">{metrics.totalLeads}</td>
                                        <td className="p-3 text-center font-medium">{metrics.inNegotiation}</td>
                                        <td className="p-3 text-center font-medium">{metrics.finalized}</td>
                                        <td className="p-3 text-center font-bold text-green-400">{metrics.converted}</td>
                                        <td className="p-3 text-center font-medium">{formatDuration(metrics.avgFirstResponse)}</td>
                                        <td className="p-3 text-center font-medium">{formatDuration(metrics.avgFirstFeedback)}</td>
                                    </tr>
                                ))
                            ) : (
                                accessibleCompanies.map(company => (
                                     <tr key={company.id} onClick={() => setSelectedCompanyId(company.id)} className="border-b border-dark-border last:border-b-0 hover:bg-dark-background/50 transition-colors cursor-pointer">
                                        <td className="p-3 flex items-center gap-3">
                                            <img src={company.logoUrl} alt={company.name} className="w-8 h-8 rounded-full" />
                                            {company.name}
                                        </td>
                                        <td className="p-3 text-center font-medium">{companyMetrics[company.id]?.totalLeads || 0}</td>
                                        <td className="p-3 text-center font-medium">{companyMetrics[company.id]?.inNegotiation || 0}</td>
                                        <td className="p-3 text-center font-medium">{companyMetrics[company.id]?.finalized || 0}</td>
                                        <td className="p-3 text-center font-bold text-green-400">{companyMetrics[company.id]?.converted || 0}</td>
                                        <td className="p-3 text-center font-medium">{formatDuration(companyMetrics[company.id]?.avgFirstResponse || 0)}</td>
                                        <td className="p-3 text-center font-medium">{formatDuration(companyMetrics[company.id]?.avgFirstFeedback || 0)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GrupoMetricsScreen;
