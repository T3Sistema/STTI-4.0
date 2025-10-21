import React, { useState, useEffect, FormEvent } from 'react';
import { useData } from '../../hooks/useMockData';

const WebhooksTab: React.FC = () => {
    const { getN8nWebhook, updateN8nWebhook } = useData();
    const [webhookUrl, setWebhookUrl] = useState('');
    const [appBaseUrl, setAppBaseUrl] = useState('');
    const [reportWebhookUrl, setReportWebhookUrl] = useState('');
    const [createInstanceWebhookUrl, setCreateInstanceWebhookUrl] = useState('');
    const [refreshQrCodeWebhookUrl, setRefreshQrCodeWebhookUrl] = useState('');
    const [checkInstanceWebhookUrl, setCheckInstanceWebhookUrl] = useState('');
    const [disconnectInstanceWebhookUrl, setDisconnectInstanceWebhookUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchUrls = async () => {
            setIsLoading(true);
            try {
                const [
                    webhook,
                    base,
                    reportWebhook,
                    createInstanceWebhook,
                    refreshQrWebhook,
                    checkInstanceWebhook,
                    disconnectInstanceWebhook
                ] = await Promise.all([
                    getN8nWebhook('password_reset'),
                    getN8nWebhook('app_base_url'),
                    getN8nWebhook('RELATORIO_DIARIO_PROSPECCAO'),
                    getN8nWebhook('CREATE_WHATSAPP_INSTANCE'),
                    getN8nWebhook('REFRESH_WHATSAPP_INSTANCE_QRCODE'),
                    getN8nWebhook('CHECK_WHATSAPP_INSTANCE_STATUS'),
                    getN8nWebhook('DISCONNECT_WHATSAPP_INSTANCE'),
                ]);
                setWebhookUrl(webhook || '');
                setAppBaseUrl(base || '');
                setReportWebhookUrl(reportWebhook || '');
                setCreateInstanceWebhookUrl(createInstanceWebhook || '');
                setRefreshQrCodeWebhookUrl(refreshQrWebhook || '');
                setCheckInstanceWebhookUrl(checkInstanceWebhook || '');
                setDisconnectInstanceWebhookUrl(disconnectInstanceWebhook || '');
            } catch (err) {
                setError('Falha ao carregar configurações.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUrls();
    }, [getN8nWebhook]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await Promise.all([
                updateN8nWebhook('password_reset', webhookUrl),
                updateN8nWebhook('app_base_url', appBaseUrl),
                updateN8nWebhook('RELATORIO_DIARIO_PROSPECCAO', reportWebhookUrl),
                updateN8nWebhook('CREATE_WHATSAPP_INSTANCE', createInstanceWebhookUrl),
                updateN8nWebhook('REFRESH_WHATSAPP_INSTANCE_QRCODE', refreshQrCodeWebhookUrl),
                updateN8nWebhook('CHECK_WHATSAPP_INSTANCE_STATUS', checkInstanceWebhookUrl),
                updateN8nWebhook('DISCONNECT_WHATSAPP_INSTANCE', disconnectInstanceWebhookUrl),
            ]);
            setSuccess('Configurações salvas com sucesso!');
        } catch (err: any) {
            setError(err.message || 'Falha ao salvar as URLs.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-xl font-bold text-center">Configuração de Webhooks e URLs</h3>
            <div>
                <label htmlFor="webhookUrl" className="label-style">URL do Webhook de Recuperação de Senha (n8n)</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">Este é o endpoint que será chamado quando um usuário solicitar a redefinição de senha.</p>
                <input
                    type="url"
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://seu.n8n.cloud/webhook/..."
                    disabled={isLoading}
                />
            </div>

             <div>
                <label htmlFor="appBaseUrl" className="label-style">URL Base da Aplicação</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">
                    Esta é a URL principal do seu sistema (ex: https://meusistema.com). Será usada para gerar o link de redefinição de senha.
                </p>
                <input
                    type="url"
                    id="appBaseUrl"
                    value={appBaseUrl}
                    onChange={e => setAppBaseUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://sua-aplicacao.com"
                    disabled={isLoading}
                />
            </div>
            
             <div>
                <label htmlFor="reportWebhookUrl" className="label-style">URL do Webhook do Relatório Diário (n8n)</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">
                    Endpoint que receberá os dados de prospecção das empresas todos os dias às 18:00.
                </p>
                <input
                    type="url"
                    id="reportWebhookUrl"
                    value={reportWebhookUrl}
                    onChange={e => setReportWebhookUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://seu.n8n.cloud/webhook/relatorio-diario"
                    disabled={isLoading}
                />
            </div>

            <div>
                <label htmlFor="createInstanceWebhookUrl" className="label-style">URL do Webhook de Criação de Instância WhatsApp (n8n)</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">
                    Endpoint que será chamado para criar uma nova instância do WhatsApp na Evolution API.
                </p>
                <input
                    type="url"
                    id="createInstanceWebhookUrl"
                    value={createInstanceWebhookUrl}
                    onChange={e => setCreateInstanceWebhookUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://seu.n8n.cloud/webhook/criar-instancia"
                    disabled={isLoading}
                />
            </div>
            
            <div>
                <label htmlFor="refreshQrCodeWebhookUrl" className="label-style">URL do Webhook de Atualização do QR Code (n8n)</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">
                    Endpoint para solicitar um novo QR Code quando o anterior expirar.
                </p>
                <input
                    type="url"
                    id="refreshQrCodeWebhookUrl"
                    value={refreshQrCodeWebhookUrl}
                    onChange={e => setRefreshQrCodeWebhookUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://seu.n8n.cloud/webhook/atualizar-qrcode"
                    disabled={isLoading}
                />
            </div>

            <div>
                <label htmlFor="checkInstanceWebhookUrl" className="label-style">Webhook de Verificação de Status da Instância (n8n)</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">
                    Endpoint que verifica se a instância do WhatsApp de um vendedor está conectada.
                </p>
                <input
                    type="url"
                    id="checkInstanceWebhookUrl"
                    value={checkInstanceWebhookUrl}
                    onChange={e => setCheckInstanceWebhookUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://seu.n8n.cloud/webhook/verificar-status"
                    disabled={isLoading}
                />
            </div>
            
            <div>
                <label htmlFor="disconnectInstanceWebhookUrl" className="label-style">Webhook para Desconectar Instância (n8n)</label>
                <p className="text-xs text-dark-secondary/70 mb-2 -mt-1">
                    Endpoint que remove/desconecta uma instância do WhatsApp na Evolution API.
                </p>
                <input
                    type="url"
                    id="disconnectInstanceWebhookUrl"
                    value={disconnectInstanceWebhookUrl}
                    onChange={e => setDisconnectInstanceWebhookUrl(e.target.value)}
                    required
                    className="input-style"
                    placeholder="https://seu.n8n.cloud/webhook/desconectar-instancia"
                    disabled={isLoading}
                />
            </div>


            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            {success && <p className="text-sm text-green-400 text-center">{success}</p>}

            <div className="flex justify-end pt-4">
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="px-4 py-2 rounded-md bg-dark-primary text-dark-background font-bold hover:opacity-90 disabled:opacity-50"
                >
                    {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </button>
            </div>

            <style>{`
                .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #8A93A3; margin-bottom: 0.25rem; }
                .input-style { width: 100%; padding: 0.5rem 0.75rem; background-color: #0A0F1E; border: 1px solid #243049; border-radius: 0.375rem; color: #E0E0E0; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #00D1FF; }
            `}</style>
        </form>
    );
};

export default WebhooksTab;