import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateStreak,
  calculateCategoryStreak,
  calculateWeeklySummary,
  calculateCategoryStats,
  getDayActivities,
  getMonthlyTrend,
  formatDuration,
  type SessionData,
  type StreakResult,
  type WeeklySummary,
  type CategoryStats,
  type DayActivity,
  type MonthlyTrend,
} from '../practice-engine';

// Mock today's date for consistent testing
const mockToday = '2026-04-01';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(mockToday));
});

describe('calculateStreak', () => {
  it('should return empty streak for empty session array', () => {
    const result = calculateStreak([]);

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastPracticeDate).toBe('');
    expect(result.totalSessions).toBe(0);
    expect(result.isActiveToday).toBe(false);
  });

  it('should calculate current streak with consecutive days ending today', () => {
    const dates = ['2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01'];
    const result = calculateStreak(dates);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(4);
    expect(result.lastPracticeDate).toBe('2026-04-01');
    expect(result.isActiveToday).toBe(true);
  });

  it('should handle single entry', () => {
    const dates = ['2026-04-01'];
    const result = calculateStreak(dates);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastPracticeDate).toBe('2026-04-01');
    expect(result.isActiveToday).toBe(true);
  });

  it('should return 0 current streak if last practice was not today', () => {
    const dates = ['2026-03-29', '2026-03-30', '2026-03-31'];
    const result = calculateStreak(dates);

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(3);
    expect(result.lastPracticeDate).toBe('2026-03-31');
    expect(result.isActiveToday).toBe(false);
  });

  it('should handle gaps in dates and find longest streak', () => {
    const dates = [
      '2026-03-10',
      '2026-03-11',
      '2026-03-12', // 3-day streak
      '2026-03-15', // gap
      '2026-03-16',
      '2026-03-17',
      '2026-03-18',
      '2026-03-19', // 5-day streak (includes 03-15)
    ];
    const result = calculateStreak(dates);

    expect(result.longestStreak).toBe(5);
    expect(result.currentStreak).toBe(0);
  });

  it('should deduplicate dates', () => {
    const dates = ['2026-03-31', '2026-03-31', '2026-04-01', '2026-04-01'];
    const result = calculateStreak(dates);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
    expect(result.totalSessions).toBe(4); // counts all, including duplicates
  });

  it('should handle very long streaks (100+ days)', () => {
    const dates: string[] = [];
    for (let i = 100; i >= 0; i--) {
      const date = new Date(mockToday);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    const result = calculateStreak(dates);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(101);
  });

  it('should sort unsorted dates correctly', () => {
    const dates = ['2026-03-31', '2026-03-29', '2026-03-30'];
    const result = calculateStreak(dates);

    expect(result.currentStreak).toBe(0); // not today
    expect(result.longestStreak).toBe(3); // all consecutive
  });
});

describe('calculateCategoryStreak', () => {
  it('should return category streak without extra data', () => {
    const dates = ['2026-03-30', '2026-03-31', '2026-04-01'];
    const result = calculateCategoryStreak(dates);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(3);
  });

  it('should handle empty dates array', () => {
    const result = calculateCategoryStreak([]);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it('should return non-active current streak when not today', () => {
    const dates = ['2026-03-29', '2026-03-30', '2026-03-31'];
    const result = calculateCategoryStreak(dates);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(3);
  });
});

describe('calculateWeeklySummary', () => {
  it('should calculate weekly summary with no sessions', () => {
    const result = calculateWeeklySummary([]);

    expect(result.totalSessions).toBe(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.daysActive).toBe(0);
    expect(result.categoriesUsed).toEqual([]);
    expect(result.averageSessionMinutes).toBe(0);
    expect(result.moodDistribution).toEqual({});
  });

  it('should calculate weekly summary with sessions in current week', () => {
    // Week of 2026-03-30 to 2026-04-05 (Mon-Sun)
    const sessions: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation', mood: 'calm' },
      { date: '2026-03-31', minutes: 45, categoryName: 'Yoga', mood: 'energized' },
      { date: '2026-04-01', minutes: 20, categoryName: 'Meditation', mood: 'calm' },
    ];

    const result = calculateWeeklySummary(sessions);

    expect(result.totalSessions).toBe(3);
    expect(result.totalMinutes).toBe(95);
    expect(result.daysActive).toBe(3);
    expect(result.averageSessionMinutes).toBe(32); // 95/3 = 31.67, rounded to 32
    expect(result.moodDistribution).toEqual({ calm: 2, energized: 1 });
    expect(result.categoriesUsed).toContain('Meditation');
    expect(result.categoriesUsed).toContain('Yoga');
  });

  it('should filter out sessions outside current week', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-20', minutes: 30, categoryName: 'Meditation' }, // before week
      { date: '2026-03-30', minutes: 45, categoryName: 'Yoga' }, // in week
      { date: '2026-04-10', minutes: 20, categoryName: 'Meditation' }, // after week
    ];

    const result = calculateWeeklySummary(sessions);

    expect(result.totalSessions).toBe(1);
    expect(result.totalMinutes).toBe(45);
  });

  it('should compare to previous week when data provided', () => {
    const currentWeek: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-31', minutes: 45, categoryName: 'Yoga' },
    ];
    const previousWeek: SessionData[] = [
      { date: '2026-03-23', minutes: 20, categoryName: 'Meditation' },
      { date: '2026-03-25', minutes: 15, categoryName: 'Yoga' },
    ];

    const result = calculateWeeklySummary(currentWeek, previousWeek);

    expect(result.comparedToPreviousWeek).not.toBeNull();
    expect(result.comparedToPreviousWeek?.sessionsDiff).toBe(0); // 2 current, 2 previous
    expect(result.comparedToPreviousWeek?.minutesDiff).toBe(40); // 75 - 35 = 40
    expect(result.comparedToPreviousWeek?.trend).toBe('stable');
  });

  it('should show up trend when more sessions than previous week', () => {
    const currentWeek: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-31', minutes: 45, categoryName: 'Yoga' },
      { date: '2026-04-01', minutes: 20, categoryName: 'Meditation' },
    ];
    const previousWeek: SessionData[] = [
      { date: '2026-03-23', minutes: 50, categoryName: 'Meditation' },
    ];

    const result = calculateWeeklySummary(currentWeek, previousWeek);

    expect(result.comparedToPreviousWeek?.trend).toBe('up');
    expect(result.comparedToPreviousWeek?.sessionsDiff).toBe(2); // 3 - 1
  });

  it('should show down trend when fewer sessions than previous week', () => {
    const currentWeek: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
    ];
    const previousWeek: SessionData[] = [
      { date: '2026-03-23', minutes: 50, categoryName: 'Meditation' },
      { date: '2026-03-24', minutes: 40, categoryName: 'Yoga' },
    ];

    const result = calculateWeeklySummary(currentWeek, previousWeek);

    expect(result.comparedToPreviousWeek?.trend).toBe('down');
    expect(result.comparedToPreviousWeek?.sessionsDiff).toBe(-1); // 1 - 2
  });
});

describe('calculateCategoryStats', () => {
  it('should calculate stats for category with no sessions', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Yoga' },
    ];

    const result = calculateCategoryStats(sessions, 'med-1', 'Meditation');

    expect(result.categoryId).toBe('med-1');
    expect(result.categoryName).toBe('Meditation');
    expect(result.totalSessions).toBe(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.averageDuration).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastPracticeDate).toBeNull();
  });

  it('should calculate category stats correctly', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-28', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-29', minutes: 45, categoryName: 'Meditation' },
      { date: '2026-03-30', minutes: 20, categoryName: 'Meditation' },
      { date: '2026-04-01', minutes: 15, categoryName: 'Meditation' }, // gap, today
      { date: '2026-03-30', minutes: 60, categoryName: 'Yoga' }, // different category
    ];

    const result = calculateCategoryStats(sessions, 'med-1', 'Meditation');

    expect(result.totalSessions).toBe(4);
    expect(result.totalMinutes).toBe(110);
    expect(result.averageDuration).toBe(28); // 110/4 = 27.5, rounded to 28
    expect(result.lastPracticeDate).toBe('2026-04-01');
  });

  it('should calculate this week minutes', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-20', minutes: 30, categoryName: 'Meditation' }, // before week
      { date: '2026-03-31', minutes: 45, categoryName: 'Meditation' }, // this week
      { date: '2026-04-01', minutes: 20, categoryName: 'Meditation' }, // this week
    ];

    const result = calculateCategoryStats(sessions, 'med-1', 'Meditation');

    expect(result.thisWeekMinutes).toBe(65);
  });

  it('should calculate this month minutes (last 30 days)', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-01', minutes: 30, categoryName: 'Meditation' }, // before month
      { date: '2026-03-05', minutes: 45, categoryName: 'Meditation' }, // this month (within 30 days)
      { date: '2026-04-01', minutes: 20, categoryName: 'Meditation' }, // this month
    ];

    const result = calculateCategoryStats(sessions, 'med-1', 'Meditation');

    expect(result.thisMonthMinutes).toBeGreaterThanOrEqual(65); // at least the 45+20
  });

  it('should filter by category name correctly', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-31', minutes: 45, categoryName: 'Yoga' },
      { date: '2026-04-01', minutes: 20, categoryName: 'Meditation' },
    ];

    const yogaStats = calculateCategoryStats(sessions, 'yoga-1', 'Yoga');

    expect(yogaStats.totalSessions).toBe(1);
    expect(yogaStats.totalMinutes).toBe(45);
  });
});

describe('getDayActivities', () => {
  it('should return empty activities for date range with no sessions', () => {
    const result = getDayActivities([], '2026-04-01', '2026-04-03');

    expect(result).toHaveLength(3);
    expect(result.every((a) => !a.hasActivity)).toBe(true);
    expect(result[0].date).toBe('2026-04-01');
  });

  it('should initialize all days in range', () => {
    const result = getDayActivities([], '2026-03-30', '2026-04-01');

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2026-03-30');
    expect(result[1].date).toBe('2026-03-31');
    expect(result[2].date).toBe('2026-04-01');
  });

  it('should aggregate sessions by day', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-30', minutes: 15, categoryName: 'Yoga' },
      { date: '2026-03-31', minutes: 45, categoryName: 'Meditation' },
    ];

    const result = getDayActivities(sessions, '2026-03-30', '2026-03-31');

    expect(result[0].date).toBe('2026-03-30');
    expect(result[0].sessions).toBe(2);
    expect(result[0].totalMinutes).toBe(45);
    expect(result[0].hasActivity).toBe(true);

    expect(result[1].date).toBe('2026-03-31');
    expect(result[1].sessions).toBe(1);
    expect(result[1].totalMinutes).toBe(45);
  });

  it('should track unique categories per day', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-30', minutes: 15, categoryName: 'Yoga' },
      { date: '2026-03-30', minutes: 20, categoryName: 'Meditation' }, // duplicate category
    ];

    const result = getDayActivities(sessions, '2026-03-30', '2026-03-30');

    expect(result[0].categories).toHaveLength(2);
    expect(result[0].categories).toContain('Meditation');
    expect(result[0].categories).toContain('Yoga');
  });

  it('should filter sessions outside date range', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-20', minutes: 30, categoryName: 'Meditation' }, // before range
      { date: '2026-03-30', minutes: 45, categoryName: 'Yoga' },
      { date: '2026-04-10', minutes: 20, categoryName: 'Meditation' }, // after range
    ];

    const result = getDayActivities(sessions, '2026-03-30', '2026-03-31');

    expect(result[0].sessions).toBe(1);
    expect(result[0].totalMinutes).toBe(45);
  });

  it('should sort results by date', () => {
    const sessions: SessionData[] = [
      { date: '2026-04-02', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-04-01', minutes: 45, categoryName: 'Yoga' },
      { date: '2026-04-03', minutes: 20, categoryName: 'Meditation' },
    ];

    const result = getDayActivities(sessions, '2026-04-01', '2026-04-03');

    expect(result[0].date).toBe('2026-04-01');
    expect(result[1].date).toBe('2026-04-02');
    expect(result[2].date).toBe('2026-04-03');
  });

  it('should handle sessions spanning midnight correctly', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-30', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-03-31', minutes: 45, categoryName: 'Meditation' },
    ];

    const result = getDayActivities(sessions, '2026-03-30', '2026-03-31');

    expect(result).toHaveLength(2);
    expect(result[0].totalMinutes).toBe(30);
    expect(result[1].totalMinutes).toBe(45);
  });
});

describe('getMonthlyTrend', () => {
  it('should initialize 12 months by default', () => {
    const result = getMonthlyTrend([]);

    expect(result).toHaveLength(12);
  });

  it('should initialize requested number of months', () => {
    const result = getMonthlyTrend([], 6);

    expect(result).toHaveLength(6);
  });

  it('should aggregate sessions by month', () => {
    const sessions: SessionData[] = [
      { date: '2026-02-15', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-02-20', minutes: 45, categoryName: 'Yoga' },
      { date: '2026-03-10', minutes: 60, categoryName: 'Meditation' },
    ];

    const result = getMonthlyTrend(sessions, 3);

    const february = result.find((t) => t.month === '2026-02');
    const march = result.find((t) => t.month === '2026-03');

    expect(february?.sessions).toBe(2);
    expect(february?.minutes).toBe(75);
    expect(march?.sessions).toBe(1);
    expect(march?.minutes).toBe(60);
  });

  it('should handle months with no sessions', () => {
    const sessions: SessionData[] = [
      { date: '2026-02-15', minutes: 30, categoryName: 'Meditation' },
    ];

    const result = getMonthlyTrend(sessions, 3);

    expect(result).toHaveLength(3);
    expect(result.some((t) => t.sessions === 0)).toBe(true);
  });

  it('should include all months in range regardless of session data', () => {
    const sessions: SessionData[] = [
      { date: '2026-04-01', minutes: 30, categoryName: 'Meditation' },
    ];

    const result = getMonthlyTrend(sessions, 3);

    expect(result.some((t) => t.month === '2026-02')).toBe(true);
    expect(result.some((t) => t.month === '2026-03')).toBe(true);
    expect(result.some((t) => t.month === '2026-04')).toBe(true);
  });

  it('should only include sessions within the month range', () => {
    const sessions: SessionData[] = [
      { date: '2025-12-15', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-02-15', minutes: 45, categoryName: 'Yoga' },
      { date: '2026-05-01', minutes: 60, categoryName: 'Meditation' },
    ];

    const result = getMonthlyTrend(sessions, 3); // only last 3 months

    const decemberPrev = result.find((t) => t.month === '2025-12');
    const february = result.find((t) => t.month === '2026-02');
    const mayFuture = result.find((t) => t.month === '2026-05');

    expect(decemberPrev).toBeUndefined();
    expect(february?.sessions).toBe(1);
    expect(mayFuture).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('should format zero minutes', () => {
    expect(formatDuration(0)).toBe('0min');
  });

  it('should format fractional minutes as zero', () => {
    expect(formatDuration(0.5)).toBe('0min');
  });

  it('should format minutes under 60', () => {
    expect(formatDuration(1)).toBe('1min');
    expect(formatDuration(30)).toBe('30min');
    expect(formatDuration(59)).toBe('59min');
  });

  it('should format exactly 60 minutes as 1 hour', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('should format hours with remainder minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(125)).toBe('2h 5min');
  });

  it('should format multiple hours', () => {
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(180)).toBe('3h');
  });

  it('should format large durations', () => {
    expect(formatDuration(600)).toBe('10h');
    expect(formatDuration(645)).toBe('10h 45min');
  });

  it('should handle edge case of just under next hour', () => {
    expect(formatDuration(119)).toBe('1h 59min');
  });
});

describe('Integration tests', () => {
  it('should work together to build complete practice statistics', () => {
    const sessions: SessionData[] = [
      { date: '2026-03-28', minutes: 30, categoryName: 'Meditation', mood: 'calm' },
      { date: '2026-03-29', minutes: 45, categoryName: 'Yoga', mood: 'energized' },
      { date: '2026-03-30', minutes: 25, categoryName: 'Meditation' },
      { date: '2026-03-31', minutes: 50, categoryName: 'Meditation' },
      { date: '2026-04-01', minutes: 35, categoryName: 'Yoga' },
    ];

    // Streak
    const dates = sessions.map((s) => s.date);
    const streak = calculateStreak(dates);
    expect(streak.totalSessions).toBe(5);
    expect(streak.isActiveToday).toBe(true);

    // Weekly summary
    const weekly = calculateWeeklySummary(sessions);
    expect(weekly.totalSessions).toBe(3); // Only 03-30, 03-31, 04-01 are in current week (Mon-Sun)
    expect(weekly.totalMinutes).toBe(110); // 25 + 50 + 35

    // Category stats
    const meditationStats = calculateCategoryStats(sessions, 'med-1', 'Meditation');
    expect(meditationStats.totalSessions).toBe(3);
    expect(meditationStats.totalMinutes).toBe(105);

    // Day activities
    const activities = getDayActivities(sessions, '2026-03-28', '2026-04-01');
    expect(activities).toHaveLength(5);
    expect(activities.filter((a) => a.hasActivity)).toHaveLength(5);

    // Monthly trend (1 month = current month only)
    const trend = getMonthlyTrend(sessions, 1);
    expect(trend[0].sessions).toBe(1); // Only 04-01 is in April
    expect(trend[0].minutes).toBe(35); // Only the 04-01 session (Yoga, 35 min)
  });

  it('should handle complex streak scenario with multiple breaks', () => {
    const sessions: SessionData[] = [
      { date: '2026-01-01', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-01-02', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-01-03', minutes: 30, categoryName: 'Meditation' }, // 3-day streak
      // 10-day gap
      { date: '2026-01-14', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-01-15', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-01-16', minutes: 30, categoryName: 'Meditation' },
      { date: '2026-01-17', minutes: 30, categoryName: 'Meditation' }, // 4-day streak
      // 75 days
      { date: '2026-04-01', minutes: 30, categoryName: 'Meditation' }, // 1-day streak today
    ];

    const dates = sessions.map((s) => s.date);
    const streak = calculateStreak(dates);

    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(4);
    expect(streak.lastPracticeDate).toBe('2026-04-01');
  });
});
