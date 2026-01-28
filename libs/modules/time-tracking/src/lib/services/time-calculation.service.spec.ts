import { TimeRoundingMethod, DefaultRoundingInterval } from '@accounting/common';

import { TimeCalculationService } from './time-calculation.service';

describe('TimeCalculationService', () => {
  let service: TimeCalculationService;

  beforeEach(() => {
    service = new TimeCalculationService();
  });

  describe('calculateDuration', () => {
    it('should calculate duration in minutes between two times', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:30:00Z');

      expect(service.calculateDuration(start, end)).toBe(150); // 2.5 hours = 150 minutes
    });

    it('should return 0 for same start and end time', () => {
      const time = new Date('2024-01-15T09:00:00Z');

      expect(service.calculateDuration(time, time)).toBe(0);
    });

    it('should return 0 for end time before start time', () => {
      const start = new Date('2024-01-15T11:00:00Z');
      const end = new Date('2024-01-15T09:00:00Z');

      expect(service.calculateDuration(start, end)).toBe(0);
    });

    it('should handle duration of exactly one minute', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T09:01:00Z');

      expect(service.calculateDuration(start, end)).toBe(1);
    });

    it('should truncate seconds (floor to nearest minute)', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T09:01:45Z'); // 1 minute 45 seconds

      expect(service.calculateDuration(start, end)).toBe(1); // Only 1 full minute
    });

    it('should handle duration across midnight', () => {
      const start = new Date('2024-01-15T23:30:00Z');
      const end = new Date('2024-01-16T00:30:00Z');

      expect(service.calculateDuration(start, end)).toBe(60);
    });

    it('should handle multi-day duration', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-17T09:00:00Z');

      expect(service.calculateDuration(start, end)).toBe(2880); // 48 hours = 2880 minutes
    });
  });

  describe('roundDuration', () => {
    describe('NONE method', () => {
      it('should return original duration when method is NONE', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.NONE, 15)).toBe(17);
      });

      it('should return original duration when interval is 0', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.UP, 0)).toBe(17);
      });

      it('should return original duration when interval is negative', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.UP, -5)).toBe(17);
      });
    });

    describe('UP method', () => {
      it('should round up to nearest interval', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.UP, 15)).toBe(30);
      });

      it('should not round if already at interval', () => {
        expect(service.roundDuration(30, TimeRoundingMethod.UP, 15)).toBe(30);
      });

      it('should round small durations up', () => {
        expect(service.roundDuration(1, TimeRoundingMethod.UP, 15)).toBe(15);
      });

      it('should round zero to zero', () => {
        expect(service.roundDuration(0, TimeRoundingMethod.UP, 15)).toBe(0);
      });

      it('should work with different intervals', () => {
        expect(service.roundDuration(7, TimeRoundingMethod.UP, 6)).toBe(12);
        expect(service.roundDuration(5, TimeRoundingMethod.UP, 5)).toBe(5);
        expect(service.roundDuration(31, TimeRoundingMethod.UP, 30)).toBe(60);
      });
    });

    describe('DOWN method', () => {
      it('should round down to nearest interval', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.DOWN, 15)).toBe(15);
      });

      it('should not round if already at interval', () => {
        expect(service.roundDuration(30, TimeRoundingMethod.DOWN, 15)).toBe(30);
      });

      it('should round small durations down to zero', () => {
        expect(service.roundDuration(14, TimeRoundingMethod.DOWN, 15)).toBe(0);
      });

      it('should work with different intervals', () => {
        expect(service.roundDuration(11, TimeRoundingMethod.DOWN, 6)).toBe(6);
        expect(service.roundDuration(7, TimeRoundingMethod.DOWN, 5)).toBe(5);
      });
    });

    describe('NEAREST method', () => {
      it('should round to nearest interval - round up', () => {
        expect(service.roundDuration(23, TimeRoundingMethod.NEAREST, 15)).toBe(30);
      });

      it('should round to nearest interval - round down', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.NEAREST, 15)).toBe(15);
      });

      it('should round exactly at midpoint up (standard rounding)', () => {
        // 7.5 rounds to 8 in standard rounding (7.5 / 15 = 0.5 -> 1 * 15 = 15)
        expect(service.roundDuration(8, TimeRoundingMethod.NEAREST, 15)).toBe(15);
      });

      it('should not round if already at interval', () => {
        expect(service.roundDuration(30, TimeRoundingMethod.NEAREST, 15)).toBe(30);
      });
    });

    describe('default interval', () => {
      it('should use default 15 minute interval when not specified', () => {
        expect(service.roundDuration(17, TimeRoundingMethod.UP)).toBe(30);
        expect(service.roundDuration(17, TimeRoundingMethod.UP, DefaultRoundingInterval)).toBe(30);
      });
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate total amount from duration and hourly rate', () => {
      expect(service.calculateTotalAmount(60, 100)).toBe(100); // 1 hour at 100/hour
    });

    it('should calculate for partial hours', () => {
      expect(service.calculateTotalAmount(30, 100)).toBe(50); // 0.5 hours at 100/hour
    });

    it('should round to 2 decimal places', () => {
      // 45 minutes = 0.75 hours, at 99/hour = 74.25
      expect(service.calculateTotalAmount(45, 99)).toBe(74.25);
    });

    it('should handle small durations', () => {
      expect(service.calculateTotalAmount(1, 60)).toBe(1); // 1 minute at 60/hour = 1
    });

    it('should handle zero duration', () => {
      expect(service.calculateTotalAmount(0, 100)).toBe(0);
    });

    it('should handle zero rate', () => {
      expect(service.calculateTotalAmount(60, 0)).toBe(0);
    });

    it('should handle fractional rates', () => {
      // 60 minutes at 99.99/hour = 99.99
      expect(service.calculateTotalAmount(60, 99.99)).toBe(99.99);
    });
  });

  describe('getEffectiveHourlyRate', () => {
    it('should return entry rate if provided', () => {
      expect(service.getEffectiveHourlyRate(100, 80, 60)).toBe(100);
    });

    it('should return project rate if entry rate is not provided', () => {
      expect(service.getEffectiveHourlyRate(undefined, 80, 60)).toBe(80);
    });

    it('should return settings rate if no entry or project rate', () => {
      expect(service.getEffectiveHourlyRate(undefined, undefined, 60)).toBe(60);
    });

    it('should return undefined if no rates provided', () => {
      expect(service.getEffectiveHourlyRate(undefined, undefined, undefined)).toBeUndefined();
    });

    it('should return undefined if all rates are undefined', () => {
      expect(service.getEffectiveHourlyRate()).toBeUndefined();
    });
  });

  describe('formatDuration', () => {
    it('should format minutes as HH:MM', () => {
      expect(service.formatDuration(90)).toBe('01:30');
    });

    it('should pad hours with zero', () => {
      expect(service.formatDuration(30)).toBe('00:30');
    });

    it('should handle zero minutes', () => {
      expect(service.formatDuration(0)).toBe('00:00');
    });

    it('should handle large durations', () => {
      expect(service.formatDuration(600)).toBe('10:00'); // 10 hours
    });

    it('should handle exact hours', () => {
      expect(service.formatDuration(60)).toBe('01:00');
    });
  });

  describe('formatDurationHuman', () => {
    it('should format minutes only', () => {
      expect(service.formatDurationHuman(30)).toBe('30m');
    });

    it('should format hours only', () => {
      expect(service.formatDurationHuman(120)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(service.formatDurationHuman(90)).toBe('1h 30m');
    });

    it('should handle zero minutes', () => {
      expect(service.formatDurationHuman(0)).toBe('0m');
    });
  });

  describe('checkOverlap', () => {
    it('should detect overlapping ranges', () => {
      const start1 = new Date('2024-01-15T09:00:00Z');
      const end1 = new Date('2024-01-15T11:00:00Z');
      const start2 = new Date('2024-01-15T10:00:00Z');
      const end2 = new Date('2024-01-15T12:00:00Z');

      expect(service.checkOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should detect when one range contains another', () => {
      const start1 = new Date('2024-01-15T09:00:00Z');
      const end1 = new Date('2024-01-15T14:00:00Z');
      const start2 = new Date('2024-01-15T10:00:00Z');
      const end2 = new Date('2024-01-15T12:00:00Z');

      expect(service.checkOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should not detect overlap for adjacent ranges', () => {
      const start1 = new Date('2024-01-15T09:00:00Z');
      const end1 = new Date('2024-01-15T10:00:00Z');
      const start2 = new Date('2024-01-15T10:00:00Z');
      const end2 = new Date('2024-01-15T11:00:00Z');

      // Ranges that touch but don't overlap should not be considered overlapping
      // end1 is not < start2, so no overlap
      expect(service.checkOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should not detect overlap for non-overlapping ranges', () => {
      const start1 = new Date('2024-01-15T09:00:00Z');
      const end1 = new Date('2024-01-15T10:00:00Z');
      const start2 = new Date('2024-01-15T11:00:00Z');
      const end2 = new Date('2024-01-15T12:00:00Z');

      expect(service.checkOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should handle running timer (null end time) for first entry', () => {
      const start1 = new Date('2024-01-15T09:00:00Z');
      const end1 = null;
      const start2 = new Date('2024-01-15T10:00:00Z');
      const end2 = new Date('2024-01-15T11:00:00Z');

      expect(service.checkOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should handle running timer (null end time) for second entry', () => {
      const start1 = new Date('2024-01-15T09:00:00Z');
      const end1 = new Date('2024-01-15T10:00:00Z');
      const start2 = new Date('2024-01-15T09:30:00Z');
      const end2 = null;

      expect(service.checkOverlap(start1, end1, start2, end2)).toBe(true);
    });
  });

  describe('getDayBounds', () => {
    it('should return correct start and end of day', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const { startOfDay, endOfDay } = service.getDayBounds(date);

      expect(startOfDay.getUTCHours()).toBe(0);
      expect(startOfDay.getUTCMinutes()).toBe(0);
      expect(startOfDay.getUTCSeconds()).toBe(0);
      expect(startOfDay.getUTCMilliseconds()).toBe(0);

      expect(endOfDay.getUTCHours()).toBe(23);
      expect(endOfDay.getUTCMinutes()).toBe(59);
      expect(endOfDay.getUTCSeconds()).toBe(59);
      expect(endOfDay.getUTCMilliseconds()).toBe(999);
    });

    it('should preserve the date', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const { startOfDay, endOfDay } = service.getDayBounds(date);

      expect(startOfDay.getUTCDate()).toBe(date.getUTCDate());
      expect(endOfDay.getUTCDate()).toBe(date.getUTCDate());
    });
  });

  describe('getWeekBounds', () => {
    it('should return week bounds starting from Monday (default)', () => {
      const date = new Date('2024-01-17'); // Wednesday
      const { startOfWeek, endOfWeek } = service.getWeekBounds(date);

      expect(startOfWeek.getDay()).toBe(1); // Monday
      expect(endOfWeek.getDay()).toBe(0); // Sunday
    });

    it('should return week bounds starting from Sunday', () => {
      const date = new Date('2024-01-17'); // Wednesday
      const { startOfWeek, endOfWeek } = service.getWeekBounds(date, 0);

      expect(startOfWeek.getDay()).toBe(0); // Sunday
      expect(endOfWeek.getDay()).toBe(6); // Saturday
    });

    it('should span exactly 7 days', () => {
      const date = new Date('2024-01-17');
      const { startOfWeek, endOfWeek } = service.getWeekBounds(date);

      const diff = endOfWeek.getTime() - startOfWeek.getTime();
      const days = diff / (1000 * 60 * 60 * 24);

      expect(days).toBeCloseTo(6.999, 2); // ~7 days (minus 1 millisecond)
    });
  });

  describe('getMonthBounds', () => {
    it('should return correct start and end of month', () => {
      const { startOfMonth, endOfMonth } = service.getMonthBounds(2024, 1);

      expect(startOfMonth.getMonth()).toBe(0); // January (0-indexed)
      expect(startOfMonth.getDate()).toBe(1);
      expect(endOfMonth.getMonth()).toBe(0);
      expect(endOfMonth.getDate()).toBe(31); // January has 31 days
    });

    it('should handle February in leap year', () => {
      const { endOfMonth } = service.getMonthBounds(2024, 2);

      expect(endOfMonth.getDate()).toBe(29); // 2024 is a leap year
    });

    it('should handle February in non-leap year', () => {
      const { endOfMonth } = service.getMonthBounds(2023, 2);

      expect(endOfMonth.getDate()).toBe(28);
    });

    it('should handle December correctly', () => {
      const { startOfMonth, endOfMonth } = service.getMonthBounds(2024, 12);

      expect(startOfMonth.getMonth()).toBe(11); // December (0-indexed)
      expect(endOfMonth.getDate()).toBe(31);
    });
  });
});
