/**
 * Practice Engine
 * Pure deterministic functions for streak calculations and statistics
 * No database access, no side effects, fully testable
 */

export interface StreakResult {
  currentStreak: number; // consecutive days with any session
  longestStreak: number;
  lastPracticeDate: string; // YYYY-MM-DD
  totalSessions: number;
  totalMinutes: number;
  isActiveToday: boolean;
}

export interface WeeklySummary {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;
  totalSessions: number;
  totalMinutes: number;
  daysActive: number;
  categoriesUsed: string[]; // category names
  averageSessionMinutes: number;
  moodDistribution: Record<string, number>;
  comparedToPreviousWeek:
    | {
        sessionsDiff: number;
        minutesDiff: number;
        trend: 'up' | 'down' | 'stable';
      }
    | null;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
}

export interface DayActivity {
  date: string;
  sessions: number;
  totalMinutes: number;
  categories: string[];
  hasActivity: boolean;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  minutes: number;
  sessions: number;
}

export interface SessionData {
  date: string; // YYYY-MM-DD
  minutes: number;
  categoryName: string;
  mood?: string;
}

/**
 * Calculate streak from sorted array of dates
 * Dates must be sorted in ascending order and in YYYY-MM-DD format
 */
export function calculateStreak(sessionDates: string[]): StreakResult {
  if (sessionDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: '',
      totalSessions: 0,
      totalMinutes: 0,
      isActiveToday: false,
    };
  }

  const today = getToday();
  const uniqueDates = Array.from(new Set(sessionDates)).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if active today
  const isActiveToday = uniqueDates[uniqueDates.length - 1] === today;

  // Calculate streaks from the end
  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const currentDate = uniqueDates[i];
    const expectedDate =
      i === uniqueDates.length - 1
        ? today
        : addDays(uniqueDates[i + 1], -1);

    if (currentDate === expectedDate) {
      tempStreak++;
      if (i === uniqueDates.length - 1) {
        currentStreak = tempStreak;
      }
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 1;
    }

    if (i === 0 && tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  // If no activity today, current streak ends at last practice
  if (!isActiveToday && currentStreak === 0 && uniqueDates.length > 0) {
    currentStreak = 1;
  }

  return {
    currentStreak: isActiveToday ? currentStreak : 0,
    longestStreak,
    lastPracticeDate: uniqueDates[uniqueDates.length - 1],
    totalSessions: sessionDates.length,
    totalMinutes: 0, // Will be calculated by caller
    isActiveToday,
  };
}

/**
 * Calculate category-specific streak
 */
export function calculateCategoryStreak(sessionDates: string[]): {
  current: number;
  longest: number;
} {
  const result = calculateStreak(sessionDates);
  return {
    current: result.currentStreak,
    longest: result.longestStreak,
  };
}

/**
 * Calculate weekly summary
 */
export function calculateWeeklySummary(
  sessions: SessionData[],
  previousWeekSessions?: SessionData[],
): WeeklySummary {
  const today = getToday();
  const { weekStart, weekEnd } = getCurrentWeekRange(today);

  const weekSessions = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);
  const uniqueDaysInWeek = new Set(weekSessions.map((s) => s.date));
  const categoriesInWeek = new Set(weekSessions.map((s) => s.categoryName));

  const totalMinutes = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const moodDistribution: Record<string, number> = {};

  weekSessions.forEach((s) => {
    if (s.mood) {
      moodDistribution[s.mood] = (moodDistribution[s.mood] || 0) + 1;
    }
  });

  let comparedToPreviousWeek: WeeklySummary['comparedToPreviousWeek'] = null;

  if (previousWeekSessions && previousWeekSessions.length > 0) {
    const prevWeekMinutes = previousWeekSessions.reduce((sum, s) => sum + s.minutes, 0);
    const prevWeekSessions = previousWeekSessions.length;
    const sessionsDiff = weekSessions.length - prevWeekSessions;
    const minutesDiff = totalMinutes - prevWeekMinutes;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (sessionsDiff > 0) trend = 'up';
    else if (sessionsDiff < 0) trend = 'down';

    comparedToPreviousWeek = {
      sessionsDiff,
      minutesDiff,
      trend,
    };
  }

  return {
    weekStart,
    weekEnd,
    totalSessions: weekSessions.length,
    totalMinutes,
    daysActive: uniqueDaysInWeek.size,
    categoriesUsed: Array.from(categoriesInWeek),
    averageSessionMinutes:
      weekSessions.length > 0 ? Math.round(totalMinutes / weekSessions.length) : 0,
    moodDistribution,
    comparedToPreviousWeek,
  };
}

/**
 * Calculate category-specific statistics
 */
export function calculateCategoryStats(
  sessions: SessionData[],
  categoryId: string,
  categoryName: string,
): CategoryStats {
  const categorySessions = sessions.filter((s) => s.categoryName === categoryName);
  const sessionDates = categorySessions.map((s) => s.date).sort();
  const streak = calculateStreak(sessionDates);

  const today = getToday();
  const weekStart = subtractDays(today, 7);
  const monthStart = subtractDays(today, 30);

  const thisWeekMinutes = categorySessions
    .filter((s) => s.date >= weekStart && s.date <= today)
    .reduce((sum, s) => sum + s.minutes, 0);

  const thisMonthMinutes = categorySessions
    .filter((s) => s.date >= monthStart && s.date <= today)
    .reduce((sum, s) => sum + s.minutes, 0);

  const totalMinutes = categorySessions.reduce((sum, s) => sum + s.minutes, 0);

  return {
    categoryId,
    categoryName,
    totalSessions: categorySessions.length,
    totalMinutes,
    averageDuration:
      categorySessions.length > 0 ? Math.round(totalMinutes / categorySessions.length) : 0,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastPracticeDate: streak.lastPracticeDate || null,
    thisWeekMinutes,
    thisMonthMinutes,
  };
}

/**
 * Get daily activity for calendar heatmap
 */
export function getDayActivities(
  sessions: SessionData[],
  startDate: string,
  endDate: string,
): DayActivity[] {
  const activities: Map<string, DayActivity> = new Map();

  // Initialize all days in range
  let current = new Date(startDate);
  while (current.toISOString().split('T')[0] <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    activities.set(dateStr, {
      date: dateStr,
      sessions: 0,
      totalMinutes: 0,
      categories: [],
      hasActivity: false,
    });
    current.setDate(current.getDate() + 1);
  }

  // Fill in actual sessions
  sessions.forEach((s) => {
    if (s.date >= startDate && s.date <= endDate) {
      const activity = activities.get(s.date) || {
        date: s.date,
        sessions: 0,
        totalMinutes: 0,
        categories: [],
        hasActivity: false,
      };
      activity.sessions++;
      activity.totalMinutes += s.minutes;
      if (!activity.categories.includes(s.categoryName)) {
        activity.categories.push(s.categoryName);
      }
      activity.hasActivity = true;
      activities.set(s.date, activity);
    }
  });

  return Array.from(activities.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get monthly trend over specified months
 */
export function getMonthlyTrend(sessions: SessionData[], months: number = 12): MonthlyTrend[] {
  const today = getToday();
  const trend: Map<string, MonthlyTrend> = new Map();

  // Initialize months
  for (let i = months - 1; i >= 0; i--) {
    const date = subtractMonths(today, i);
    const monthKey = date.substring(0, 7); // YYYY-MM
    trend.set(monthKey, {
      month: monthKey,
      minutes: 0,
      sessions: 0,
    });
  }

  // Accumulate sessions
  sessions.forEach((s) => {
    const monthKey = s.date.substring(0, 7);
    const existing = trend.get(monthKey);
    if (existing) {
      existing.minutes += s.minutes;
      existing.sessions++;
    }
  });

  return Array.from(trend.values());
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '0min';
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

function subtractMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

function getCurrentWeekRange(dateStr: string): { weekStart: string; weekEnd: string } {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const weekStart = new Date(date.setDate(diff));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
  };
}
