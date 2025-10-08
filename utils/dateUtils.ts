

export const getDaysRemaining = (entryDate: string, goalDays: number): number => {
    const entry = new Date(entryDate);
    const deadline = new Date(entry.setDate(entry.getDate() + goalDays));
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

export const getDaysInStock = (entryDate: string, saleDate?: string): number => {
    const entry = new Date(entryDate);
    const end = saleDate ? new Date(saleDate) : new Date();
    const diffTime = end.getTime() - entry.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : 0;
};

export const formatTimeUntil = (dateString: string): string => {
    // A string da data do Supabase está em UTC (formato ISO 8601).
    // new Date() interpreta isso corretamente, criando um objeto Date que representa aquele ponto no tempo.
    const appointmentDate = new Date(dateString);
    const now = new Date();
    const diffMs = appointmentDate.getTime() - now.getTime();

    if (diffMs <= 0) {
        return "agora";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutesTotal = Math.floor(diffMs / (1000 * 60));
    const diffMinutesPart = diffMinutesTotal % 60;
    const diffDays = Math.floor(diffHours / 24);

    // Formata a hora explicitamente para o fuso horário de São Paulo (padrão do Brasil),
    // para garantir consistência independentemente da configuração do navegador do usuário.
    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
    const formattedTime = timeFormatter.format(appointmentDate);

    // Para evitar bugs de fuso horário na virada do dia, comparamos as datas zerando as horas.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfDayAfterTomorrow = new Date(startOfTomorrow);
    startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1);

    const appointmentTimeValue = appointmentDate.getTime();
    
    const isToday = appointmentTimeValue >= startOfToday.getTime() && appointmentTimeValue < startOfTomorrow.getTime();
    const isTomorrow = appointmentTimeValue >= startOfTomorrow.getTime() && appointmentTimeValue < startOfDayAfterTomorrow.getTime();

    if (isToday) {
        if (diffHours < 1) {
            return `em ${diffMinutesTotal} minutos`;
        }
        if (diffHours < 4) {
            return `em ${diffHours}h e ${diffMinutesPart}m`;
        }
        return `hoje às ${formattedTime}`;
    }

    if (isTomorrow) {
        return `amanhã às ${formattedTime}`;
    }
    
    return `em ${diffDays} dias`;
};

export const formatDuration = (ms: number): string => {
    if (ms < 0 || isNaN(ms)) return 'N/A';
    if (ms < 1000) return 'Imediato'; // Less than a second

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    // Only show seconds if duration is less than a minute
    if (seconds > 0 && days === 0 && hours === 0 && minutes === 0) parts.push(`${seconds}s`);

    if (parts.length === 0) return 'Imediato';
    
    // Show up to 2 units for readability, e.g., "1d 5h" instead of "1d 5h 30m"
    return parts.slice(0, 2).join(' ');
};