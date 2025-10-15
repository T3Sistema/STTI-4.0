import React, { useMemo, useRef, useEffect } from 'react';
import { TeamMember } from '../types';
import { useData } from '../hooks/useMockData';

interface Message {
    id: string | number;
    text: string;
    sender: 'user' | 'monitor';
    timestamp: string;
}

interface AdminMonitorViewerProps {
    user: TeamMember;
}

const AdminMonitorViewer: React.FC<AdminMonitorViewerProps> = ({ user }) => {
    const { monitorChatHistory } = useData();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const userMessages = useMemo(() => {
        const history = monitorChatHistory
            .filter(msg => msg.user_id === user.id)
            .map(msg => ({
                id: msg.id,
                text: msg.message,
                sender: msg.sender as 'user' | 'monitor',
                timestamp: msg.created_at,
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (history.length === 0) {
            return [{ 
                id: 1, 
                text: `Olá ${user.name.split(' ')[0]}! Sou o Monitor, seu assistente de prospecção. Como posso te ajudar hoje?`, 
                sender: 'monitor' as 'monitor',
                timestamp: new Date().toISOString()
            }];
        }
        return history;
    }, [monitorChatHistory, user.id, user.name]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    useEffect(scrollToBottom, [userMessages]);

    return (
        <div className="h-[60vh] max-h-[500px] bg-dark-background border border-dark-border rounded-lg flex flex-col">
            <header className="flex items-center gap-3 p-3 border-b border-dark-border flex-shrink-0">
                <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                />
                <div>
                    <h4 className="font-bold text-dark-text">{user.name}</h4>
                    <p className="text-xs text-dark-secondary">Histórico do Monitor</p>
                </div>
            </header>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {userMessages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'monitor' && (
                            <img
                                src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png"
                                alt="Monitor Avatar"
                                className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                        )}
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                msg.sender === 'user'
                                    ? 'bg-dark-primary text-dark-background rounded-br-none'
                                    : 'bg-dark-border/50 text-dark-text rounded-bl-none'
                            }`}
                        >
                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                            <div 
                                className="text-right text-xs opacity-70 mt-1.5"
                                style={{ fontSize: '0.65rem', color: msg.sender === 'user' ? '#ffffffb3' : 'inherit' }}
                            >
                                {new Date(msg.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default AdminMonitorViewer;
