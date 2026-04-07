/**
 * Reading Plan Service
 * Business logic connecting reading engine + database
 * All calculation logic is in reading-engine.ts
 * This service only handles DB operations and calls engine functions
 */

import { randomUUID } from 'crypto';
import { db } from '@/lib/db/client';
import {
  readingPlans,
  readingProgress,
  books,
} from '@/lib/db/schema';
import {
  eq,
  and,
  desc,
  sql,
} from 'drizzle-orm';
import {
  calculatePlan,
  calculateProgress,
  replanFromToday,
  getUnitLabel,
  formatDate,
  diffDays,
  isReadingDay,
} from './reading-engine';
import type {
  CreatePlan,
  RecordProgress,
  PlanQuery,
  Replan,
} from '@/lib/validation/reading-plan';
import type {
  PlanCalculation,
  ProgressEntry,
  ProgressState,
  TodayReading,
  ReplanResult,
} from './reading-engine';

/** Convert DB progress rows (nullable fields) to engine ProgressEntry */
function toProgressEntries(rows: { actualUnits: number | null; progressDate: string; cumulativeUnits: number | null }[]): ProgressEntry[] {
  return rows.map(r => ({
    actualUnits: r.actualUnits ?? 0,
    progressDate: r.progressDate,
    cumulativeUnits: r.cumulativeUnits ?? 0,
  }));
}

export interface CreatePlanWithCalculation {
  plan: typeof readingPlans.$inferSelect;
  calculation: PlanCalculation;
}

export interface PlanWithProgress {
  plan: typeof readingPlans.$inferSelect;
  progress: ProgressState;
  book: typeof books.$inferSelect;
}

export interface PlanListResult {
  plans: (typeof readingPlans.$inferSelect & {
    book: typeof books.$inferSelect;
  })[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create a new reading plan for a book
 */
export async function createPlan(
  userId: string,
  input: CreatePlan,
): Promise<CreatePlanWithCalculation> {
  // Fetch book to get total units
  const book = await db
    .select()
    .from(books)
    .where(
      and(
        eq(books.id, input.bookId),
        eq(books.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!book) {
    throw new Error('Libro no encontrado');
  }

  // Determine total units based on mode
  let totalUnits = 0;
  if (input.mode === 'pages_per_day') {
    totalUnits = book.totalPages || 0;
  } else if (input.mode === 'words_per_day') {
    totalUnits = book.totalWords || 0;
  } else if (input.mode === 'chapters_per_day') {
    totalUnits = book.totalChapters || 0;
  }

  if (totalUnits === 0) {
    throw new Error(
      `El libro no tiene datos de ${getUnitLabel(input.mode)} disponibles`,
    );
  }

  // Check no other active plan exists for this book
  const existingActivePlan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.bookId, input.bookId),
        eq(readingPlans.planStatus, 'active'),
      ),
    )
    .then((res) => res[0]);

  if (existingActivePlan) {
    throw new Error(
      'Ya existe un plan activo para este libro. Pausa o abandona el plan anterior.',
    );
  }

  // Calculate plan
  const calculation = calculatePlan({
    totalUnits,
    startDate: input.startDate,
    targetDate: input.targetDate,
    mode: input.mode,
    skipWeekends: input.skipWeekends,
    restDays: input.restDays,
  });

  if (!calculation.isViable) {
    throw new Error(
      `Plan no viable: ${calculation.warnings.join(', ')}`,
    );
  }

  // Create plan in DB
  const planId = randomUUID();
  const now = new Date();

  const plan = await db
    .insert(readingPlans)
    .values({
      id: planId,
      bookId: input.bookId,
      userId,
      startDate: input.startDate,
      targetDate: input.targetDate,
      calculationMode: input.mode,
      dailyTarget: calculation.dailyTarget,
      totalUnits,
      completedUnits: 0,
      planStatus: 'active',
      daysTotal: calculation.daysTotal,
      daysElapsed: 0,
      configJson: {
        skipWeekends: input.skipWeekends || false,
        restDays: input.restDays || [],
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    plan: plan[0],
    calculation,
  };
}

/**
 * Get reading plans with pagination and filters
 */
export async function getPlans(
  userId: string,
  filters?: PlanQuery,
): Promise<PlanListResult> {
  const page = filters?.page || 1;
  const limit = Math.min(filters?.limit || 20, 100);
  const offset = (page - 1) * limit;

  // Build query conditions
  const conditions = [
    eq(readingPlans.userId, userId),
  ];

  if (filters?.status) {
    conditions.push(eq(readingPlans.planStatus, filters.status));
  }

  if (filters?.bookId) {
    conditions.push(eq(readingPlans.bookId, filters.bookId));
  }

  // Fetch plans with book info
  const plansList = await db
    .select()
    .from(readingPlans)
    .leftJoin(books, eq(readingPlans.bookId, books.id))
    .where(and(...conditions))
    .orderBy(desc(readingPlans.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(readingPlans)
    .where(and(...conditions))
    .then((res) => res[0]);

  const total = countResult?.count || 0;

  // Format result
  const plans = plansList
    .filter((row) => row.books !== null)
    .map((row) => ({
      ...row.reading_plans,
      book: row.books!,
    }));

  return {
    plans,
    total,
    page,
    limit,
  };
}

/**
 * Get a single plan by ID with progress entries
 */
export async function getPlanById(
  planId: string,
  userId: string,
): Promise<PlanWithProgress> {
  // Fetch plan
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  // Fetch book
  const book = await db
    .select()
    .from(books)
    .where(eq(books.id, plan.bookId))
    .then((res) => res[0]);

  if (!book) {
    throw new Error('Libro no encontrado');
  }

  // Fetch progress entries
  const progressEntries = await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.planId, planId))
    .orderBy(readingProgress.progressDate);

  // Calculate progress
  const progress = calculateProgress(
    {
      id: plan.id,
      startDate: plan.startDate,
      targetDate: plan.targetDate,
      dailyTarget: plan.dailyTarget ?? 0,
      totalUnits: plan.totalUnits ?? 0,
      completedUnits: plan.completedUnits ?? 0,
      calculationMode: plan.calculationMode,
      configJson: plan.configJson ?? undefined,
    },
    toProgressEntries(progressEntries),
  );

  return {
    plan,
    progress,
    book,
  };
}

/**
 * Record reading progress for a day
 */
export async function recordProgress(
  planId: string,
  userId: string,
  input: RecordProgress,
): Promise<{
  progress: typeof readingProgress.$inferSelect;
  progressState: ProgressState;
}> {
  // Fetch and validate plan
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  if (plan.planStatus !== 'active') {
    throw new Error('El plan no está activo');
  }

  // Check no duplicate entry for same date
  const existingEntry = await db
    .select()
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.planId, planId),
        eq(readingProgress.progressDate, input.date),
      ),
    )
    .then((res) => res[0]);

  if (existingEntry) {
    throw new Error(
      'Ya existe una entrada de progreso para esta fecha. Actualiza la entrada existente.',
    );
  }

  // Fetch all progress entries
  const allProgressEntries = await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.planId, planId));

  // Calculate what cumulative should be
  const previousCumulative = allProgressEntries.reduce(
    (max, entry) => Math.max(max, entry.cumulativeUnits || 0),
    0,
  );
  const newCumulative = Math.min(
    plan.totalUnits,
    previousCumulative + input.actualUnits,
  );

  // Insert progress entry
  const progressId = randomUUID();
  const progressEntry = await db
    .insert(readingProgress)
    .values({
      id: progressId,
      planId,
      userId,
      bookId: plan.bookId,
      progressDate: input.date,
      targetUnits: plan.dailyTarget,
      actualUnits: input.actualUnits,
      cumulativeUnits: newCumulative,
      notes: input.notes || null,
      createdAt: new Date(),
    })
    .returning();

  // Update plan's completed units and days elapsed
  const daysElapsed = Math.max(
    0,
    diffDays(plan.startDate, input.date),
  );

  await db
    .update(readingPlans)
    .set({
      completedUnits: newCumulative,
      daysElapsed,
      updatedAt: new Date(),
    })
    .where(eq(readingPlans.id, planId));

  // Check if plan is now complete
  if (newCumulative >= plan.totalUnits) {
    await db
      .update(readingPlans)
      .set({
        planStatus: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(readingPlans.id, planId));
  }

  // Fetch updated plan and calculate progress
  const updatedPlan = await db
    .select()
    .from(readingPlans)
    .where(eq(readingPlans.id, planId))
    .then((res) => res[0])
    .catch(() => plan);

  const allProgressEntriesUpdated = await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.planId, planId));

  const progressState = calculateProgress(
    {
      id: updatedPlan.id,
      startDate: updatedPlan.startDate,
      targetDate: updatedPlan.targetDate,
      dailyTarget: updatedPlan.dailyTarget ?? 0,
      totalUnits: updatedPlan.totalUnits ?? 0,
      completedUnits: updatedPlan.completedUnits ?? 0,
      calculationMode: updatedPlan.calculationMode,
      configJson: updatedPlan.configJson ?? undefined,
    },
    toProgressEntries(allProgressEntriesUpdated),
  );

  return {
    progress: progressEntry[0],
    progressState,
  };
}

/**
 * Replan from today with optional new target date
 */
export async function replan(
  planId: string,
  userId: string,
  input?: Replan,
): Promise<{
  plan: typeof readingPlans.$inferSelect;
  replanResult: ReplanResult;
}> {
  // Fetch plan
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  // Call engine
  const replanResult = replanFromToday(
    {
      startDate: plan.startDate,
      targetDate: plan.targetDate,
      totalUnits: plan.totalUnits ?? 0,
      completedUnits: plan.completedUnits ?? 0,
      dailyTarget: plan.dailyTarget ?? 0,
      calculationMode: plan.calculationMode,
      configJson: plan.configJson ?? undefined,
    },
    input?.newTargetDate,
  );

  // Update plan in DB
  await db
    .update(readingPlans)
    .set({
      dailyTarget: replanResult.newDailyTarget,
      targetDate: replanResult.newTargetDate,
      updatedAt: new Date(),
    })
    .where(eq(readingPlans.id, planId));

  const updatedPlan = await db
    .select()
    .from(readingPlans)
    .where(eq(readingPlans.id, planId))
    .then((res) => res[0]);

  return {
    plan: updatedPlan,
    replanResult,
  };
}

/**
 * Get today's reading targets for all active plans
 */
export async function getTodayReadings(userId: string): Promise<TodayReading[]> {
  // Fetch all active plans
  const activePlans = await db
    .select()
    .from(readingPlans)
    .leftJoin(books, eq(readingPlans.bookId, books.id))
    .where(
      and(
        eq(readingPlans.userId, userId),
        eq(readingPlans.planStatus, 'active'),
      ),
    );

  const today = formatDate(new Date());
  const todayReadings: TodayReading[] = [];

  for (const row of activePlans) {
    if (!row.books) continue;

    const plan = row.reading_plans;
    const book = row.books;

    // Fetch progress entries for this plan
    const progressEntries = await db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.planId, plan.id));

    // Calculate progress
    const progress = calculateProgress(
      {
        id: plan.id,
        startDate: plan.startDate,
        targetDate: plan.targetDate,
        dailyTarget: plan.dailyTarget ?? 0,
        totalUnits: plan.totalUnits ?? 0,
        completedUnits: plan.completedUnits ?? 0,
        calculationMode: plan.calculationMode,
        configJson: plan.configJson ?? undefined,
      },
      toProgressEntries(progressEntries),
    );

    // Get today's progress
    const todayEntry = progressEntries.find((e) => e.progressDate === today);
    const completedToday = todayEntry?.actualUnits || 0;
    const remainingToday = Math.max(0, progress.todayTarget - completedToday);

    // Check if today is a reading day
    const planConfig = plan.configJson ? {
      mode: plan.calculationMode as 'pages_per_day' | 'words_per_day' | 'chapters_per_day',
      skipWeekends: plan.configJson.skipWeekends,
      restDays: plan.configJson.restDays,
    } : undefined;
    if (!isReadingDay(today, planConfig)) {
      continue; // Skip non-reading days
    }

    const percentToday = progress.todayTarget > 0
      ? Math.round((completedToday / progress.todayTarget) * 100)
      : 0;

    todayReadings.push({
      bookTitle: book.title,
      planId: plan.id,
      bookId: book.id,
      targetUnits: progress.todayTarget,
      completedUnits: completedToday,
      remainingUnits: remainingToday,
      mode: plan.calculationMode,
      unitLabel: getUnitLabel(
        plan.calculationMode as
          | 'pages_per_day'
          | 'words_per_day'
          | 'chapters_per_day',
      ),
      isComplete: completedToday >= progress.todayTarget,
      percentToday,
    });
  }

  // Sort by priority: incomplete first, then by remaining units (descending)
  return todayReadings.sort((a, b) => {
    if (a.isComplete !== b.isComplete) {
      return a.isComplete ? 1 : -1;
    }
    return b.remainingUnits - a.remainingUnits;
  });
}

/**
 * Pause a reading plan
 */
export async function pausePlan(
  planId: string,
  userId: string,
): Promise<typeof readingPlans.$inferSelect> {
  // Verify ownership
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  const updated = await db
    .update(readingPlans)
    .set({
      planStatus: 'paused',
      updatedAt: new Date(),
    })
    .where(eq(readingPlans.id, planId))
    .returning();

  return updated[0];
}

/**
 * Resume a paused reading plan
 */
export async function resumePlan(
  planId: string,
  userId: string,
): Promise<typeof readingPlans.$inferSelect> {
  // Verify ownership
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  const updated = await db
    .update(readingPlans)
    .set({
      planStatus: 'active',
      updatedAt: new Date(),
    })
    .where(eq(readingPlans.id, planId))
    .returning();

  return updated[0];
}

/**
 * Abandon a reading plan
 */
export async function abandonPlan(
  planId: string,
  userId: string,
): Promise<typeof readingPlans.$inferSelect> {
  // Verify ownership
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  const updated = await db
    .update(readingPlans)
    .set({
      planStatus: 'abandoned',
      updatedAt: new Date(),
    })
    .where(eq(readingPlans.id, planId))
    .returning();

  return updated[0];
}

/**
 * Delete a reading plan and associated progress entries
 */
export async function deletePlan(
  planId: string,
  userId: string,
): Promise<void> {
  // Verify ownership
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  // Delete progress entries first (cascade would do this, but let's be explicit)
  await db
    .delete(readingProgress)
    .where(eq(readingProgress.planId, planId));

  // Delete plan
  await db
    .delete(readingPlans)
    .where(eq(readingPlans.id, planId));
}

/**
 * Get progress entries for a specific plan
 */
export async function getProgressEntries(
  planId: string,
  userId: string,
): Promise<typeof readingProgress.$inferSelect[]> {
  // Verify ownership
  const plan = await db
    .select()
    .from(readingPlans)
    .where(
      and(
        eq(readingPlans.id, planId),
        eq(readingPlans.userId, userId),
      ),
    )
    .then((res) => res[0]);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  return await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.planId, planId))
    .orderBy(readingProgress.progressDate);
}

/**
 * Export as singleton object for consistency with other services
 */
export const readingPlanService = {
  createPlan,
  getPlans,
  getPlanById,
  recordProgress,
  replan,
  getTodayReadings,
  pausePlan,
  resumePlan,
  abandonPlan,
  deletePlan,
  getProgressEntries,
};
