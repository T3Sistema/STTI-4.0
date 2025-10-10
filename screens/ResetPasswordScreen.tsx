import React, { useState, useEffect, FormEvent } from 'react';
import { useData } from '../hooks/useMockData';
import { KeyIcon } from '../components/icons/KeyIcon';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { TriadLogo } from '../components/icons/TriadLogo';

const ResetPasswordScreen: React.FC = () => {
    const { resetPasswordWithToken } = useData();
    const [token, setToken] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError('Token de redefinição não encontrado ou inválido. Por favor, solicite um novo link.');
        }
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setError('');
        setMessage('');

        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);
        const result = await resetPasswordWithToken(token, newPassword);

        if (result.success) {
            setMessage(result.message);
        } else {
            setError(result.message);
        }

        setIsLoading(false);
    };

    const handleGoToLogin = () => {
        window.location.href = '/'; // Navigate to the root, which should be the login page.
    };

    return (
        <div className="min-h-screen flex flex-col bg-dark-background">
            <main className="flex-grow flex items-center justify-center px-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-dark-card rounded-3xl shadow-2xl border border-dark-border/50 animate-fade-in">
                    <div className="text-center space-y-4">
                        <TriadLogo className="w-20 h-20 mx-auto text-dark-primary" />
                        <h2 className="text-3xl font-extrabold text-dark-text">Redefinir Senha</h2>
                    </div>

                    {message ? (
                        <div className="text-center space-y-6">
                            <p className="text-green-400 p-3 bg-green-500/10 rounded-lg">{message}</p>
                            <button onClick={handleGoToLogin} className="w-full btn-primary">
                                Ir para Login
                            </button>
                        </div>
                    ) : (
                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                            <p className="text-dark-secondary text-center">Crie uma nova senha de acesso para sua conta.</p>
                            
                            <div className="relative">
                                <input 
                                    id="new-password" 
                                    name="new-password" 
                                    type={showPassword ? 'text' : 'password'}
                                    required 
                                    className="input-field pr-12"
                                    placeholder="Nova Senha" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    disabled={!token}
                                />
                                <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center px-4 text-dark-secondary hover:text-dark-primary"
                                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                                >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>

                            <div className="relative">
                                <input 
                                    id="confirm-password" 
                                    name="confirm-password" 
                                    type={showPassword ? 'text' : 'password'}
                                    required 
                                    className="input-field pr-12"
                                    placeholder="Confirme a Nova Senha" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    disabled={!token}
                                />
                            </div>

                            {error && <p className="text-center text-sm text-red-400 p-3 bg-red-500/10 rounded-lg">{error}</p>}
                            
                            <div>
                                <button 
                                    type="submit" 
                                    disabled={isLoading || !token}
                                    className="w-full btn-primary"
                                >
                                    {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
             <footer className="w-full text-center py-4 text-dark-secondary text-xs border-t border-dark-border/20 bg-dark-card/20 backdrop-blur-sm">
                Powered by: Triad3 Inteligência Digital - Chega de Imitações!
            </footer>
             <style>{`
                .input-field { position: relative; display: block; width: 100%; padding: 0.75rem 1rem; border: 1px solid #243049; color: #E0E0E0; background-color: #0A0F1E; border-radius: 0.5rem; }
                .input-field:focus { outline: none; box-shadow: 0 0 0 2px #00D1FF; }
                .btn-primary { padding: 0.75rem 1rem; border-radius: 0.5rem; background-color: #00D1FF; color: #0A0F1E; font-weight: bold; transition: opacity 0.2s; border: none; width: 100%; cursor: pointer; }
                .btn-primary:hover { opacity: 0.9; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default ResetPasswordScreen;