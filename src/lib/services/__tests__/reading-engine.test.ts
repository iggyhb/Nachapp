import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculatePlan,
  calculateProgress,
  replanFromToday,
  calculateTodayTarget,
  getUnitLabel,
  isReadingDay,
  diffDays,
  formatDate,
  getDayOfWeek,
  getDatesBetween,
  PlanConfig,
  PlanCalculation,
  ProgressState,
  ReplanResult,
} from '../reading-engine';

// Mock today's date for consistent testing
const mockToday = '2026-04-01';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(mockToday));
});

describe('reading-engine', () => {
  describe('formatDate', () => {
    it('should format a Date object to YYYY-MM-DD string', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should pad month and day with leading zeros', () => {
      const date = new Date(2024, 8, 5); // September 5, 2024
      expect(formatDate(date)).toBe('2024-09-05');
    });

    it('should handle December dates', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(formatDate(date)).toBe('2024-12-31');
    });

    it('should handle leap year dates', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      expect(formatDate(date)).toBe('2024-02-29');
    });
  });

  describe('getDayOfWeek', () => {
    it('should return 0 for Sunday', () => {
      expect(getDayOfWeek('2024-01-07')).toBe(0); // January 7, 2024 is Sunday
    });

    it('should return 1 for Monday', () => {
      expect(getDayOfWeek('2024-01-01')).toBe(1); // January 1, 2024 is Monday
    });

    it('should return 5 for Friday', () => {
      expect(getDayOfWeek('2024-01-05')).toBe(5); // January 5, 2024 is Friday
    });

    it('should return 6 for Saturday', () => {
      expect(getDayOfWeek('2024-01-06')).toBe(6); // January 6, 2024 is Saturday
    });
  });

  describe('isReadingDay', () => {
    it('should return true for weekdays with no config', () => {
      expect(isReadingDay('2024-01-01')).toBe(true); // Monday
      expect(isReadingDay('2024-01-02')).toBe(true); // Tuesday
      expect(isReadingDay('2024-01-03')).toBe(true); // Wednesday
    });

    it('should return true for weekends with no config', () => {
      expect(isReadingDay('2024-01-06')).toBe(true); // Saturday
      expect(isReadingDay('2024-01-07')).toBe(true); // Sunday
    });

    it('should exclude weekends when skipWeekends is true', () => {
      const config = { skipWeekends: true };
      expect(isReadingDay('2024-01-06', config)).toBe(false); // Saturday
      expect(isReadingDay('2024-01-07', config)).toBe(false); // Sunday
      expect(isReadingDay('2024-01-01', config)).toBe(true); // Monday
    });

    it('should exclude specific rest days', () => {
      const config = { restDays: [3, 5] }; // Wednesday and Friday
      expect(isReadingDay('2024-01-03', config)).toBe(false); // Wednesday
      expect(isReadingDay('2024-01-05', config)).toBe(false); // Friday
      expect(isReadingDay('2024-01-01', config)).toBe(true); // Monday
    });

    it('should handle combined skipWeekends and restDays', () => {
      const config = { skipWeekends: true, restDays: [3] }; // Skip weekends and Wednesday
      expect(isReadingDay('2024-01-06', config)).toBe(false); // Saturday
      expect(isReadingDay('2024-01-07', config)).toBe(false); // Sunday
      expect(isReadingDay('2024-01-03', config)).toBe(false); // Wednesday
      expect(isReadingDay('2024-01-01', config)).toBe(true); // Monday
    });
  });

  describe('diffDays', () => {
    it('should calculate days between two dates', () => {
      expect(diffDays('2024-01-01', '2024-01-05')).toBe(4);
    });

    it('should return 0 for the same date', () => {
      expect(diffDays('2024-01-01', '2024-01-01')).toBe(0);
    });

    it('should return negative value when first date is later', () => {
      expect(diffDays('2024-01-05', '2024-01-01')).toBe(-4);
    });

    it('should handle month boundaries', () => {
      expect(diffDays('2024-01-30', '2024-02-02')).toBe(3);
    });

    it('should handle year boundaries', () => {
      expect(diffDays('2023-12-31', '2024-01-02')).toBe(2);
    });

    it('should handle leap year correctly', () => {
      expect(diffDays('2024-02-28', '2024-03-02')).toBe(3); // 29th Feb is leap day
    });

    it('should handle large differences', () => {
      expect(diffDays('2024-01-01', '2024-12-31')).toBe(365); // 2024 is leap year, diff is exclusive of end date
    });
  });

  describe('getDatesBetween', () => {
    it('should return array of dates between two dates (inclusive)', () => {
      const dates = getDatesBetween('2024-01-01', '2024-01-03');
      expect(dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    });

    it('should handle same start and end date', () => {
      const dates = getDatesBetween('2024-01-01', '2024-01-01');
      expect(dates).toEqual(['2024-01-01']);
    });

    it('should handle month boundaries', () => {
      const dates = getDatesBetween('2024-01-30', '2024-02-02');
      expect(dates).toEqual([
        '2024-01-30',
        '2024-01-31',
        '2024-02-01',
        '2024-02-02',
      ]);
    });

    it('should return dates in ascending order', () => {
      const dates = getDatesBetween('2024-01-01', '2024-01-05');
      expect(dates).toHaveLength(5);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] > dates[i - 1]).toBe(true);
      }
    });
  });

  describe('getUnitLabel', () => {
    it('should return "páginas" for pages_per_day', () => {
      expect(getUnitLabel('pages_per_day')).toBe('páginas');
    });

    it('should return "palabras" for words_per_day', () => {
      expect(getUnitLabel('words_per_day')).toBe('palabras');
    });

    it('should return "capítulos" for chapters_per_day', () => {
      expect(getUnitLabel('chapters_per_day')).toBe('capítulos');
    });

    it('should return "unidades" for unknown mode', () => {
      expect(getUnitLabel('invalid_mode' as any)).toBe('unidades');
    });
  });

  describe('calculatePlan', () => {
    it('should calculate basic plan with simple dates', () => {
      const config: PlanConfig = {
        totalUnits: 300,
        startDate: '2024-01-01',
        targetDate: '2024-01-11',
        mode: 'pages_per_day',
      };
      const result = calculatePlan(config);

      expect(result.daysTotal).toBe(10);
      expect(result.effectiveDays).toBe(11); // 11 days inclusive
      expect(result.dailyTarget).toBe(Math.ceil(300 / 11)); // ceil(27.27) = 28
      expect(result.isViable).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle pages_per_day mode with skipWeekends', () => {
      const config: PlanConfig = {
        totalUnits: 500,
        startDate: '2024-01-01', // Monday
        targetDate: '2024-01-12', // Friday
        mode: 'pages_per_day',
        skipWeekends: true,
      };
      const result = calculatePlan(config);

      expect(result.isViable).toBe(true);
      expect(result.effectiveDays).toBe(10); // 2 weeks of 5 days each
      expect(result.dailyTarget).toBe(Math.ceil(500 / 10)); // 50
    });

    it('should warn when plan is very short', () => {
      const config: PlanConfig = {
        totalUnits: 100,
        startDate: '2024-01-01',
        targetDate: '2024-01-02',
        mode: 'pages_per_day',
      };
      const result = calculatePlan(config);

      expect(result.warnings.some((w) => w.includes('muy corto'))).toBe(true);
    });

    it('should warn when daily target exceeds threshold for pages', () => {
      const config: PlanConfig = {
        totalUnits: 10000,
        startDate: '2024-01-01',
        targetDate: '2024-01-05',
        mode: 'pages_per_day',
      };
      const result = calculatePlan(config);

      expect(result.warnings.some((w) => w.includes('Meta diaria alta'))).toBe(
        true,
      );
    });

    it('should warn when daily target exceeds threshold for words', () => {
      const config: PlanConfig = {
        totalUnits: 500000,
        startDate: '2024-01-01',
        targetDate: '2024-01-05',
        mode: 'words_per_day',
      };
      const result = calculatePlan(config);

      expect(result.warnings.some((w) => w.includes('Meta diaria alta'))).toBe(
        true,
      );
    });

    it('should warn when daily target exceeds threshold for chapters', () => {
      const config: PlanConfig = {
        totalUnits: 100,
        startDate: '2024-01-01',
        targetDate: '2024-01-05',
        mode: 'chapters_per_day',
      };
      const result = calculatePlan(config);

      expect(result.warnings.some((w) => w.includes('Meta diaria alta'))).toBe(
        true,
      );
    });

    it('should be non-viable when no effective days available', () => {
      const config: PlanConfig = {
        totalUnits: 300,
        startDate: '2024-01-06', // Saturday
        targetDate: '2024-01-07', // Sunday
        mode: 'pages_per_day',
        skipWeekends: true,
      };
      const result = calculatePlan(config);

      expect(result.isViable).toBe(false);
      expect(result.warnings.some((w) => w.includes('No hay días'))).toBe(true);
    });

    it('should be non-viable when daily target less than 1', () => {
      const config: PlanConfig = {
        totalUnits: 0,
        startDate: '2024-01-01',
        targetDate: '2024-01-05',
        mode: 'pages_per_day',
      };
      const result = calculatePlan(config);

      expect(result.isViable).toBe(false);
      expect(result.warnings.some((w) => w.includes('al menos 1'))).toBe(true);
    });

    it('should handle custom rest days', () => {
      const config: PlanConfig = {
        totalUnits: 140,
        startDate: '2024-01-01', // Monday
        targetDate: '2024-01-05', // Friday
        mode: 'pages_per_day',
        restDays: [1, 3], // Monday and Wednesday
      };
      const result = calculatePlan(config);

      // Should only have Tuesday, Thursday, Friday = 3 days
      expect(result.effectiveDays).toBe(3);
      expect(result.dailyTarget).toBe(Math.ceil(140 / 3)); // 47
    });

    it('should handle plan that starts and ends on same day', () => {
      const config: PlanConfig = {
        totalUnits: 50,
        startDate: '2024-01-01',
        targetDate: '2024-01-01',
        mode: 'pages_per_day',
      };
      const result = calculatePlan(config);

      expect(result.daysTotal).toBe(0);
      expect(result.effectiveDays).toBe(1); // Single day is still 1 effective day
      expect(result.dailyTarget).toBe(50);
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress with no entries and daysElapsed = 0', () => {
      const plan = {
        id: 'plan1',
        startDate: formatDate(new Date()),
        targetDate: formatDate(
          new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
        ),
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 0,
        calculationMode: 'pages_per_day',
      };
      const result = calculateProgress(plan, []);

      expect(result.completedUnits).toBe(0);
      expect(result.daysElapsed).toBe(0);
      expect(result.isOnTrack).toBe(true);
      expect(result.percentComplete).toBe(0);
      expect(result.todayTarget).toBeGreaterThan(0);
      expect(result.todayRemaining).toBeGreaterThan(0);
    });

    it('should calculate progress when on track', () => {
      const today = formatDate(new Date());
      const startDate = formatDate(
        new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
      );
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        id: 'plan1',
        startDate,
        targetDate,
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 60,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        { actualUnits: 30, progressDate: startDate, cumulativeUnits: 30 },
        { actualUnits: 30, progressDate: today, cumulativeUnits: 60 },
      ]);

      expect(result.completedUnits).toBe(60);
      expect(result.isOnTrack).toBe(true);
      expect(result.percentComplete).toBe(20);
    });

    it('should calculate progress when ahead of schedule', () => {
      const today = formatDate(new Date());
      const startDate = formatDate(
        new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
      );
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        id: 'plan1',
        startDate,
        targetDate,
        dailyTarget: 20,
        totalUnits: 300,
        completedUnits: 200,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        {
          actualUnits: 200,
          progressDate: today,
          cumulativeUnits: 200,
        },
      ]);

      expect(result.completedUnits).toBe(200);
      expect(result.isAhead).toBe(true);
      expect(result.aheadByUnits).toBeGreaterThan(0);
    });

    it('should calculate progress when behind schedule', () => {
      const today = formatDate(new Date());
      const startDate = formatDate(
        new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
      );
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        id: 'plan1',
        startDate,
        targetDate,
        dailyTarget: 50,
        totalUnits: 300,
        completedUnits: 50,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        {
          actualUnits: 50,
          progressDate: today,
          cumulativeUnits: 50,
        },
      ]);

      expect(result.completedUnits).toBe(50);
      expect(result.isBehind).toBe(true);
      expect(result.behindByUnits).toBeGreaterThan(0);
    });

    it('should calculate percent complete correctly', () => {
      const plan = {
        id: 'plan1',
        startDate: '2024-01-01',
        targetDate: '2024-01-11',
        dailyTarget: 30,
        totalUnits: 100,
        completedUnits: 50,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        { actualUnits: 50, progressDate: '2024-01-05', cumulativeUnits: 50 },
      ]);

      expect(result.percentComplete).toBe(50);
    });

    it('should handle plan with 0 total units', () => {
      const today = formatDate(new Date());
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );
      const plan = {
        id: 'plan1',
        startDate: today,
        targetDate,
        dailyTarget: 30,
        totalUnits: 0,
        completedUnits: 0,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, []);

      expect(result.percentComplete).toBe(0);
      expect(result.isAhead).toBe(false);
      expect(result.isBehind).toBe(false);
    });

    it('should calculate projected completion date when ahead', () => {
      const startDate = formatDate(
        new Date(new Date().getTime() - 10 * 24 * 60 * 60 * 1000),
      );
      const today = formatDate(new Date());

      const plan = {
        id: 'plan1',
        startDate,
        targetDate: formatDate(
          new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000),
        ),
        dailyTarget: 20,
        totalUnits: 300,
        completedUnits: 200,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        { actualUnits: 200, progressDate: today, cumulativeUnits: 200 },
      ]);

      expect(result.projectedCompletionDate).toBeDefined();
      // Should be earlier than original target
      expect(result.projectedCompletionDate <= plan.targetDate).toBe(true);
    });

    it('should set projected completion to today when already completed', () => {
      const today = formatDate(new Date());

      const plan = {
        id: 'plan1',
        startDate: '2024-01-01',
        targetDate: '2024-01-11',
        dailyTarget: 30,
        totalUnits: 100,
        completedUnits: 100,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        { actualUnits: 100, progressDate: today, cumulativeUnits: 100 },
      ]);

      expect(result.projectedCompletionDate).toBe(today);
    });

    it('should handle today target with completion already today', () => {
      const today = formatDate(new Date());

      const plan = {
        id: 'plan1',
        startDate: today,
        targetDate: formatDate(
          new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
        ),
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 15,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        { actualUnits: 15, progressDate: today, cumulativeUnits: 15 },
      ]);

      expect(result.todayRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle skipWeekends in config', () => {
      const today = formatDate(new Date());
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        id: 'plan1',
        startDate: today,
        targetDate,
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 0,
        calculationMode: 'pages_per_day',
        configJson: { skipWeekends: true },
      };

      const result = calculateProgress(plan, []);

      expect(result.dailyTargetAdjusted).toBeDefined();
      expect(result.dailyTargetAdjusted).toBeGreaterThan(0);
    });
  });

  describe('calculateTodayTarget', () => {
    it('should return daily target minus completed today when on schedule', () => {
      const plan = {
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 0,
      };

      const result = calculateTodayTarget(plan, 10, 0);

      expect(result).toBe(20); // 30 - 10
    });

    it('should return 0 when daily target already met', () => {
      const plan = {
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 0,
      };

      const result = calculateTodayTarget(plan, 30, 0);

      expect(result).toBe(0);
    });

    it('should reduce target when ahead of schedule', () => {
      const plan = {
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 100,
      };

      const result = calculateTodayTarget(plan, 0, 150); // ahead by 50

      // Should use 75% of daily target
      const adjusted = Math.ceil(30 * 0.75); // 23
      expect(result).toBe(adjusted);
    });

    it('should return 0 if result would be negative', () => {
      const plan = {
        dailyTarget: 10,
        totalUnits: 100,
        completedUnits: 0,
      };

      const result = calculateTodayTarget(plan, 50, 0); // Already completed 50 units

      expect(result).toBe(0);
    });
  });

  describe('replanFromToday', () => {
    it('should calculate new daily target with default target date', () => {
      const today = formatDate(new Date());
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        startDate: formatDate(
          new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
        ),
        targetDate,
        totalUnits: 300,
        completedUnits: 50,
        dailyTarget: 30,
        calculationMode: 'pages_per_day',
      };

      const result = replanFromToday(plan);

      expect(result.newTargetDate).toBe(targetDate);
      expect(result.daysRemaining).toBeGreaterThan(0);
      expect(result.newDailyTarget).toBeGreaterThan(0);
      expect(result.isViable).toBe(true);
    });

    it('should accept custom new target date', () => {
      const today = formatDate(new Date());
      const newTargetDate = formatDate(
        new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        startDate: formatDate(
          new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
        ),
        targetDate: formatDate(
          new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
        ),
        totalUnits: 300,
        completedUnits: 50,
        dailyTarget: 30,
        calculationMode: 'pages_per_day',
      };

      const result = replanFromToday(plan, newTargetDate);

      expect(result.newTargetDate).toBe(newTargetDate);
    });

    it('should be non-viable when no effective remaining reading days', () => {
      const plan = {
        startDate: '2024-01-01',
        targetDate: '2024-01-06', // Saturday
        totalUnits: 300,
        completedUnits: 100,
        dailyTarget: 30,
        calculationMode: 'pages_per_day',
        configJson: { skipWeekends: true },
      };

      const result = replanFromToday(plan, '2024-01-06');

      expect(result.isViable).toBe(false);
      expect(result.warnings.some((w) => w.includes('No hay días'))).toBe(true);
    });

    it('should calculate new daily target with remaining units', () => {
      const today = formatDate(new Date());
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        startDate: '2024-01-01',
        targetDate,
        totalUnits: 100,
        completedUnits: 30,
        dailyTarget: 10,
        calculationMode: 'pages_per_day',
      };

      const result = replanFromToday(plan);

      // 70 remaining units over remaining days
      expect(result.newDailyTarget).toBeGreaterThan(0);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('should warn when new daily target exceeds threshold', () => {
      const today = formatDate(new Date());
      const targetDate = formatDate(
        new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        startDate: '2024-01-01',
        targetDate,
        totalUnits: 1000,
        completedUnits: 100,
        dailyTarget: 50,
        calculationMode: 'pages_per_day',
      };

      const result = replanFromToday(plan);

      expect(result.warnings.some((w) => w.includes('meta diaria'))).toBe(true);
    });

    it('should handle plan already completed', () => {
      const plan = {
        startDate: '2024-01-01',
        targetDate: formatDate(
          new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000),
        ),
        totalUnits: 100,
        completedUnits: 100,
        dailyTarget: 20,
        calculationMode: 'pages_per_day',
      };

      const result = replanFromToday(plan);

      expect(result.newDailyTarget).toBe(0); // All units completed
    });

    it('should handle custom rest days in config', () => {
      const today = formatDate(new Date());
      const targetDate = formatDate(
        new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        startDate: '2024-01-01',
        targetDate,
        totalUnits: 200,
        completedUnits: 50,
        dailyTarget: 20,
        calculationMode: 'pages_per_day',
        configJson: { restDays: [0] }, // Sunday only
      };

      const result = replanFromToday(plan);

      expect(result.newDailyTarget).toBeGreaterThan(0);
      expect(result.isViable).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should handle a complete reading workflow', () => {
      // Create a plan with dates relative to mock today
      const today = mockToday; // '2026-04-01'
      const startDate = today;
      const targetDate = formatDate(
        new Date(new Date(today).getTime() + 19 * 24 * 60 * 60 * 1000),
      ); // 19 days from today

      const config: PlanConfig = {
        totalUnits: 400,
        startDate,
        targetDate,
        mode: 'pages_per_day',
        skipWeekends: true,
      };

      const plan = calculatePlan(config);
      expect(plan.isViable).toBe(true);

      // Progress after 2 days
      const day1 = startDate;
      const day2 = formatDate(
        new Date(new Date(startDate).getTime() + 1 * 24 * 60 * 60 * 1000),
      );
      const plan3days = {
        id: 'plan1',
        startDate: config.startDate,
        targetDate: config.targetDate,
        dailyTarget: plan.dailyTarget,
        totalUnits: config.totalUnits,
        completedUnits: plan.dailyTarget * 2, // 2 days of reading
        calculationMode: config.mode,
        configJson: { skipWeekends: config.skipWeekends },
      };

      const progress = calculateProgress(plan3days, [
        {
          actualUnits: plan.dailyTarget,
          progressDate: day1,
          cumulativeUnits: plan.dailyTarget,
        },
        {
          actualUnits: plan.dailyTarget,
          progressDate: day2,
          cumulativeUnits: plan.dailyTarget * 2,
        },
      ]);

      expect(progress.completedUnits).toBe(plan.dailyTarget * 2);
      expect(progress.percentComplete).toBeGreaterThan(0);

      // Replan from today
      const replan = replanFromToday(plan3days);
      expect(replan.isViable).toBe(true);
      expect(replan.newDailyTarget).toBeLessThanOrEqual(plan.dailyTarget + 10); // Slightly higher due to less time
    });

    it('should handle weekend-only schedule (inverted reading)', () => {
      const config: PlanConfig = {
        totalUnits: 100,
        startDate: '2024-01-06', // Saturday
        targetDate: '2024-02-11', // Sunday
        mode: 'pages_per_day',
        restDays: [1, 2, 3, 4, 5], // Only Saturday and Sunday
      };

      const plan = calculatePlan(config);
      expect(plan.effectiveDays).toBeGreaterThan(0); // Should have some weekends
      expect(plan.isViable).toBe(true);
    });

    it('should handle plan that spans multiple months', () => {
      const config: PlanConfig = {
        totalUnits: 1000,
        startDate: '2024-01-01',
        targetDate: '2024-03-31',
        mode: 'pages_per_day',
      };

      const plan = calculatePlan(config);
      expect(plan.daysTotal).toBeGreaterThan(80);
      expect(plan.effectiveDays).toBeGreaterThan(80);
      expect(plan.isViable).toBe(true);
      expect(plan.dailyTarget).toBeLessThan(15); // Should be reasonable daily target
    });

    it('should calculate different daily targets for different modes', () => {
      const baseConfig = {
        startDate: '2024-01-01',
        targetDate: '2024-01-10',
      };

      const pagesConfig: PlanConfig = {
        ...baseConfig,
        totalUnits: 300,
        mode: 'pages_per_day',
      };

      const wordsConfig: PlanConfig = {
        ...baseConfig,
        totalUnits: 100000,
        mode: 'words_per_day',
      };

      const chaptersConfig: PlanConfig = {
        ...baseConfig,
        totalUnits: 30,
        mode: 'chapters_per_day',
      };

      const pagesPlan = calculatePlan(pagesConfig);
      const wordsPlan = calculatePlan(wordsConfig);
      const chaptersPlan = calculatePlan(chaptersConfig);

      expect(pagesPlan.dailyTarget).toBeGreaterThan(0);
      expect(wordsPlan.dailyTarget).toBeGreaterThan(0);
      expect(chaptersPlan.dailyTarget).toBeGreaterThan(0);

      // Word target should be much larger than page target
      expect(wordsPlan.dailyTarget).toBeGreaterThan(pagesPlan.dailyTarget * 100);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small plans (1 page)', () => {
      const config: PlanConfig = {
        totalUnits: 1,
        startDate: '2024-01-01',
        targetDate: '2024-01-01',
        mode: 'pages_per_day',
      };

      const result = calculatePlan(config);
      expect(result.dailyTarget).toBe(1);
      expect(result.isViable).toBe(true);
    });

    it('should handle very large plans', () => {
      const config: PlanConfig = {
        totalUnits: 1000000,
        startDate: '2024-01-01',
        targetDate: '2024-12-31',
        mode: 'words_per_day',
      };

      const result = calculatePlan(config);
      expect(result.dailyTarget).toBeGreaterThan(0);
      expect(result.isViable).toBe(true);
    });

    it('should handle date parsing with zero-padded values', () => {
      const date = formatDate(new Date(2024, 0, 5)); // January 5
      expect(date).toBe('2024-01-05');

      const diff = diffDays('2024-01-01', '2024-01-10');
      expect(diff).toBe(9);
    });

    it('should handle progress with zero days elapsed', () => {
      const today = formatDate(new Date());
      const plan = {
        id: 'plan1',
        startDate: today,
        targetDate: formatDate(
          new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
        ),
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 0,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, []);
      expect(result.daysElapsed).toBe(0);
      expect(result.projectedCompletionDate).toBeDefined();
    });

    it('should handle multiple progress entries on same day', () => {
      const today = formatDate(new Date());
      const plan = {
        id: 'plan1',
        startDate: today,
        targetDate: formatDate(
          new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
        ),
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 90,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, [
        { actualUnits: 30, progressDate: today, cumulativeUnits: 30 },
        { actualUnits: 30, progressDate: today, cumulativeUnits: 60 },
        { actualUnits: 30, progressDate: today, cumulativeUnits: 90 },
      ]);

      expect(result.completedUnits).toBe(90);
      expect(result.todayRemaining).toBe(0);
    });

    it('should handle negative progress gracefully (clamp to 0)', () => {
      const plan = {
        id: 'plan1',
        startDate: '2024-01-01',
        targetDate: '2024-01-11',
        dailyTarget: 30,
        totalUnits: 100,
        completedUnits: 50,
        calculationMode: 'pages_per_day',
      };

      // remainingUnits would be 50, should never go negative
      const result = calculateProgress(plan, []);
      expect(result.completedUnits).toBeGreaterThanOrEqual(0);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle plan with all rest days', () => {
      const config: PlanConfig = {
        totalUnits: 300,
        startDate: '2024-01-01',
        targetDate: '2024-01-07',
        mode: 'pages_per_day',
        restDays: [0, 1, 2, 3, 4, 5, 6], // All days are rest days
      };

      const result = calculatePlan(config);
      expect(result.isViable).toBe(false);
      expect(result.warnings.some((w) => w.includes('No hay días'))).toBe(true);
    });

    it('should handle replanning with 0 remaining units', () => {
      const today = mockToday; // '2026-04-01'
      const targetDate = formatDate(
        new Date(new Date(today).getTime() + 10 * 24 * 60 * 60 * 1000),
      );
      const plan = {
        startDate: today,
        targetDate,
        totalUnits: 100,
        completedUnits: 100,
        dailyTarget: 10,
        calculationMode: 'pages_per_day',
      };

      const result = replanFromToday(plan);
      expect(result.newDailyTarget).toBe(0);
      expect(result.isViable).toBe(false); // Not viable because daily target < 1
    });

    it('should handle future progress calculation', () => {
      const tomorrow = formatDate(
        new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      );
      const tomorrowPlus10 = formatDate(
        new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
      );

      const plan = {
        id: 'plan1',
        startDate: tomorrow,
        targetDate: tomorrowPlus10,
        dailyTarget: 30,
        totalUnits: 300,
        completedUnits: 0,
        calculationMode: 'pages_per_day',
      };

      const result = calculateProgress(plan, []);
      // Days elapsed should be 0 or negative (plan hasn't started)
      expect(result.daysElapsed).toBeLessThanOrEqual(0);
    });
  });
});
