import React, { useState, FormEvent } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface AddHunterLeadFormProps {
    onSave: (name: string, phone: string, details: Record<string, string>) => Promise<void>;
    onClose: () => void;
}

const AddHunterLeadForm: React.FC<AddHunterLeadFormProps> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [details, setDetails] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleAddDetailField = () => {
        setDetails(prev => [...prev, '']);
    };

    const handleDetailChange = (index: number, value: string) => {
        const newDetails = [...details];
        newDetails[index] = value;
        setDetails(newDetails);
    };

    const handleRemoveDetailField = (index: number) => {
        setDetails(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const detailsObject = details.reduce((acc, detailValue, index) => {
                if (detailValue.trim()) {
                    acc[`Informação ${index + 1}`] = detailValue.trim();
                }
                return acc;
            }, {} as Record<string, string>);

            await onSave(name, phone, detailsObject);
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

            <div className="pt-4 border-t border-dark-border">
                <h3 className="text-lg font-semibold text-dark-text mb-2">Informações Adicionais</h3>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {details.map((detail, index) => (
                        <div key={index} className="flex items-center gap-2 animate-fade-in">
                            <input 
                                type="text" 
                                placeholder="Informação" 
                                value={detail}
                                onChange={(e) => handleDetailChange(index, e.target.value)}
                                className="input-field flex-1"
                            />
                            <button type="button" onClick={() => handleRemoveDetailField(index)} className="p-2 text-red-500/70 hover:text-red-500">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={handleAddDetailField} className="mt-2 flex items-center gap-2 text-sm font-semibold text-dark-primary hover:underline">
                    <PlusIcon className="w-4 h-4" /> Adicionar Informação
                </button>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-dark-border/50 hover:bg-dark-border font-bold">Cancelar</button>
                <button type="submit" disabled={isLoading || !name.trim() || !phone.trim()} className="px-4 py-2 rounded-md bg-dark-primary text-dark-background font-bold hover:opacity-90 disabled:opacity-50">
                    {isLoading ? 'Salvando...' : 'Salvar Lead'}
                </button>
            </div>
             <style>{`.input-field {position: relative; display: block; width: 100%; padding: 0.75rem 1rem; border: 1px solid #243049; color: #E0E0E0; background-color: #0A0F1E; border-radius: 0.5rem;}.input-field:focus {outline: none; box-shadow: 0 0 0 2px #00D1FF;}`}</style>
        </form>
    );
};

export default AddHunterLeadForm;