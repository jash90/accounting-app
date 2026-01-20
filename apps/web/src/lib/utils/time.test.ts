import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatDurationSeconds,
  parseDurationToMinutes,
} from './time';

describe('time utilities', () => {
  describe('formatDuration', () => {
    it('should format minutes into h:mm format', () => {
      expect(formatDuration(150)).toBe('2:30'); // 2.5 hours
    });

    it('should handle zero minutes', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should handle undefined input', () => {
      expect(formatDuration(undefined)).toBe('0:00');
    });

    it('should pad minutes with leading zero', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('should handle less than an hour', () => {
      expect(formatDuration(45)).toBe('0:45');
    });

    it('should handle exactly one hour', () => {
      expect(formatDuration(60)).toBe('1:00');
    });

    it('should handle large durations (more than 10 hours)', () => {
      expect(formatDuration(720)).toBe('12:00'); // 12 hours
    });

    it('should handle single-digit minutes correctly', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(62)).toBe('1:02');
      expect(formatDuration(69)).toBe('1:09');
    });

    it('should not pad hours with leading zero', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(540)).toBe('9:00');
    });

    it('should handle exactly one minute', () => {
      expect(formatDuration(1)).toBe('0:01');
    });
  });

  describe('formatDurationSeconds', () => {
    it('should format seconds into hh:mm:ss format', () => {
      expect(formatDurationSeconds(5445)).toBe('01:30:45');
    });

    it('should handle zero seconds', () => {
      expect(formatDurationSeconds(0)).toBe('00:00:00');
    });

    it('should pad all components with leading zeros', () => {
      expect(formatDurationSeconds(3661)).toBe('01:01:01');
    });

    it('should handle less than an hour', () => {
      expect(formatDurationSeconds(1830)).toBe('00:30:30');
    });

    it('should handle exactly one hour', () => {
      expect(formatDurationSeconds(3600)).toBe('01:00:00');
    });

    it('should handle exactly one minute', () => {
      expect(formatDurationSeconds(60)).toBe('00:01:00');
    });

    it('should handle exactly one second', () => {
      expect(formatDurationSeconds(1)).toBe('00:00:01');
    });

    it('should handle large durations (more than 10 hours)', () => {
      expect(formatDurationSeconds(43200)).toBe('12:00:00'); // 12 hours
    });

    it('should handle 24 hours', () => {
      expect(formatDurationSeconds(86400)).toBe('24:00:00');
    });

    it('should handle single digit hours correctly', () => {
      expect(formatDurationSeconds(7200)).toBe('02:00:00');
      expect(formatDurationSeconds(32400)).toBe('09:00:00');
    });
  });

  describe('parseDurationToMinutes', () => {
    describe('h:mm format', () => {
      it('should parse h:mm format correctly', () => {
        expect(parseDurationToMinutes('2:30')).toBe(150);
      });

      it('should parse single digit hours', () => {
        expect(parseDurationToMinutes('1:00')).toBe(60);
      });

      it('should parse zero hours', () => {
        expect(parseDurationToMinutes('0:45')).toBe(45);
      });

      it('should parse zero minutes', () => {
        expect(parseDurationToMinutes('2:00')).toBe(120);
      });

      it('should parse double digit minutes', () => {
        expect(parseDurationToMinutes('1:59')).toBe(119);
      });

      it('should parse large hours', () => {
        expect(parseDurationToMinutes('12:30')).toBe(750);
      });
    });

    describe('hh:mm:ss format', () => {
      it('should parse hh:mm:ss format correctly', () => {
        expect(parseDurationToMinutes('01:30:00')).toBe(90);
      });

      it('should round seconds to nearest minute', () => {
        expect(parseDurationToMinutes('01:30:45')).toBe(91); // 90 + round(45/60)
      });

      it('should handle zero seconds', () => {
        expect(parseDurationToMinutes('02:15:00')).toBe(135);
      });

      it('should handle small seconds (no rounding up)', () => {
        expect(parseDurationToMinutes('01:30:15')).toBe(90); // 90 + round(15/60) = 90 + 0
      });

      it('should handle 30 seconds (rounds to 1)', () => {
        expect(parseDurationToMinutes('01:30:30')).toBe(91); // 90 + round(30/60) = 90 + 1
      });
    });

    describe('edge cases', () => {
      it('should return 0 for invalid format', () => {
        expect(parseDurationToMinutes('invalid')).toBe(0);
      });

      it('should return 0 for empty string', () => {
        expect(parseDurationToMinutes('')).toBe(0);
      });

      it('should return 0 for single number', () => {
        expect(parseDurationToMinutes('30')).toBe(0);
      });

      it('should return 0 for non-numeric parts', () => {
        expect(parseDurationToMinutes('a:b')).toBe(0);
      });

      it('should return 0 for mixed valid and invalid parts', () => {
        expect(parseDurationToMinutes('1:xx')).toBe(0);
      });

      it('should handle zero duration', () => {
        expect(parseDurationToMinutes('0:00')).toBe(0);
        expect(parseDurationToMinutes('00:00:00')).toBe(0);
      });

      it('should handle four parts (invalid format)', () => {
        expect(parseDurationToMinutes('1:2:3:4')).toBe(0);
      });
    });
  });
});
