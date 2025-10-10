import React, { useMemo, useState } from 'react';
import { TeamMember, HunterLead, PipelineStage } from '../types';
import { useData } from '../hooks/useMockData';
import Card from '../components/Card';
import ImageLightbox from '../components/ImageLightbox';
import ReactECharts from 'echarts-for-react';
import { PlusIcon } from '../components/icons/PlusIcon';
import { BullseyeIcon } from '../components/icons/BullseyeIcon';
import { ChatBubbleOvalLeftEllipsisIcon } from '../components/icons/ChatBubbleOvalLeftEllipsisIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XIcon } from '../components/icons/XIcon';
import Modal from '../components/Modal';
import { formatDuration } from '../utils/dateUtils';
import { ClockIcon } from '../components/icons/ClockIcon';

// --- Helper Functions ---
const calculatePerformanceMetrics = (leads: HunterLead[], companyPipeline: PipelineStage[]) => {
    const finalizadosStage = companyPipeline.find(s => s.name === 'Finalizados');
    const finalizedLeads = finalizadosStage ? leads.filter(l => l.stage_id === finalizadosStage.id) : [];

    const converted = finalizedLeads.filter(l => l.outcome === 'convertido');
    const notConverted = finalizedLeads.filter(l => l.outcome === 'nao_convertido');
    
    const prospected = leads.filter(l => l.prospected_at);

    const conversionRate = finalizedLeads.length > 0 ? (converted.length / finalizedLeads.length) * 100 : 0;

    const responseTimes = prospected
        .map(l => new Date(l.prospected_at!).getTime() - new Date(l.createdAt).getTime())
        .filter(t => t >= 0);
    
    const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    const closingTimes = finalizedLeads
        .filter(l => l.prospected_at && l.lastActivity)
        .map(l => new Date(l.lastActivity!).getTime() - new Date(l.prospected_at!).getTime())
        .filter(t => t >= 0);

    const avgClosingTime = closingTimes.length > 0 ? closingTimes.reduce((a, b) => a + b, 0) / closingTimes.length : 0;
    
    const stageMap = companyPipeline.reduce((acc, stage) => {
        acc[stage.id] = stage.name;
        return acc;
    }, {} as Record<string, string>);

    const allFeedbacks = leads
        .flatMap(l => {
            if (!l.feedback) return [];
            return l.feedback.map(f => {
                const stageName = stageMap[f.stageId || l.stage_id] || 'Desconhecido';
                return { ...f, lead: l, leadStatus: stageName };
            });
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


    return {
        totalLeads: leads.length,
        totalConverted: converted.length,
        totalNotConverted: notConverted.length,
        conversionRate,
        avgResponseTime,
        avgClosingTime,
        allFeedbacks
    };
};

const Kpi: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <Card className="p-5 text-center transition-transform duration-300 hover:scale-105">
        <p className="text-sm font-medium text-dark-secondary">{title}</p>
        <p className="text-4xl font-bold mt-2 text-dark-primary">{value}</p>
    </Card>
);

interface PerformanceScreenProps {
    user: TeamMember;
    leads: HunterLead[];
    onBack: () => void;
    allSalespeople: TeamMember[];
}

type Period = 'all' | 'custom';

const generateHunterLeadEvents = (lead: HunterLead, pipeline: PipelineStage[]) => {
    const events: any[] = [];
    events.push({ type: 'creation', date: new Date(lead.createdAt), text: 'Lead recebido', icon: <PlusIcon className="w-4 h-4 text-blue-400" /> });
    if (lead.prospected_at) events.push({ type: 'prospecting', date: new Date(lead.prospected_at), text: 'Prospecção iniciada', icon: <BullseyeIcon className="w-4 h-4 text-yellow-400" /> });
    if (lead.feedback) lead.feedback.forEach(feedbackItem => {
        const stage = pipeline.find(s => s.id === feedbackItem.stageId);
        events.push({ type: 'feedback', date: new Date(feedbackItem.createdAt), text: feedbackItem.text, images: feedbackItem.images, stageName: stage ? stage.name : null, icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-gray-400" /> });
    });
    if (lead.outcome && lead.lastActivity) {
        const outcomeText = lead.outcome === 'convertido' ? 'Convertido' : 'Não Convertido';
        const icon = lead.outcome === 'convertido' ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <XIcon className="w-4 h-4 text-red-400" />;
        events.push({ type: 'finalization', date: new Date(lead.lastActivity), text: `Lead finalizado - ${outcomeText}`, icon: icon });
    }
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
};

const HunterLeadHistoryTimeline: React.FC<{ lead: HunterLead, pipeline: PipelineStage[], onImageClick: (url: string) => void }> = ({ lead, pipeline, onImageClick }) => {
    const events = useMemo(() => generateHunterLeadEvents(lead, pipeline), [lead, pipeline]);

    return (
        <div className="p-2">
            <h2 className="text-2xl font-bold text-center mb-6">Histórico do Lead: {lead.leadName}</h2>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="relative pl-5 py-2">
                    <div className="absolute left-2.5 top-0 h-full w-0.5 bg-dark-border"></div>
                    {events.map((event, eventIndex) => {
                        let durationString: string | null = null;
                        if (eventIndex > 0) {
                            const prevEvent = events[eventIndex - 1];
                            const durationMs = event.date.getTime() - prevEvent.date.getTime();
                            if (durationMs >= 1000) {
                                durationString = formatDuration(durationMs);
                            }
                        }
                        return(
                            <div key={eventIndex} className={`relative ${eventIndex === events.length - 1 ? '' : 'pb-4'}`}>
                                <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-dark-card border-2 border-dark-border flex items-center justify-center">
                                    {event.icon}
                                </div>
                                <div className="pl-4">
                                    <p className="text-xs text-dark-secondary">{event.date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="text-sm font-medium text-dark-text mt-1 whitespace-pre-wrap">{event.text}</p>
                                    {(durationString || (event.type === 'feedback' && event.stageName)) && (
                                        <div className="flex items-center gap-4 mt-1.5">
                                            {durationString && (
                                                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    <span>{`Após ${durationString}`}</span>
                                                </p>
                                            )}
                                            {event.type === 'feedback' && event.stageName && (
                                                <p className="text-xs font-semibold text-cyan-400">
                                                    na etapa: {event.stageName}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {event.type === 'feedback' && event.images && event.images.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {event.images.map((img: string, i: number) => (
                                                <button key={i} onClick={() => onImageClick(img)} className="block w-12 h-12 rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-dark-primary">
                                                    <img src={img} alt="feedback" className="w-full h-full object-cover"/>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


const SalespersonHunterPerformanceScreen: React.FC<PerformanceScreenProps> = ({ user, leads, onBack, allSalespeople }) => {
    const { companies } = useData();
    const [period, setPeriod] = useState<Period>('all');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
    });
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [historyModalLead, setHistoryModalLead] = useState<HunterLead | null>(null);

    const activeCompany = useMemo(() => companies.find(c => c.id === user.companyId), [companies, user.companyId]);
    const companyPipeline = useMemo(() => activeCompany?.pipeline_stages.filter(s => s.isEnabled).sort((a, b) => a.stageOrder - b.stageOrder) || [], [activeCompany]);

    const filteredLeads = useMemo(() => {
        if (period === 'all') return leads;
        if (period === 'custom') {
            if (!customRange.start || !customRange.end) return [];
            const startDate = new Date(customRange.start + 'T00:00:00');
            const endDate = new Date(customRange.end + 'T23:59:59.999');
            return leads.filter(lead => {
                const leadDate = new Date(lead.createdAt);
                return leadDate >= startDate && leadDate <= endDate;
            });
        }
        return leads;
    }, [leads, period, customRange]);

    const metrics = useMemo(() => calculatePerformanceMetrics(filteredLeads, companyPipeline), [filteredLeads, companyPipeline]);
    const finalizedCount = metrics.totalConverted + metrics.totalNotConverted;
    
    const barChartData = useMemo(() => {
        const stageCounts: Record<string, number> = {};
        const stageOrderMap = new Map<string, number>();

        companyPipeline.forEach(stage => {
            if (stage.isEnabled && stage.name !== 'Finalizados' && stage.name !== 'Remanejados') {
                stageCounts[stage.name] = 0;
                stageOrderMap.set(stage.name, stage.stageOrder);
            }
        });
        stageCounts['Convertidos'] = 0;
        stageCounts['Não Convertidos'] = 0;
        stageOrderMap.set('Convertidos', 100);
        stageOrderMap.set('Não Convertidos', 101);

        const finalizadosStageId = companyPipeline.find(s => s.name === 'Finalizados')?.id;

        for (const lead of filteredLeads) {
            const stage = companyPipeline.find(s => s.id === lead.stage_id);
            if (stage) {
                if (stage.id === finalizadosStageId) {
                    if (lead.outcome === 'convertido') stageCounts['Convertidos']++;
                    else if (lead.outcome === 'nao_convertido') stageCounts['Não Convertidos']++;
                } else if (stageCounts.hasOwnProperty(stage.name)) {
                    (stageCounts as any)[stage.name]++;
                }
            }
        }
        
        const data = Object.entries(stageCounts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => stageOrderMap.has(item.name))
            .sort((a, b) => (stageOrderMap.get(a.name) ?? 999) - (stageOrderMap.get(b.name) ?? 999));

        return data;
    }, [filteredLeads, companyPipeline]);


    const leadsOverTimeData = useMemo(() => {
        if (filteredLeads.length === 0) return [];
        const leadsByDate = filteredLeads.reduce((acc, lead) => {
            const date: string = new Date(lead.createdAt).toISOString().slice(0, 10);
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const dates = Object.keys(leadsByDate).map(d => new Date(d));
        if(dates.length === 0) return [];

        const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

        let currentDate = new Date(startDate);
        const fullRangeData = [];
        while(currentDate <= endDate){
            const dateString = currentDate.toISOString().slice(0, 10);
            fullRangeData.push([dateString, leadsByDate[dateString] || 0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return fullRangeData;
    }, [filteredLeads]);
    
    const chartOptions = {
        base: {
            textStyle: { color: '#E0E0E0', fontFamily: 'Inter' },
            tooltip: { trigger: 'item', backgroundColor: 'rgba(16, 24, 44, 0.8)', borderColor: '#243049', textStyle: { color: '#E0E0E0' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        },
        pipeline: {
            xAxis: {
                type: 'category',
                data: barChartData.map(d => d.name),
                axisLabel: {
                    color: '#8A93A3',
                    interval: 0,
                    rotate: 0,
                    fontSize: 10,
                    formatter: (value: string) => {
                        return value.replace(/ /g, '\n');
                    }
                },
                axisLine: { lineStyle: { color: '#243049' } }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#8A93A3' },
                splitLine: { lineStyle: { color: '#243049', type: 'dashed' } },
                minInterval: 1,
            },
            series: [{
                data: barChartData.map(d => d.value),
                type: 'bar',
                barWidth: '60%',
                itemStyle: { color: '#00D1FF', borderRadius: [5, 5, 0, 0] },
                emphasis: { itemStyle: { color: '#00AEEF' } }
            }],
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c} leads' },
        },
        leadsOverTime: {
            xAxis: { type: 'category', boundaryGap: false, data: leadsOverTimeData.map(d => d[0]), axisLine: { lineStyle: { color: '#243049' } } },
            yAxis: { type: 'value', splitLine: { lineStyle: { color: '#243049' } }, minInterval: 1 },
            series: [{
                data: leadsOverTimeData.map(d => d[1]),
                type: 'line', smooth: true, symbol: 'none',
                areaStyle: {
                    color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0, 209, 255, 0.5)' }, { offset: 1, color: 'rgba(0, 209, 255, 0)' }] }
                },
                lineStyle: { color: '#00D1FF' }
            }]
        },
    };
    const periodOptions: { id: Period; label: string }[] = [
        { id: 'all', label: 'Todo o Período' },
        { id: 'custom', label: 'Personalizado' },
    ];
    return (
        <div className="animate-fade-in">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                        &larr; Voltar ao Pipeline Hunter
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Análise de Desempenho (Hunter)</h1>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Kpi title="Total de Leads" value={metrics.totalLeads.toString()} />
                <Kpi title="Leads Convertidos" value={metrics.totalConverted.toString()} />
                <Kpi title="Taxa de Sucesso (Finalizados)" value={`${metrics.conversionRate.toFixed(1)}%`} />
                <Kpi title="Resposta (Média)" value={formatDuration(metrics.avgResponseTime)} />
                <Kpi title="Fechamento (Média)" value={formatDuration(metrics.avgClosingTime)} />
                <Kpi title="Leads Finalizados" value={finalizedCount.toString()} />
            </div>
            
            <div className="grid grid-cols-1 gap-6 mb-6">
                 <Card className="p-4">
                     <h2 className="text-xl font-bold text-dark-text mb-4">Pipeline de Leads</h2>
                     <ReactECharts option={{ ...chartOptions.base, ...chartOptions.pipeline }} style={{ height: '400px' }} />
                 </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card className="p-4 overflow-hidden">
                     <h2 className="text-xl font-bold text-dark-text mb-4">Leads ao Longo do Tempo</h2>
                     <ReactECharts option={{ ...chartOptions.base, ...chartOptions.leadsOverTime }} style={{ height: '300px' }} />
                 </Card>
                 <Card className="p-4">
                     <h2 className="text-xl font-bold text-dark-text mb-4">Feedbacks Recentes</h2>
                     <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {metrics.allFeedbacks.slice(0, 10).map((fb, index) => {
                             const events = generateHunterLeadEvents(fb.lead, companyPipeline);
                             const eventIndex = events.findIndex(e => e.type === 'feedback' && e.date.toISOString() === fb.createdAt);
                             let durationString: string | null = null;
                             if (eventIndex > 0) {
                                 const prevEvent = events[eventIndex - 1];
                                 const durationMs = new Date(fb.createdAt).getTime() - prevEvent.date.getTime();
                                 if (durationMs >= 1000) {
                                     durationString = formatDuration(durationMs);
                                 }
                             }

                            return (
                                <div 
                                    key={index}
                                    onClick={() => setHistoryModalLead(fb.lead)}
                                    className="p-3 bg-dark-background/50 rounded-md border border-dark-border/50 cursor-pointer hover:border-dark-primary/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-dark-secondary">
                                                Lead: <span className="font-semibold text-dark-text">{fb.lead.leadName}</span>
                                                {fb.leadStatus && fb.leadStatus !== 'Desconhecido' && (
                                                    <span className="font-semibold text-cyan-400 ml-2">
                                                        (na etapa: {fb.leadStatus})
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-sm text-dark-text mt-1 truncate" title={fb.text}>{fb.text}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-xs text-dark-secondary">
                                                {new Date(fb.createdAt).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                            </p>
                                            {durationString && (
                                                <p className="text-xs font-semibold text-amber-400 mt-1 text-right">
                                                    {`Após ${durationString}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {metrics.allFeedbacks.length === 0 && <p className="text-center text-dark-secondary py-8">Nenhum feedback no período.</p>}
                     </div>
                 </Card>
            </div>
            
            <Modal isOpen={!!historyModalLead} onClose={() => setHistoryModalLead(null)}>
                {historyModalLead && <HunterLeadHistoryTimeline lead={historyModalLead} pipeline={companyPipeline} onImageClick={setExpandedImageUrl}/>}
            </Modal>

            {expandedImageUrl && <ImageLightbox imageUrl={expandedImageUrl} onClose={() => setExpandedImageUrl(null)} />}

             <style>{`
                .filter-date-input { background-color: #10182C; border: 1px solid #243049; color: #E0E0E0; padding: 0.375rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 500; color-scheme: dark; }
                .filter-date-input::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
            `}</style>
        </div>
    );
};

export default SalespersonHunterPerformanceScreen;