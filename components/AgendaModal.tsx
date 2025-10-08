import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { ProspectAILead, HunterLead } from '../types';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface AgendaModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointments: (ProspectAILead | HunterLead)[];
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AgendaModal: React.FC<AgendaModalProps> = ({ isOpen, onClose, appointments }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    useEffect(() => {
        if (isOpen) {
            // Quando o modal abre, reseta a visualização para o mês e dia atuais.
            const today = new Date();
            setCurrentDate(today);
            setSelectedDate(today);
        } else {
            setSelectedDate(null);
        }
    }, [isOpen]);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const appointmentsByDate = useMemo(() => {
        const map = new Map<string, (ProspectAILead | HunterLead)[]>();
        appointments.forEach(app => {
            if (app.appointment_at) {
                const date = new Date(app.appointment_at); // Interpreta a data no fuso horário local.
                // Cria uma chave YYYY-MM-DD baseada na data local, evitando erros de fuso.
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const dayOfMonth = String(date.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${dayOfMonth}`;
                
                if (!map.has(dateString)) {
                    map.set(dateString, []);
                }
                map.get(dateString)?.push(app);
            }
        });
        return map;
    }, [appointments]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const handleDateClick = (day: number) => {
        setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    };
    
    const appointmentsForSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayOfMonth}`;
        
        const apps = appointmentsByDate.get(dateString) || [];
        apps.sort((a,b) => new Date(a.appointment_at!).getTime() - new Date(b.appointment_at!).getTime());
        return apps;
    }, [selectedDate, appointmentsByDate]);

    const calendarDays = [];
    const today = new Date();

    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(<div key={`empty-start-${i}`} className="p-2"></div>);
    }
    for (let day = 1; day <= totalDays; day++) {
        // Usa a mesma lógica de chave para garantir consistência.
        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasAppointment = appointmentsByDate.has(dateString);

        const isToday = day === today.getDate() &&
                      currentDate.getMonth() === today.getMonth() &&
                      currentDate.getFullYear() === today.getFullYear();

        const isSelected = selectedDate &&
                         day === selectedDate.getDate() &&
                         currentDate.getMonth() === selectedDate.getMonth() &&
                         currentDate.getFullYear() === selectedDate.getFullYear();

        let buttonClasses = 'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors relative cursor-pointer ';

        if (isSelected) {
            buttonClasses += 'bg-dark-primary text-dark-background';
        } else if (isToday) {
            buttonClasses += 'bg-dark-border text-dark-text';
        } else {
            buttonClasses += 'hover:bg-dark-border text-dark-text';
        }

        calendarDays.push(
            <div key={day} className="p-2 flex justify-center items-center">
                <button
                    onClick={() => handleDateClick(day)}
                    className={buttonClasses}
                >
                    {day}
                    {hasAppointment && !isSelected && <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-dark-primary rounded-full"></span>}
                </button>
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                {/* Calendar */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-dark-border"><ChevronLeftIcon /></button>
                        <h2 className="text-xl font-bold text-center capitalize">
                            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-dark-border"><ChevronRightIcon /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-dark-secondary">
                        {weekDays.map(day => <div key={day} className="p-2">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays}
                    </div>
                </div>

                {/* Details */}
                <div className="bg-dark-background p-4 rounded-lg border border-dark-border min-h-[300px] flex flex-col">
                    <h3 className="font-bold text-lg mb-4 border-b border-dark-border pb-2 flex-shrink-0">
                        {selectedDate 
                            ? `Compromissos para ${selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}` 
                            : 'Selecione uma data'}
                    </h3>
                    <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                        {selectedDate && appointmentsForSelectedDay.length > 0 ? (
                            appointmentsForSelectedDay.map(app => (
                                <div key={app.id} className="p-3 bg-dark-card/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold flex items-center gap-2"><UserCircleIcon className="w-5 h-5"/>{app.leadName}</p>
                                        <p className="text-sm font-bold text-dark-primary flex items-center gap-1.5"><ClockIcon className="w-4 h-4" />{new Date(app.appointment_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {app.feedback && app.feedback.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-dark-border/50">
                                            <p className="text-xs text-dark-secondary font-semibold">Último Feedback:</p>
                                            <p className="text-sm text-dark-secondary italic mt-1">"{app.feedback[app.feedback.length - 1].text}"</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-center text-dark-secondary">Nenhum compromisso para o dia selecionado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AgendaModal;
