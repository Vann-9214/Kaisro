import { Event } from '@/db/schema';

export type RecurrenceFrequency = 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

/**
 * Formats a reminder minute offset into a human-readable string.
 */
export function formatReminderLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'None';
  const found = REMINDER_OPTIONS.find((opt) => opt.value === minutes);
  if (found) return found.label;
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} day before`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} hr before`;
  return `${minutes} min before`;
}

/**
 * Shifts the end date so the duration between start and end remains unchanged.
 */
export function shiftEndDatePreservingDuration(
  oldStart: Date,
  newStart: Date,
  oldEnd: Date
): Date {
  const durationMs = Math.max(0, oldEnd.getTime() - oldStart.getTime());
  return new Date(newStart.getTime() + durationMs);
}

/**
 * Expands a recurring event onto a specific target date (YYYY-MM-DD).
 *
 * Rules:
 * - A recurring event starts on its start date and never appears on earlier days.
 * - Non-recurring: appears if it falls on targetDateStr.
 * - DAILY: appears every day on and after its start date.
 * - WEEKLY: appears on the same day-of-week on and after its start date.
 * - MONTHLY: appears on the same day-of-month on and after its start date,
 *   with month-end clamping (days 29-31 clamp to the last day of shorter months).
 */
export function expandEventForDate(event: Event, targetDateStr: string): Event | null {
  const eventStartDateStr = event.start.split('T')[0];

  // A recurring event never appears on days before its start date
  if (eventStartDateStr > targetDateStr) {
    return null;
  }

  const recurrence = (event.recurrence || 'none').toUpperCase() as RecurrenceFrequency;

  // 1. Non-recurring event
  if (recurrence === 'none') {
    const eventEndDateStr = event.end ? event.end.split('T')[0] : eventStartDateStr;
    if (eventStartDateStr <= targetDateStr && eventEndDateStr >= targetDateStr) {
      return event;
    }
    return null;
  }

  // 2. DAILY
  if (recurrence === 'DAILY') {
    return projectEventOntoDate(event, targetDateStr);
  }

  // 3. WEEKLY
  if (recurrence === 'WEEKLY') {
    const eventStartDate = new Date(`${eventStartDateStr}T00:00:00`);
    const targetDate = new Date(`${targetDateStr}T00:00:00`);
    if (eventStartDate.getDay() === targetDate.getDay()) {
      return projectEventOntoDate(event, targetDateStr);
    }
    return null;
  }

  // 4. MONTHLY
  if (recurrence === 'MONTHLY') {
    const startParts = eventStartDateStr.split('-');
    const startDayNum = parseInt(startParts[2] || '1', 10);

    const targetParts = targetDateStr.split('-');
    const targetYear = parseInt(targetParts[0] || '2026', 10);
    const targetMonth = parseInt(targetParts[1] || '1', 10);
    const targetDayNum = parseInt(targetParts[2] || '1', 10);

    // Number of days in the target month (day 0 of month+1 gives last day of month)
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();

    // If startDayNum is 31 and target month has 28 days, effective day is 28
    const effectiveDayNum = Math.min(startDayNum, daysInTargetMonth);

    if (targetDayNum === effectiveDayNum) {
      return projectEventOntoDate(event, targetDateStr);
    }
    return null;
  }

  return null;
}

/**
 * Clones an event and projects its start and end times onto a target date (YYYY-MM-DD),
 * preserving the original time-of-day and duration.
 */
export function projectEventOntoDate(event: Event, targetDateStr: string): Event {
  if (event.allDay) {
    return {
      ...event,
      start: targetDateStr,
      end: targetDateStr,
    };
  }

  const startPart = event.start.split('T');
  const startTimeStr = startPart[1] || '09:00:00';
  const newStartIso = `${targetDateStr}T${startTimeStr}`;

  if (!event.end) {
    return {
      ...event,
      start: newStartIso,
      end: null,
    };
  }

  // Compute duration in ms from original event
  const originalStartMs = new Date(event.start).getTime();
  const originalEndMs = new Date(event.end).getTime();
  const durationMs = Math.max(0, originalEndMs - originalStartMs);

  const newStartDate = new Date(newStartIso);
  const newEndDate = new Date(newStartDate.getTime() + durationMs);

  // Format newEndIso as local ISO-like string YYYY-MM-DDTHH:mm:ss
  const endYear = newEndDate.getFullYear();
  const endMonth = (newEndDate.getMonth() + 1).toString().padStart(2, '0');
  const endDay = newEndDate.getDate().toString().padStart(2, '0');
  const endHours = newEndDate.getHours().toString().padStart(2, '0');
  const endMins = newEndDate.getMinutes().toString().padStart(2, '0');
  const endSecs = newEndDate.getSeconds().toString().padStart(2, '0');

  const newEndIso = `${endYear}-${endMonth}-${endDay}T${endHours}:${endMins}:${endSecs}`;

  return {
    ...event,
    start: newStartIso,
    end: newEndIso,
  };
}
