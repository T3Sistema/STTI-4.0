import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { ProspectAILead, TeamMember } from '../../types';
import Modal from '../Modal';
import { UploadIcon, XIcon } from '../icons';

interface TransferLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: ProspectAILead;
    salespeople: TeamMember[];
    onConfirm: (newOwnerId: string, feedbackText: string, images: string[]) => void;
}

const TransferLeadModal: React.FC<TransferLeadModalProps> = ({ isOpen, onClose, lead, salespeople, onConfirm }) => {
    const [selectedSalespersonId, setSelectedSalespersonId] = useState('');
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedSalespersonId('');
            setFeedbackText('');
            setFeedbackImages([]);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setFeedbackImages(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setFeedbackImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!feedbackText.trim() || !selectedSalespersonId) return;
        
        setIsSubmitting(true);
        onConfirm(selectedSalespersonId, feedbackText, feedbackImages);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-2 space-y-4">
                <h2 className="text-2xl font-bold text-center mb-2 text-dark-text">Transferir Atendimento</h2>
                <p className="text-center text-dark-secondary mb-6">
                    Registre o feedback e selecione para qual vendedor você deseja transferir o lead <strong className="text-dark-text">{lead?.leadName}</strong>.
                </p>

                <div>
                    <label className="block text-sm font-medium text-dark-secondary mb-1">Feedback (Obrigatório)</label>
                    <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm bg-dark-background border border-dark-border rounded-md"
                        placeholder="Descreva o motivo da transferência e o que já foi conversado..."
                        required
                    />
                </div>
                <div>
                    <label htmlFor={`transfer-image-upload-${lead.id}`} className="w-full cursor-pointer text-center bg-dark-background hover:bg-dark-border/50 border border-dark-border text-dark-text font-medium py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2">
                        <UploadIcon className="w-4 h-4" />
                        <span>Adicionar Imagens (Opcional)</span>
                    </label>
                    <input id={`transfer-image-upload-${lead.id}`} type="file" multiple className="sr-only" onChange={handleImageChange} accept="image/*" />
                </div>
                 {feedbackImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {feedbackImages.map((imgSrc, index) => (
                            <div key={index} className="relative group">
                                <img src={imgSrc} alt={`Preview ${index}`} className="w-full h-16 object-cover rounded-md" />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-dark-secondary mb-1">Transferir Para</label>
                    <select
                        value={selectedSalespersonId}
                        onChange={(e) => setSelectedSalespersonId(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-background border border-dark-border rounded-md"
                        required
                    >
                        <option value="">Selecione um vendedor...</option>
                        {salespeople.map(sp => (
                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                    </select>
                </div>
                 {salespeople.length === 0 && (
                    <p className="text-center text-sm text-yellow-400">Nenhum outro vendedor disponível para transferência.</p>
                )}
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 font-bold rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !feedbackText.trim() || !selectedSalespersonId}
                        className="px-5 py-2.5 font-bold rounded-lg bg-indigo-600 text-white transition-opacity hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Transferindo...' : 'Confirmar Transferência'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TransferLeadModal;