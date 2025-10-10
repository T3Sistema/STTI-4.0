import { BusinessHours } from '../types';

/**
 * Checks if the company is open at a specific time (or now if not provided),
 * considering the America/Sao_Paulo timezone.
 * @param businessHours The company's business hours configuration.
 * @param checkDate The specific date/time to check. Defaults to now.
 * @returns True if the company is open, false otherwise.
 */
export const isCompanyOpen = (businessHours: BusinessHours | undefined, checkDate: Date = new Date()): boolean => {
    if (!businessHours || !businessHours.isEnabled) {
        return true; // If the feature is not enabled, deadlines count continuously.
    }
    if (businessHours.is24_7) {
        return true;
    }

    // We must perform all calculations relative to the company's timezone.
    const saoPauloTime = new Date(checkDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dayOfWeek = saoPauloTime.getDay(); // 0 = Sunday
    const currentTimeInMinutes = saoPauloTime.getHours() * 60 + saoPauloTime.getMinutes();

    const todaySettings = businessHours.days[dayOfWeek as keyof typeof businessHours.days];

    if (!todaySettings || !todaySettings.isOpen) {
        return false;
    }

    const [startH, startM] = todaySettings.startTime.split(':').map(Number);
    const startTimeInMinutes = startH * 60 + startM;

    const [endH, endM] = todaySettings.endTime.split(':').map(Number);
    const endTimeInMinutes = endH * 60 + endM;

    // The check is inclusive of start time and exclusive of end time. [startTime, endTime)
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
};


/**
 * Calculates the deadline by adding a duration in minutes to a start date,
 * considering only the time the company is open.
 * @param startDate The starting date/time of the lead.
 * @param durationMinutes The total business minutes for the deadline.
 * @param businessHours The company's business hours configuration.
 * @returns A Date object representing the calculated deadline.
 */
export const calculateBusinessHoursDeadline = (
    startDate: Date,
    durationMinutes: number,
    businessHours: BusinessHours | undefined
): Date => {
    // If business hours are not configured or always open, calculate a simple deadline.
    if (!businessHours || !businessHours.isEnabled || businessHours.is24_7) {
        return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    }

    let remainingMinutes = durationMinutes;
    // Use a cursor that we will advance. Initialize it with the start date.
    const cursorDate = new Date(startDate.getTime());

    // Iterate in chunks rather than minute-by-minute for performance.
    while (remainingMinutes > 0) {
        const dayOfWeek = cursorDate.getDay();
        const daySettings = businessHours.days[dayOfWeek as keyof typeof businessHours.days];
        const cursorTimeInMinutes = cursorDate.getHours() * 60 + cursorDate.getMinutes();

        if (daySettings && daySettings.isOpen) {
            const [startH, startM] = daySettings.startTime.split(':').map(Number);
            const startTimeInMinutes = startH * 60 + startM;

            const [endH, endM] = daySettings.endTime.split(':').map(Number);
            const endTimeInMinutes = endH * 60 + endM;

            // If cursor is before opening time, jump to opening time on the same day.
            if (cursorTimeInMinutes < startTimeInMinutes) {
                cursorDate.setHours(startH, startM, 0, 0);
                // Re-evaluate the loop for the new cursor position.
                continue;
            }

            // If cursor is at or after closing time, jump to the start of the next day.
            if (cursorTimeInMinutes >= endTimeInMinutes) {
                cursorDate.setDate(cursorDate.getDate() + 1);
                cursorDate.setHours(0, 0, 0, 0);
                continue;
            }

            // At this point, the cursor is within business hours for the current day.
            const availableMinutesToday = endTimeInMinutes - cursorTimeInMinutes;

            if (remainingMinutes <= availableMinutesToday) {
                // The deadline falls within the remaining business hours of today.
                cursorDate.setMinutes(cursorDate.getMinutes() + remainingMinutes);
                remainingMinutes = 0;
            } else {
                // The deadline is on a future day. Consume all available minutes for today.
                remainingMinutes -= availableMinutesToday;
                // Jump to the start of the next day to continue counting.
                cursorDate.setDate(cursorDate.getDate() + 1);
                cursorDate.setHours(0, 0, 0, 0);
            }
        } else {
            // The current day is a closed day (e.g., weekend). Jump to the start of the next day.
            cursorDate.setDate(cursorDate.getDate() + 1);
            cursorDate.setHours(0, 0, 0, 0);
        }
    }
    
    // The cursorDate now holds the correct deadline time.
    return cursorDate;
};


/**
 * Calculates the total business time remaining between two dates in milliseconds.
 * This function only counts time within the specified business hours.
 * @param now The current date/time to start counting from.
 * @param deadline The future deadline to count until.
 * @param businessHours The company's business hours configuration.
 * @returns The total remaining business time in milliseconds.
 */
export const calculateRemainingBusinessTime = (
    now: Date,
    deadline: Date,
    businessHours: BusinessHours | undefined
): number => {
    if (!businessHours || !businessHours.isEnabled || businessHours.is24_7) {
        return Math.max(0, deadline.getTime() - now.getTime());
    }
    
    if (now >= deadline) {
        return 0;
    }

    let totalBusinessMs = 0;
    const cursor = new Date(now.getTime());

    // Iterate day by day until we pass the deadline
    while (cursor < deadline) {
        const dayOfWeek = cursor.getDay();
        const daySettings = businessHours.days[dayOfWeek as keyof typeof businessHours.days];

        if (daySettings && daySettings.isOpen) {
            const [startH, startM] = daySettings.startTime.split(':').map(Number);
            const openTime = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), startH, startM);

            const [endH, endM] = daySettings.endTime.split(':').map(Number);
            const closeTime = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), endH, endM);
            
            // The effective start of the counting interval for today.
            const intervalStart = Math.max(cursor.getTime(), openTime.getTime());
            
            // The effective end of the counting interval for today.
            const intervalEnd = Math.min(deadline.getTime(), closeTime.getTime());

            if (intervalEnd > intervalStart) {
                totalBusinessMs += (intervalEnd - intervalStart);
            }
        }
        
        // Move cursor to the beginning of the next day.
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
    }
    
    return totalBusinessMs;
};
