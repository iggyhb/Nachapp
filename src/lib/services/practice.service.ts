/**
 * Practice Service
 * Business logic for habit tracking and practice management
 * Combines database operations with practice-engine calculations
 */

import { randomUUID } from 'crypto';
import { db } from '@/lib/db/client';
import {
  practiceCategories,
  practiceExercises,
  practiceSessions,
} from '@/lib/db/schema';
import {
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  sql,
} from 'drizzle-orm';
import {
  calculateStreak,
  calculateWeeklySummary,
  calculateCategoryStats,
  getDayActivities,
  getMonthlyTrend,
  type StreakResult,
  type WeeklySummary,
  type CategoryStats,
  type DayActivity,
  type MonthlyTrend,
  type SessionData,
} from './practice-engine';
import {
  generateSlug,
  type CreateCategory,
  type UpdateCategory,
  type CreateExercise,
  type UpdateExercise,
  type LogSession,
  type SessionQuery,
  type ReorderCategories,
} from '@/lib/validation/practice';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type PracticeCategory = typeof practiceCategories.$inferSelect;
export type PracticeExercise = typeof practiceExercises.$inferSelect;
export type PracticeSession = typeof practiceSessions.$inferSelect;

export interface CategoryWithStats extends PracticeCategory {
  sessionCount: number;
  totalMinutes: number;
}

export interface OverallStats {
  totalCategories: number;
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  categoryStats: CategoryStats[];
}

export interface DashboardStats extends OverallStats {
  weekSummary: WeeklySummary;
  monthlyTrend: MonthlyTrend[];
  topCategories: (CategoryStats & { percentOfTotal: number })[];
}

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Create a new practice category
 */
export async function createCategory(
  userId: string,
  input: CreateCategory,
): Promise<PracticeCategory> {
  const id = randomUUID();
  const slug = input.slug || generateSlug(input.name);

  const category = await db
    .insert(practiceCategories)
    .values({
      id,
      userId,
      name: input.name,
      slug,
      description: input.description,
      color: input.color,
      icon: input.icon,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return category[0];
}

/**
 * Get all categories for a user
 */
export async function getCategories(userId: string): Promise<CategoryWithStats[]> {
  const categories = await db
    .select()
    .from(practiceCategories)
    .where(eq(practiceCategories.userId, userId))
    .orderBy(asc(practiceCategories.sortOrder), asc(practiceCategories.createdAt));

  const categoriesWithStats = await Promise.all(
    categories.map(async (cat) => {
      const sessions = await db
        .select({
          durationMinutes: practiceSessions.durationMinutes,
        })
        .from(practiceSessions)
        .where(
          and(
            eq(practiceSessions.userId, userId),
            eq(practiceSessions.categoryId, cat.id),
          ),
        );

      const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      return {
        ...cat,
        sessionCount: sessions.length,
        totalMinutes,
      };
    }),
  );

  return categoriesWithStats;
}

/**
 * Update a practice category
 */
export async function updateCategory(
  categoryId: string,
  userId: string,
  updates: UpdateCategory,
): Promise<PracticeCategory> {
  const slug = updates.slug || (updates.name ? generateSlug(updates.name) : undefined);

  const category = await db
    .update(practiceCategories)
    .set({
      ...updates,
      ...(slug && { slug }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(practiceCategories.id, categoryId),
        eq(practiceCategories.userId, userId),
      ),
    )
    .returning();

  if (!category.length) {
    throw new Error('Category not found');
  }

  return category[0];
}

/**
 * Delete a practice category (cascades to exercises and sessions)
 */
export async function deleteCategory(categoryId: string, userId: string): Promise<void> {
  const result = await db
    .delete(practiceCategories)
    .where(
      and(
        eq(practiceCategories.id, categoryId),
        eq(practiceCategories.userId, userId),
      ),
    );

  if (result.count === 0) {
    throw new Error('Category not found');
  }
}

/**
 * Reorder categories by IDs
 */
export async function reorderCategories(
  userId: string,
  input: ReorderCategories,
): Promise<PracticeCategory[]> {
  const updates = input.categoryIds.map((id, index) =>
    db
      .update(practiceCategories)
      .set({ sortOrder: index, updatedAt: new Date() })
      .where(
        and(
          eq(practiceCategories.id, id),
          eq(practiceCategories.userId, userId),
        ),
      ),
  );

  await Promise.all(updates);

  const categories = await db
    .select()
    .from(practiceCategories)
    .where(eq(practiceCategories.userId, userId))
    .orderBy(asc(practiceCategories.sortOrder));

  return categories;
}

// ============================================================================
// EXERCISES
// ============================================================================

/**
 * Create a new exercise in a category
 */
export async function createExercise(
  userId: string,
  input: CreateExercise,
): Promise<PracticeExercise> {
  const id = randomUUID();

  const exercise = await db
    .insert(practiceExercises)
    .values({
      id,
      userId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      difficulty: input.difficulty,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return exercise[0];
}

/**
 * Get exercises for a user, optionally filtered by category
 */
export async function getExercises(
  userId: string,
  categoryId?: string,
): Promise<PracticeExercise[]> {
  const conditions = [
    eq(practiceExercises.userId, userId),
  ];

  if (categoryId) {
    conditions.push(eq(practiceExercises.categoryId, categoryId));
  }

  return db
    .select()
    .from(practiceExercises)
    .where(and(...conditions))
    .orderBy(asc(practiceExercises.sortOrder), asc(practiceExercises.createdAt));
}

/**
 * Update an exercise
 */
export async function updateExercise(
  exerciseId: string,
  userId: string,
  updates: UpdateExercise,
): Promise<PracticeExercise> {
  const exercise = await db
    .update(practiceExercises)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(practiceExercises.id, exerciseId),
        eq(practiceExercises.userId, userId),
      ),
    )
    .returning();

  if (!exercise.length) {
    throw new Error('Exercise not found');
  }

  return exercise[0];
}

/**
 * Delete an exercise
 */
export async function deleteExercise(exerciseId: string, userId: string): Promise<void> {
  const result = await db
    .delete(practiceExercises)
    .where(
      and(
        eq(practiceExercises.id, exerciseId),
        eq(practiceExercises.userId, userId),
      ),
    );

  if (result.count === 0) {
    throw new Error('Exercise not found');
  }
}

// ============================================================================
// SESSIONS
// ============================================================================

/**
 * Log a practice session
 * Must complete in <= 15 seconds (PRD requirement)
 */
export async function logSession(
  userId: string,
  input: LogSession,
): Promise<{ session: PracticeSession; streaks: Record<string, StreakResult> }> {
  const id = randomUUID();

  // Create session - fast operation
  const session = await db
    .insert(practiceSessions)
    .values({
      id,
      userId,
      categoryId: input.categoryId,
      exerciseId: input.exerciseId,
      sessionDate: input.sessionDate,
      durationMinutes: input.durationMinutes,
      notes: input.notes,
      mood: input.mood,
      effort: input.effort,
      metricsJson: input.metricsJson,
      createdAt: new Date(),
    })
    .returning();

  // Calculate updated streaks
  const streaks = await getStreaks(userId);

  return {
    session: session[0],
    streaks,
  };
}

/**
 * Get sessions for a user with optional filters
 */
export async function getSessions(
  userId: string,
  filters: SessionQuery,
): Promise<{
  sessions: (PracticeSession & { categoryName: string; exerciseName?: string })[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const offset = (filters.page - 1) * filters.limit;

  const whereConditions = [eq(practiceSessions.userId, userId)];

  if (filters.categoryId) {
    whereConditions.push(eq(practiceSessions.categoryId, filters.categoryId));
  }
  if (filters.startDate) {
    whereConditions.push(gte(practiceSessions.sessionDate, filters.startDate));
  }
  if (filters.endDate) {
    whereConditions.push(lte(practiceSessions.sessionDate, filters.endDate));
  }

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(practiceSessions)
    .where(and(...whereConditions));

  const total = countResult[0]?.count || 0;

  const sessions = await db
    .select({
      id: practiceSessions.id,
      userId: practiceSessions.userId,
      categoryId: practiceSessions.categoryId,
      exerciseId: practiceSessions.exerciseId,
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      notes: practiceSessions.notes,
      mood: practiceSessions.mood,
      effort: practiceSessions.effort,
      metricsJson: practiceSessions.metricsJson,
      createdAt: practiceSessions.createdAt,
      categoryName: practiceCategories.name,
      exerciseName: practiceExercises.name,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .leftJoin(
      practiceExercises,
      eq(practiceSessions.exerciseId, practiceExercises.id),
    )
    .where(and(...whereConditions))
    .orderBy(desc(practiceSessions.sessionDate))
    .limit(filters.limit)
    .offset(offset);

  return {
    sessions: sessions as (PracticeSession & { categoryName: string; exerciseName?: string })[],
    total,
    page: filters.page,
    limit: filters.limit,
    hasMore: offset + filters.limit < total,
  };
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const result = await db
    .delete(practiceSessions)
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(practiceSessions.userId, userId),
      ),
    );

  if (result.count === 0) {
    throw new Error('Session not found');
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get overall and per-category streaks
 */
export async function getStreaks(userId: string): Promise<Record<string, StreakResult>> {
  const sessions = await db
    .select({
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      categoryName: practiceCategories.name,
      categoryId: practiceCategories.id,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .where(eq(practiceSessions.userId, userId))
    .orderBy(asc(practiceSessions.sessionDate));

  const result: Record<string, StreakResult> = {};

  // Overall streak (any category)
  const allDates = sessions.map((s) => s.sessionDate).sort();
  const overallStreak = calculateStreak(allDates);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  result.overall = { ...overallStreak, totalMinutes };

  // Per-category streaks
  const sessionsByCategory: Map<string, string[]> = new Map();
  sessions.forEach((s) => {
    if (s.categoryName) {
      if (!sessionsByCategory.has(s.categoryName)) {
        sessionsByCategory.set(s.categoryName, []);
      }
      sessionsByCategory.get(s.categoryName)!.push(s.sessionDate);
    }
  });

  sessionsByCategory.forEach((dates, categoryName) => {
    const categoryStreak = calculateStreak(dates);
    const categoryMinutes = sessions
      .filter((s) => s.categoryName === categoryName)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    result[categoryName] = { ...categoryStreak, totalMinutes: categoryMinutes };
  });

  return result;
}

/**
 * Get weekly summary (current or previous weeks)
 */
export async function getWeeklySummary(
  userId: string,
  weekOffset: number = 0,
): Promise<WeeklySummary> {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(today, weekOffset);
  const weekEnd = getWeekEnd(weekStart);

  const prevWeekStart = getWeekStart(today, weekOffset + 1);
  const prevWeekEnd = getWeekEnd(prevWeekStart);

  // Get current week sessions
  const weekSessions = await db
    .select({
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      mood: practiceSessions.mood,
      categoryName: practiceCategories.name,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .where(
      and(
        eq(practiceSessions.userId, userId),
        gte(practiceSessions.sessionDate, weekStart),
        lte(practiceSessions.sessionDate, weekEnd),
      ),
    );

  // Get previous week sessions
  const prevWeekSessions = await db
    .select({
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      mood: practiceSessions.mood,
      categoryName: practiceCategories.name,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .where(
      and(
        eq(practiceSessions.userId, userId),
        gte(practiceSessions.sessionDate, prevWeekStart),
        lte(practiceSessions.sessionDate, prevWeekEnd),
      ),
    );

  const sessionData: SessionData[] = weekSessions.map((s) => ({
    date: s.sessionDate,
    minutes: s.durationMinutes || 0,
    categoryName: s.categoryName || 'Unknown',
    mood: s.mood || undefined,
  }));

  const prevSessionData: SessionData[] | undefined =
    prevWeekSessions.length > 0
      ? prevWeekSessions.map((s) => ({
          date: s.sessionDate,
          minutes: s.durationMinutes || 0,
          categoryName: s.categoryName || 'Unknown',
          mood: s.mood || undefined,
        }))
      : undefined;

  return calculateWeeklySummary(sessionData, prevSessionData);
}

/**
 * Get statistics for all categories
 */
export async function getCategoryStats(userId: string): Promise<CategoryStats[]> {
  const categories = await db
    .select()
    .from(practiceCategories)
    .where(eq(practiceCategories.userId, userId));

  const sessions = await db
    .select({
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      categoryName: practiceCategories.name,
      categoryId: practiceCategories.id,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .where(eq(practiceSessions.userId, userId))
    .orderBy(asc(practiceSessions.sessionDate));

  const sessionData: SessionData[] = sessions.map((s) => ({
    date: s.sessionDate,
    minutes: s.durationMinutes || 0,
    categoryName: s.categoryName || 'Unknown',
  }));

  return categories.map((cat) =>
    calculateCategoryStats(sessionData, cat.id, cat.name),
  );
}

/**
 * Get calendar heatmap for a month
 */
export async function getCalendarHeatmap(
  userId: string,
  year: number,
  month: number,
): Promise<DayActivity[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const sessions = await db
    .select({
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      categoryName: practiceCategories.name,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .where(
      and(
        eq(practiceSessions.userId, userId),
        gte(practiceSessions.sessionDate, startDate),
        lte(practiceSessions.sessionDate, endDate),
      ),
    );

  const sessionData: SessionData[] = sessions.map((s) => ({
    date: s.sessionDate,
    minutes: s.durationMinutes || 0,
    categoryName: s.categoryName || 'Unknown',
  }));

  return getDayActivities(sessionData, startDate, endDate);
}

/**
 * Get combined dashboard statistics
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const categories = await db
    .select()
    .from(practiceCategories)
    .where(eq(practiceCategories.userId, userId));

  const sessions = await db
    .select({
      sessionDate: practiceSessions.sessionDate,
      durationMinutes: practiceSessions.durationMinutes,
      mood: practiceSessions.mood,
      categoryName: practiceCategories.name,
      categoryId: practiceCategories.id,
    })
    .from(practiceSessions)
    .leftJoin(
      practiceCategories,
      eq(practiceSessions.categoryId, practiceCategories.id),
    )
    .where(eq(practiceSessions.userId, userId))
    .orderBy(asc(practiceSessions.sessionDate));

  const sessionData: SessionData[] = sessions.map((s) => ({
    date: s.sessionDate,
    minutes: s.durationMinutes || 0,
    categoryName: s.categoryName || 'Unknown',
    mood: s.mood || undefined,
  }));

  // Calculate streaks and totals
  const allDates = sessions.map((s) => s.sessionDate).sort();
  const overallStreak = calculateStreak(allDates);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  // Calculate per-category stats
  const categoryStats = categories.map((cat) =>
    calculateCategoryStats(sessionData, cat.id, cat.name),
  );

  // Get weekly summary
  const weekSummary = await getWeeklySummary(userId, 0);

  // Get monthly trend
  const monthlyTrend = getMonthlyTrend(sessionData, 12);

  // Get top categories
  const topCategories = categoryStats
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 5)
    .map((stat) => ({
      ...stat,
      percentOfTotal: totalMinutes > 0 ? (stat.totalMinutes / totalMinutes) * 100 : 0,
    }));

  return {
    totalCategories: categories.length,
    totalSessions: sessions.length,
    totalMinutes,
    currentStreak: overallStreak.currentStreak,
    longestStreak: overallStreak.longestStreak,
    isActiveToday: overallStreak.isActiveToday,
    categoryStats,
    weekSummary,
    monthlyTrend,
    topCategories,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getWeekStart(dateStr: string, weekOffset: number = 0): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) - 7 * weekOffset);
  return date.toISOString().split('T')[0];
}

function getWeekEnd(weekStartStr: string): string {
  const date = new Date(weekStartStr);
  date.setDate(date.getDate() + 6);
  return date.toISOString().split('T')[0];
}
