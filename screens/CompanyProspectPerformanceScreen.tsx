import React, { useMemo, useState } from 'react';
import { Company, TeamMember, ProspectAILead, HunterLead, PipelineStage } from '../types';
import Card from '../components/Card';
import ReactECharts from 'echarts-for-react';

// --- Helper Functions ---
const formatDuration = (ms: number): string => {
    if (ms < 0 || isNaN(ms)) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

const Kpi: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <Card className="p-5 text-center transition-transform duration-300 hover:scale-105">
        <p className="text-sm font-medium text-dark-secondary">{title}</p>
        <p className="text-4xl font-bold mt-2 text-dark-primary">{value}</p>
    </Card>
);

interface PerformanceScreenProps {
    company: Company;
    salespeople: TeamMember[];
    prospectaiLeads: ProspectAILead[];
    hunterLeads: HunterLead[];
    onBack: () => void;
}

type Period = 'last_7_days' | 'last_30_days' | 'this_month' | 'all' | 'custom';

const CompanyProspectPerformanceScreen: React.FC<PerformanceScreenProps> = ({ company, salespeople, prospectaiLeads, hunterLeads, onBack }) => {
    const [period, setPeriod] = useState<Period>('last_30_days');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
    });

    const companyPipeline = useMemo(() => company.pipeline_stages.filter(s => s.isEnabled).sort((a, b) => a.stageOrder - b.stageOrder), [company]);
    const finalizadosStageId = useMemo(() => companyPipeline.find(s => s.name === 'Finalizados')?.id, [companyPipeline]);

    const { filteredFarmLeads, filteredHunterLeads } = useMemo(() => {
        let startDate: Date, endDate: Date;
        const now = new Date();

        switch (period) {
            case 'last_7_days':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                endDate = now;
                break;
            case 'last_30_days':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
                endDate = now;
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'custom':
                startDate = new Date(customRange.start + 'T00:00:00');
                endDate = new Date(customRange.end + 'T23:59:59');
                break;
            case 'all':
            default:
                return { filteredFarmLeads: prospectaiLeads, filteredHunterLeads: hunterLeads };
        }
        
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const filterFn = (lead: ProspectAILead | HunterLead) => {
            const leadDate = new Date(lead.createdAt);
            return leadDate >= startDate && leadDate <= endDate;
        };

        return {
            filteredFarmLeads: prospectaiLeads.filter(filterFn),
            filteredHunterLeads: hunterLeads.filter(filterFn),
        };
    }, [prospectaiLeads, hunterLeads, period, customRange]);

    const metrics = useMemo(() => {
        const allLeads = [...filteredFarmLeads, ...filteredHunterLeads];
        const finalizedLeads = allLeads.filter(l => l.stage_id === finalizadosStageId);
        const convertedLeads = finalizedLeads.filter(l => l.outcome === 'convertido');

        const responseTimes = filteredFarmLeads
            .filter(l => l.prospected_at)
            .map(l => new Date(l.prospected_at!).getTime() - new Date(l.createdAt).getTime())
            .filter(t => t >= 0);

        return {
            totalLeads: allLeads.length,
            totalFinalized: finalizedLeads.length,
            totalConverted: convertedLeads.length,
            conversionRate: finalizedLeads.length > 0 ? (convertedLeads.length / finalizedLeads.length) * 100 : 0,
            avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        };
    }, [filteredFarmLeads, filteredHunterLeads, finalizadosStageId]);

    const salespersonRanking = useMemo(() => {
        return salespeople.map(sp => {
            const spFarmLeads = filteredFarmLeads.filter(l => l.salespersonId === sp.id);
            const spHunterLeads = filteredHunterLeads.filter(l => l.salespersonId === sp.id);
            const spAllLeads = [...spFarmLeads, ...spHunterLeads];
            
            const finalized = spAllLeads.filter(l => l.stage_id === finalizadosStageId);
            const converted = finalized.filter(l => l.outcome === 'convertido');

            const responseTimes = spFarmLeads
                .filter(l => l.prospected_at)
                .map(l => new Date(l.prospected_at!).getTime() - new Date(l.createdAt).getTime())
                .filter(t => t >= 0);

            return {
                id: sp.id,
                name: sp.name,
                avatarUrl: sp.avatarUrl,
                totalLeads: spAllLeads.length,
                totalFinalized: finalized.length,
                totalConverted: converted.length,
                conversionRate: finalized.length > 0 ? (converted.length / finalized.length) * 100 : 0,
                avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length : 0,
            };
        }).sort((a, b) => b.totalConverted - a.totalConverted || b.conversionRate - a.conversionRate || a.avgResponseTime - b.avgResponseTime);
    }, [salespeople, filteredFarmLeads, filteredHunterLeads, finalizadosStageId]);

    const pipelineChartData = useMemo(() => {
        const stageCounts = companyPipeline.reduce((acc, stage) => {
            acc[stage.name] = 0;
            return acc;
        }, {} as Record<string, number>);

        stageCounts['Convertidos'] = 0;
        stageCounts['Não Convertidos'] = 0;
        
        const allLeads = [...filteredFarmLeads, ...filteredHunterLeads];
        
        allLeads.forEach(lead => {
            const stage = companyPipeline.find(s => s.id === lead.stage_id);
            if(stage){
                if(stage.id === finalizadosStageId) {
                    if(lead.outcome === 'convertido') stageCounts['Convertidos']++;
                    else if (lead.outcome === 'nao_convertido') stageCounts['Não Convertidos']++;
                } else if (stageCounts.hasOwnProperty(stage.name)) {
                    stageCounts[stage.name]++;
                }
            }
        });
        
        const chartStages = companyPipeline.filter(s => s.name !== 'Finalizados');
        const data = chartStages.map(s => stageCounts[s.name]);
        data.push(stageCounts['Convertidos'], stageCounts['Não Convertidos']);

        const labels = [...chartStages.map(s => s.name), 'Convertidos', 'Não Convertidos'];

        return { labels, data };
    }, [filteredFarmLeads, filteredHunterLeads, companyPipeline, finalizadosStageId]);
    
    const leadsOverTimeData = useMemo(() => {
        const allLeads = [...filteredFarmLeads, ...filteredHunterLeads];
        if (allLeads.length === 0) return { labels: [], data: [] };
    
        const countsByDay: Record<string, number> = {};
        allLeads.forEach(lead => {
            const date = new Date(lead.createdAt).toISOString().split('T')[0];
            countsByDay[date] = (countsByDay[date] || 0) + 1;
        });
    
        const dates = Object.keys(countsByDay).map(d => new Date(d + 'T00:00:00'));
        if (dates.length === 0) return { labels: [], data: [] };
    
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        const labels: string[] = [];
        const data: number[] = [];
        const currentDate = new Date(minDate);
    
        while (currentDate <= maxDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            labels.push(currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            data.push(countsByDay[dateString] || 0);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return { labels, data };
    }, [filteredFarmLeads, filteredHunterLeads]);

    const baseChartOptions = {
        textStyle: { color: '#E0E0E0', fontFamily: 'Inter' },
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(16, 24, 44, 0.8)', borderColor: '#243049', textStyle: { color: '#E0E0E0' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    };
    
    const pipelineChartOption = {
        ...baseChartOptions,
        xAxis: { type: 'category', data: pipelineChartData.labels, axisLabel: { color: '#8A93A3', interval: 0, rotate: 30 } },
        yAxis: { type: 'value', axisLabel: { color: '#8A93A3' }, splitLine: { lineStyle: { color: '#243049', type: 'dashed' } }, minInterval: 1 },
        series: [{ data: pipelineChartData.data, type: 'bar', barWidth: '60%', itemStyle: { color: '#00D1FF', borderRadius: [5, 5, 0, 0] } }],
        tooltip: { ...baseChartOptions.tooltip, formatter: '{b}: {c} leads' }
    };
    
    const leadsOverTimeChartOption = {
        ...baseChartOptions,
        xAxis: { type: 'category', boundaryGap: false, data: leadsOverTimeData.labels, axisLine: { lineStyle: { color: '#243049' } } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#243049' } }, minInterval: 1 },
        series: [{ data: leadsOverTimeData.data, type: 'line', smooth: true, symbol: 'none', areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0, 209, 255, 0.5)' }, { offset: 1, color: 'rgba(0, 209, 255, 0)' }] } }, lineStyle: { color: '#00D1FF' } }],
        tooltip: { ...baseChartOptions.tooltip, formatter: '{b}: {c} leads' }
    };


    const periodOptions: { id: Period; label: string }[] = [
        { id: 'last_7_days', label: 'Últimos 7 dias' },
        { id: 'last_30_days', label: 'Últimos 30 dias' },
        { id: 'this_month', label: 'Este Mês' },
        { id: 'all', label: 'Todo o Período' },
        { id: 'custom', label: 'Personalizado' },
    ];
    
    return (
        <div className="animate-fade-in">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">&larr; Voltar para Visão Geral</button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Análise de Desempenho - Prospecção</h1>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                     <div className="bg-dark-card p-1 rounded-lg border border-dark-border flex flex-wrap items-center gap-1">
                        {periodOptions.map(opt => (
                            <button key={opt.id} onClick={() => setPeriod(opt.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === opt.id ? 'bg-dark-primary text-dark-background' : 'text-dark-secondary hover:bg-dark-border/50'}`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {period === 'custom' && (
                        <div className="flex items-center gap-2 animate-fade-in bg-dark-card p-1 rounded-lg border border-dark-border">
                            <input type="date" value={customRange.start} onChange={(e) => setCustomRange(r => ({...r, start: e.target.value}))} className="filter-date-input"/>
                            <span className="text-dark-secondary text-xs">até</span>
                            <input type="date" value={customRange.end} onChange={(e) => setCustomRange(r => ({...r, end: e.target.value}))} className="filter-date-input"/>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Kpi title="Total De Atendimentos" value={filteredFarmLeads.length.toString()} />
                <Kpi title="Leads Finalizados" value={metrics.totalFinalized.toString()} />
                <Kpi title="Leads Convertidos" value={metrics.totalConverted.toString()} />
                <Kpi title="Taxa de Sucesso (Finalizados)" value={`${metrics.conversionRate.toFixed(1)}%`} />
                <Kpi title="1º Contato (Média)" value={formatDuration(metrics.avgResponseTime)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <Card className="p-4">
                        <h2 className="text-xl font-bold text-dark-text mb-4">Pipeline de Leads da Empresa</h2>
                        <ReactECharts option={pipelineChartOption} style={{ height: '350px' }} notMerge={true} />
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="p-4">
                        <h2 className="text-xl font-bold text-dark-text mb-4">Leads ao Longo do Tempo</h2>
                        <ReactECharts option={leadsOverTimeChartOption} style={{ height: '350px' }} notMerge={true} />
                    </Card>
                </div>
            </div>

            <Card className="mt-6">
                <h2 className="text-xl font-bold text-dark-text p-4">Ranking de Vendedores</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-dark-card/50">
                            <tr>
                                <th className="p-3 font-semibold text-dark-secondary">#</th>
                                <th className="p-3 font-semibold text-dark-secondary">Vendedor</th>
                                <th className="p-3 font-semibold text-dark-secondary text-center">Leads Recebidos</th>
                                <th className="p-3 font-semibold text-dark-secondary text-center">Leads Finalizados</th>
                                <th className="p-3 font-semibold text-dark-secondary text-center">Conversões</th>
                                <th className="p-3 font-semibold text-dark-secondary text-center">Taxa de Sucesso</th>
                                <th className="p-3 font-semibold text-dark-secondary text-center">Tempo 1º Contato</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salespersonRanking.map((sp, index) => (
                                <tr key={sp.id} className="border-t border-dark-border hover:bg-dark-background/50">
                                    <td className="p-3 font-bold">{index + 1}</td>
                                    <td className="p-3 flex items-center gap-3">
                                        <img src={sp.avatarUrl} alt={sp.name} className="w-8 h-8 rounded-full" />
                                        <span>{sp.name}</span>
                                    </td>
                                    <td className="p-3 font-semibold text-center">{sp.totalLeads}</td>
                                    <td className="p-3 font-semibold text-center">{sp.totalFinalized}</td>
                                    <td className="p-3 font-bold text-green-400 text-center">{sp.totalConverted}</td>
                                    <td className="p-3 font-bold text-dark-primary text-center">{sp.conversionRate.toFixed(1)}%</td>
                                    <td className="p-3 font-semibold text-center">{formatDuration(sp.avgResponseTime)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <style>{`.filter-date-input { background-color: #10182C; border: 1px solid #243049; color: #E0E0E0; padding: 0.375rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 500; color-scheme: dark; }.filter-date-input::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }`}</style>
        </div>
    );
};

export default CompanyProspectPerformanceScreen;