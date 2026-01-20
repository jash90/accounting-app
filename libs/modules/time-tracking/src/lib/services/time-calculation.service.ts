import { Injectable } from '@nestjs/common';
import {
  TimeRoundingMethod,
  DefaultRoundingInterval,
} from '@accounting/common';

@Injectable()
export class TimeCalculationService {
  /**
   * Calculate duration in minutes between start and end times
   */
  calculateDuration(startTime: Date, endTime: Date): number {
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  /**
   * Round duration according to rounding method and interval
   */
  roundDuration(
    durationMinutes: number,
    method: TimeRoundingMethod,
    intervalMinutes: number = DefaultRoundingInterval,
  ): number {
    if (method === TimeRoundingMethod.NONE || intervalMinutes <= 0) {
      return durationMinutes;
    }

    switch (method) {
      case TimeRoundingMethod.UP:
        return Math.ceil(durationMinutes / intervalMinutes) * intervalMinutes;

      case TimeRoundingMethod.DOWN:
        return Math.floor(durationMinutes / intervalMinutes) * intervalMinutes;

      case TimeRoundingMethod.NEAREST:
        return Math.round(durationMinutes / intervalMinutes) * intervalMinutes;

      default:
        return durationMinutes;
    }
  }

  /**
   * Calculate total amount based on duration and hourly rate
   */
  calculateTotalAmount(durationMinutes: number, hourlyRate: number): number {
    const hours = durationMinutes / 60;
    return Math.round(hours * hourlyRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get effective hourly rate from entry, project, or settings
   */
  getEffectiveHourlyRate(
    entryRate?: number,
    projectRate?: number,
    settingsRate?: number,
  ): number | undefined {
    return entryRate ?? projectRate ?? settingsRate ?? undefined;
  }

  /**
   * Format duration as HH:MM
   */
  formatDuration(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Format duration as human-readable string
   */
  formatDurationHuman(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  /**
   * Check if two time ranges overlap
   */
  checkOverlap(
    start1: Date,
    end1: Date | null,
    start2: Date,
    end2: Date | null,
  ): boolean {
    // If either entry is running (no end time), use current time
    const now = new Date();
    const effectiveEnd1 = end1 ?? now;
    const effectiveEnd2 = end2 ?? now;

    // Two ranges overlap if:
    // start1 < end2 AND start2 < end1
    return start1 < effectiveEnd2 && start2 < effectiveEnd1;
  }

  /**
   * Get start and end of a day
   */
  getDayBounds(date: Date): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(date.getTime());
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date.getTime());
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }

  /**
   * Get start and end of a week
   */
  getWeekBounds(
    date: Date,
    weekStartDay: number = 1,
  ): { startOfWeek: Date; endOfWeek: Date } {
    const startOfWeek = new Date(date.getTime());
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek - weekStartDay;
    const daysToSubtract = diff >= 0 ? diff : diff + 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek.getTime());
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  /**
   * Get start and end of a month
   */
  getMonthBounds(
    year: number,
    month: number,
  ): { startOfMonth: Date; endOfMonth: Date } {
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);

    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return { startOfMonth, endOfMonth };
  }
}
