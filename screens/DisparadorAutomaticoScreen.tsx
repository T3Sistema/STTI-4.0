import React, { useState, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { useData } from '../hooks/useMockData';
import { TeamMember } from '../types';
import Card from '../components/Card';
import { DownloadIcon, PaperAirplaneIcon, UploadIcon, UserGroupIcon, PlusIcon, WhatsappIcon } from '../components/icons';
import Modal from '../components/Modal';

interface DisparadorAutomaticoScreenProps {
    user: TeamMember;
    onBack: () => void;
}

type ConnectionState = 'checking' | 'connected' | 'disconnected' | 'not_found' | 'error';
type ModalConnectionState = 'idle' | 'generating_qr' | 'showing_qr';


const DisparadorAutomaticoScreen: React.FC<DisparadorAutomaticoScreenProps> = ({ user, onBack }) => {
    const { hunterLeads, companies, getN8nWebhook } = useData();
    const activeCompany = useMemo(() => companies.find(c => c.id === user.companyId), [companies, user.companyId]);
    
    const [activeTab, setActiveTab] = useState<'fila' | 'planilha'>('fila');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [numberOfLeadsInput, setNumberOfLeadsInput] = useState('');
    const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

    const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('checking');
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [modalState, setModalState] = useState<ModalConnectionState>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [modalError, setModalError] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [isQrExpired, setIsQrExpired] = useState(false);

    const instanceName = useMemo(() => {
        const firstName = user.name.split(' ')[0];
        const role = user.role;
        const companyName = activeCompany?.name || 'empresa';
        return `${firstName}${role}${companyName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    }, [user, activeCompany]);
    
    const checkConnection = async () => {
        setConnectionStatus('checking');
        try {
            const webhookUrl = await getN8nWebhook('CHECK_WHATSAPP_INSTANCE_STATUS');
            if (!webhookUrl) {
                throw new Error('O serviço de verificação de status não foi configurado pelo administrador.');
            }
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName })
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `O servidor de verificação retornou um erro: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.status === 'connected') {
                setConnectionStatus('connected');
            } else if (data.status === 'disconnected') {
                setConnectionStatus('disconnected');
            } else if (data.status === 'not_found') {
                setConnectionStatus('not_found');
            } else {
                setConnectionStatus('disconnected');
            }

        } catch (err: any) {
            console.error("Falha ao verificar conexão:", err);
            setConnectionStatus('error');
        }
    };
    
    useEffect(() => {
        checkConnection();
    }, [instanceName]);

    const handleRefreshQrCode = async () => {
        setIsQrExpired(false);
        setModalState('generating_qr');
        setModalError('');
        setQrCodeUrl('');
        try {
            const webhookUrl = await getN8nWebhook('REFRESH_WHATSAPP_INSTANCE_QRCODE');
            if (!webhookUrl) throw new Error('O serviço para atualização de QR Code não foi configurado.');
            const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instanceName }) });
            if (!response.ok) {
                 const errorBody = await response.json().catch(() => ({ message: `Erro do servidor: ${response.statusText}` }));
                 throw new Error(errorBody.message || `Erro do servidor: ${response.statusText}`);
            }
            const data = await response.json();
            if (data && data.qrcode) {
                setQrCodeUrl(data.qrcode);
                setModalState('showing_qr');
                setCountdown(30);
            } else {
                throw new Error('A resposta para atualização do QR Code foi inválida.');
            }
        } catch (err: any) {
            setModalError(err.message);
            setModalState('idle');
        }
    };

    const handleGenerateQrCode = async () => {
        setModalState('generating_qr');
        setModalError('');
        setQrCodeUrl('');
        try {
            const webhookUrl = await getN8nWebhook('CREATE_WHATSAPP_INSTANCE');
            if (!webhookUrl) throw new Error('O serviço para criação de conexão não foi configurado.');
    
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName })
            });
    
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: `Erro do servidor: ${response.statusText}` }));
                throw new Error(errorBody.message || `Erro do servidor: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data && data.qrcode) {
                setQrCodeUrl(data.qrcode);
                setModalState('showing_qr');
                setCountdown(30);
            } else {
                throw new Error('A resposta do servidor não continha o QR code.');
            }
        } catch (err: any) {
            setModalError(err.message);
            setModalState('idle');
        }
    };

    useEffect(() => {
        if (isQrModalOpen) {
            setIsQrExpired(false);
            setModalError('');
            setQrCodeUrl('');

            if (connectionStatus === 'disconnected') {
                handleRefreshQrCode();
            } else {
                handleGenerateQrCode();
            }
        }
    }, [isQrModalOpen]);

    useEffect(() => {
        let timer: number;
        if (modalState === 'showing_qr' && !isQrExpired) {
            timer = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsQrExpired(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => window.clearInterval(timer);
    }, [modalState, isQrExpired]);

    const handleDisconnect = async () => {
        setIsActionLoading(true);
        try {
            const webhookUrl = await getN8nWebhook('DISCONNECT_WHATSAPP_INSTANCE');
            if (!webhookUrl) throw new Error('O serviço para desconectar não foi configurado.');

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName })
            });

            if (!response.ok) {
                 throw new Error("Não foi possível desconectar. Tente novamente.");
            }
            
            setConnectionStatus('disconnected');
            alert('WhatsApp desconectado com sucesso.');
        } catch (err: any) {
            alert(`Erro ao desconectar: ${err.message}`);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleCloseModal = () => {
        setIsQrModalOpen(false);
        setTimeout(() => {
            setModalState('idle');
            setModalError('');
            setQrCodeUrl('');
            checkConnection();
        }, 300);
    };

    const handleConnectClick = () => {
        setIsQrModalOpen(true);
    };

    const novosLeads = useMemo(() => {
        if (!activeCompany) return [];
        const novosLeadsStage = activeCompany.pipeline_stages.find(s => s.name === 'Novos Leads');
        if (!novosLeadsStage) return [];
        return hunterLeads.filter(l => l.salespersonId === user.id && l.stage_id === novosLeadsStage.id);
    }, [hunterLeads, user.id, activeCompany]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLeadIds(novosLeads.map(l => l.id));
            setNumberOfLeadsInput(String(novosLeads.length));
        } else {
            setSelectedLeadIds([]);
            setNumberOfLeadsInput('');
        }
    };

    const handleSelectLead = (leadId: string) => {
        setNumberOfLeadsInput('');
        setSelectedLeadIds(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        );
    };

    const handleNumberInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNumberOfLeadsInput(value);

        const count = parseInt(value, 10);
        if (!isNaN(count) && count >= 0) {
            const newIds = novosLeads.slice(0, count).map(lead => lead.id);
            setSelectedLeadIds(newIds);
        } else if (value === '') {
            setSelectedLeadIds([]);
        }
    };

    const insertVariable = (variable: string) => {
        const textarea = messageTextareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + ` ${variable} ` + text.substring(end);
            
            setMessage(newText);
            
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
            }, 0);
        }
    };

    const handleDisparar = () => {
        if (selectedLeadIds.length === 0 || !message.trim()) {
            alert('Selecione ao menos um lead e escreva uma mensagem para continuar.');
            return;
        }
        if (connectionStatus !== 'connected') {
            alert('Você precisa estar com o WhatsApp conectado para realizar o disparo.');
            return;
        }

        const selectedLeads = novosLeads.filter(l => selectedLeadIds.includes(l.id));
        let messagesToSend = '';
        selectedLeads.forEach(lead => {
            const leadNameParts = lead.leadName.split(' ');
            const firstName = leadNameParts[0];
            const lastName = leadNameParts.length > 1 ? leadNameParts[leadNameParts.length - 1] : '';

            const personalizedMessage = message
                .replace(/\[NOME\]/gi, firstName)
                .replace(/\[SOBRENOME\]/gi, lastName)
                .replace(/\[NOME COMPLETO\]/gi, lead.leadName);

            messagesToSend += `Enviando para ${lead.leadName} (${lead.leadPhone}):\n"${personalizedMessage}"\n\n`;
        });
        
        alert(`Disparo Simulado!\n\nAs seguintes ${selectedLeads.length} mensagens seriam enviadas:\n\n${messagesToSend}`);
    };

    const isAllSelected = novosLeads.length > 0 && selectedLeadIds.length === novosLeads.length;
    const canDisparar = selectedLeadIds.length > 0 && message.trim().length > 0 && connectionStatus === 'connected';

    const VariableButton: React.FC<{ variable: string, label: string }> = ({ variable, label }) => (
        <button
            type="button"
            onClick={() => insertVariable(variable)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-dark-border/50 hover:bg-dark-border text-dark-secondary hover:text-dark-text transition-colors"
        >
            <PlusIcon className="w-3 h-3" />
            {label}
        </button>
    );

    const renderConnectionStatusText = () => {
        switch(connectionStatus) {
            case 'checking': return <p className="text-sm font-semibold text-yellow-400">Verificando conexão...</p>;
            case 'connected': return <p className="text-sm font-semibold text-green-400">Conectado</p>;
            case 'disconnected':
            case 'not_found':
                return <p className="text-sm font-semibold text-red-400">Desconectado</p>;
            case 'error': return <p className="text-sm font-semibold text-red-400">Erro na conexão</p>;
        }
    };

    return (
        <div className="animate-fade-in">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm text-dark-secondary hover:text-dark-text mb-2">
                        &larr; Voltar para o Pipeline Hunter
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-dark-text">Disparador Automático</h1>
                </div>
            </header>

            <Card className="p-6 mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                           <WhatsappIcon className="w-7 h-7" />
                        </div>
                        <div>
                             <h2 className="text-xl font-bold text-dark-text">Conexão com WhatsApp</h2>
                             {renderConnectionStatusText()}
                        </div>
                    </div>
                    {connectionStatus === 'connected' ? (
                         <button onClick={handleDisconnect} disabled={isActionLoading} className="btn-secondary bg-red-500/20 text-red-300 hover:bg-red-500/30 w-full sm:w-auto">
                            {isActionLoading ? 'Desconectando...' : 'Desconectar WhatsApp'}
                        </button>
                    ) : (
                         <button onClick={handleConnectClick} disabled={connectionStatus === 'checking' || isActionLoading} className="btn-primary w-full sm:w-auto">
                            {connectionStatus === 'checking' || isActionLoading ? 'Aguarde...' : 'Conectar WhatsApp'}
                        </button>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-2">
                     <Card className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-dark-primary text-dark-background font-bold text-xl flex-shrink-0">1</div>
                            <h2 className="text-xl font-bold text-dark-text">Escreva sua Mensagem</h2>
                        </div>
                         <div className="pl-14 space-y-3">
                             <textarea
                                ref={messageTextareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={8}
                                className="w-full p-3 bg-dark-background border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dark-primary"
                                placeholder="Olá [NOME], tudo bem? Vi que você tem interesse..."
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-dark-secondary">Personalizar:</span>
                                <VariableButton variable="[NOME]" label="Inserir Nome" />
                                <VariableButton variable="[SOBRENOME]" label="Inserir Sobrenome" />
                                <VariableButton variable="[NOME COMPLETO]" label="Inserir Nome Completo" />
                            </div>
                        </div>
                    </Card>
                </div>

                 <Card className="p-6 h-full flex flex-col">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-dark-primary text-dark-background font-bold text-xl flex-shrink-0">2</div>
                        <h2 className="text-xl font-bold text-dark-text">Selecione os Leads</h2>
                    </div>
                     <div className="pl-14 flex-grow flex flex-col">
                         <div className="border-b border-dark-border">
                            <nav className="flex space-x-4">
                                <button onClick={() => setActiveTab('fila')} className={`py-2 px-4 text-sm font-semibold border-b-2 ${activeTab === 'fila' ? 'text-dark-primary border-dark-primary' : 'text-dark-secondary border-transparent hover:border-dark-border'}`}>
                                    Leads da Fila ({novosLeads.length})
                                </button>
                                <button onClick={() => setActiveTab('planilha')} className={`py-2 px-4 text-sm font-semibold border-b-2 ${activeTab === 'planilha' ? 'text-dark-primary border-dark-primary' : 'text-dark-secondary border-transparent hover:border-dark-border'}`}>
                                    Subir Planilha
                                </button>
                            </nav>
                        </div>
                         <div className="pt-4 flex-grow flex flex-col">
                            {activeTab === 'fila' && (
                                <div className="space-y-4 flex-grow flex flex-col">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-dark-background/50 rounded-lg">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded bg-dark-card border-dark-border text-dark-primary focus:ring-dark-primary" />
                                            <span className="text-sm font-semibold">Selecionar Todos</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-dark-secondary whitespace-nowrap">Disparar para os</span>
                                            <input 
                                                type="number"
                                                value={numberOfLeadsInput}
                                                onChange={handleNumberInputChange}
                                                min="0"
                                                max={novosLeads.length}
                                                className="w-20 px-2 py-1 bg-dark-card border border-dark-border rounded-md text-center focus:ring-dark-primary focus:border-dark-primary"
                                                placeholder="Nº"
                                            />
                                            <span className="text-sm font-semibold text-dark-secondary">primeiros</span>
                                        </div>
                                    </div>
                                    <div className="flex-grow max-h-80 overflow-y-auto space-y-2 p-2 bg-dark-background rounded-lg border border-dark-border">
                                        {novosLeads.map(lead => (
                                            <label key={lead.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-dark-card cursor-pointer">
                                                <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => handleSelectLead(lead.id)} className="h-4 w-4 rounded bg-dark-card border-dark-border text-dark-primary focus:ring-dark-primary" />
                                                <div className="flex-1">
                                                    <p className="font-semibold">{lead.leadName}</p>
                                                    <p className="text-xs text-dark-secondary">{lead.leadPhone} - {lead.source}</p>
                                                </div>
                                            </label>
                                        ))}
                                        {novosLeads.length === 0 && <p className="text-center p-8 text-dark-secondary">Não há novos leads na sua fila do modo Hunter.</p>}
                                    </div>
                                </div>
                            )}
                            {activeTab === 'planilha' && (
                                <div className="p-4 text-center flex-grow flex flex-col justify-center">
                                    <button onClick={() => alert('Download do template ainda não implementado.')} className="w-full max-w-sm mx-auto mb-4 flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-dark-border/50 hover:bg-dark-border transition-colors">
                                        <DownloadIcon className="w-4 h-4" />
                                        Baixar Planilha Exemplo (.csv)
                                    </button>
                                    <div className="w-full h-40 flex items-center justify-center bg-dark-background border-2 border-dashed border-dark-border rounded-md">
                                        <label htmlFor="csv-upload-disparador" className="cursor-pointer flex flex-col items-center gap-2 text-dark-secondary">
                                            <UploadIcon className="w-8 h-8"/>
                                            <span>Clique para selecionar uma planilha</span>
                                            <span className="text-xs">(.csv, .xls, .xlsx)</span>
                                        </label>
                                        <input id="csv-upload-disparador" type="file" className="sr-only" accept=".csv,.xls,.xlsx" onChange={() => alert('Upload ainda não implementado.')} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                 <Card className="p-6 h-full flex flex-col">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-dark-primary text-dark-background font-bold text-xl flex-shrink-0">3</div>
                        <h2 className="text-xl font-bold text-dark-text">Revise e Envie</h2>
                    </div>
                     <div className="pl-14 flex-grow flex flex-col justify-center">
                        <div className="p-4 bg-dark-background rounded-lg border border-dark-border text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-dark-secondary">
                               <UserGroupIcon className="w-5 h-5"/>
                               <p>Você está prestes a disparar a mensagem para <strong className="text-dark-primary">{selectedLeadIds.length} lead(s)</strong>.</p>
                            </div>
                            <button
                                onClick={handleDisparar}
                                disabled={!canDisparar}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-bold text-lg bg-dark-primary text-dark-background transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                                Confirmar e Disparar
                            </button>
                            <p className="text-xs text-center text-dark-secondary">As mensagens serão enviadas via WhatsApp (simulação).</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isQrModalOpen} onClose={handleCloseModal}>
                <div className="p-4 text-center">
                    <h2 className="text-2xl font-bold text-dark-text mb-4">Conectar com WhatsApp</h2>
                    
                    {modalError && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg my-4 text-sm">{modalError}</div>}

                    {modalState === 'generating_qr' && (
                         <div className="min-h-[300px] flex flex-col items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dark-primary"></div>
                            <span className="text-dark-text text-sm font-semibold">Gerando QR Code...</span>
                        </div>
                    )}

                    {modalState === 'showing_qr' && qrCodeUrl && (
                        <div className="space-y-4 animate-fade-in">
                            {!isQrExpired ? (
                                <>
                                    <p className="text-dark-secondary">Escaneie o QR Code com o seu celular para conectar.</p>
                                    <div className="relative p-4 bg-white rounded-lg inline-block border-4 border-dark-border shadow-lg">
                                        <img src={qrCodeUrl} alt="QR Code do WhatsApp" className="w-64 h-64 mx-auto" />
                                    </div>
                                    <div className="font-bold text-lg">Tempo restante: <span className={countdown <= 10 ? 'text-red-400' : 'text-dark-text'}>{countdown}s</span></div>
                                    <p className="text-xs text-dark-secondary text-left max-w-xs mx-auto space-y-1">
                                        <span>1. Abra o WhatsApp no seu celular.</span><br/>
                                        <span>2. Vá para Configurações &gt; Aparelhos conectados.</span><br/>
                                        <span>3. Toque em "Conectar um aparelho" e aponte a câmera.</span>
                                    </p>
                                    <button onClick={handleCloseModal} className="btn-primary mt-4 w-full">
                                        Já li o QR Code e conectei
                                    </button>
                                </>
                            ) : (
                                <div className="min-h-[300px] flex flex-col items-center justify-center gap-4">
                                    <p className="font-bold text-lg text-red-400">QR Code Expirado!</p>
                                    <p className="text-dark-secondary">O código expirou. Gere um novo ou confirme se você já conectou.</p>
                                    <button onClick={handleRefreshQrCode} className="btn-primary w-full">
                                        Gerar novo QR Code
                                    </button>
                                    <button onClick={handleCloseModal} className="btn-secondary mt-2 w-full">
                                        Já conectei
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
            <style>{`
                .btn-primary { display: flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #00D1FF; color: #0A0F1E; font-weight: bold; transition: opacity 0.2s; }
                .btn-primary:hover { opacity: 0.9; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #243049; color: #E0E0E0; font-weight: bold; transition: background-color 0.2s; }
                .btn-secondary:hover { background-color: #3e4c6e; }
            `}</style>
        </div>
    );
};

export default DisparadorAutomaticoScreen;