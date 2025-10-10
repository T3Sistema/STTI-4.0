import React, { useState, useEffect, FormEvent } from 'react';
import { useData } from '../../hooks/useMockData';

const WebhooksTab: React.FC = () => {
    const { getN8nWebhook, updateN8nWebhook } = useData();
    const [webhookUrl, setWebhookUrl] = useState('');
    const [appBaseUrl, setAppBaseUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchUrls = async () => {
            setIsLoading(true);
            try {
                const [webhook, base] = await Promise.all([
                    getN8nWebhook('password_reset'),
                    getN8nWebhook('app_base_url'),
                ]);
                setWebhookUrl(webhook || '');
                setAppBaseUrl(base || '');
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