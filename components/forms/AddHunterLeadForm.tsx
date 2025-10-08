import React, { useState, FormEvent } from 'react';

interface AddHunterLeadFormProps {
    onSave: (name: string, phone: string) => Promise<void>;
    onClose: () => void;
}

const AddHunterLeadForm: React.FC<AddHunterLeadFormProps> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(name, phone);
            onClose();
        } catch (error) {
            console.error("Failed to save lead:", error);
            alert('Ocorreu um erro ao salvar o lead. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
            <h2 className="text-2xl font-bold text-center mb-6">Cadastrar Lead Captado</h2>
            <div>
                <label htmlFor="leadName" className="block text-sm font-medium text-dark-secondary mb-1">Nome do Lead</label>
                <input
                    type="text"
                    id="leadName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                    required
                    autoFocus
                />
            </div>
            <div>
                <label htmlFor="leadPhone" className="block text-sm font-medium text-dark-secondary mb-1">Telefone (WhatsApp)</label>
                <input
                    type="tel"
                    id="leadPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md focus:ring-dark-primary focus:border-dark-primary"
                    placeholder="(11) 99999-9999"
                    required
                />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-dark-border/50 hover:bg-dark-border font-bold">Cancelar</button>
                <button type="submit" disabled={isLoading || !name.trim() || !phone.trim()} className="px-4 py-2 rounded-md bg-dark-primary text-dark-background font-bold hover:opacity-90 disabled:opacity-50">
                    {isLoading ? 'Salvando...' : 'Salvar Lead'}
                </button>
            </div>
        </form>
    );
};

export default AddHunterLeadForm;
