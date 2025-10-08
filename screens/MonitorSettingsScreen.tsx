import React, { useState, useEffect, FormEvent } from 'react';
import { useData } from '../hooks/useMockData';
import Card from '../components/Card';
import { MonitorSettings } from '../types';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { MonitorIcon } from '../components/icons/MonitorIcon';

const MonitorSettingsScreen: React.FC = () => {
    const { monitorSettings, updateMonitorSettings } = useData();
    const [prompt, setPrompt] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

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
    
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
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
        </div>
    );
};

export default MonitorSettingsScreen;