/**
 * Motor de cálculo de planes de lectura
 * 100% determinista, sin IA, sin efectos secundarios
 * Toda la lógica de negocio de planificación vive aquí
 */

export interface PlanConfig {
  totalUnits: number; // total pages/words/chapters
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  mode: 'pages_per_day' | 'words_per_day' | 'chapters_per_day';
  skipWeekends?: boolean;
  restDays?: number[]; // 0=Sunday, 6=Saturday
}

export interface PlanCalculation {
  dailyTarget: number;
  daysTotal: number;
  effectiveDays: number; // days minus rest days
  startDate: string;
  targetDate: string;
  isViable: boolean; // false if <1 unit per day
  warnings: string[];
}

export interface ProgressEntry {
  actualUnits: number;
  progressDate: string;
  cumulativeUnits: number;
}

export interface ProgressState {
  completedUnits: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyTargetOriginal: number;
  dailyTargetAdjusted: number; // recalculated based on remaining
  isOnTrack: boolean;
  isAhead: boolean;
  isBehind: boolean;
  behindByUnits: number;
  aheadByUnits: number;
  projectedCompletionDate: string;
  percentComplete: number;
  todayTarget: number; // what to read today
  todayRemaining: number; // what's left for today
}

export interface ReplanResult {
  newDailyTarget: number;
  newTargetDate: string;
  daysRemaining: number;
  isViable: boolean;
  warnings: string[];
}

export interface TodayReading {
  bookTitle: string;
  planId: string;
  bookId: string;
  targetUnits: number;
  completedUnits: number;
  remainingUnits: number;
  mode: string;
  unitLabel: string; // "páginas", "palabras", "capítulos"
  isComplete: boolean;
  percentToday: number;
}

/**
 * Parse a YYYY-MM-DD date string to Date object
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the day of week (0=Sunday, 6=Saturday) for a date string
 */
export function getDayOfWeek(dateStr: string): number {
  const date = parseDate(dateStr);
  return date.getDay();
}

/**
 * Check if a date is a reading day (not a rest day / weekend)
 */
export function isReadingDay(
  dateStr: string,
  config?: { skipWeekends?: boolean; restDays?: number[] },
): boolean {
  const dayOfWeek = getDayOfWeek(dateStr);

  if (config?.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }

  if (config?.restDays && config.restDays.includes(dayOfWeek)) {
    return false;
  }

  return true;
}

/**
 * Calculate days difference between two dates
 */
export function diffDays(date1Str: string, date2Str: string): number {
  const date1 = parseDate(date1Str);
  const date2 = parseDate(date2Str);
  const diff = date2.getTime() - date1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get array of YYYY-MM-DD strings between two dates (inclusive)
 */
export function getDatesBetween(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = parseDate(startStr);
  const end = parseDate(endStr);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get label for unit type in Spanish
 */
export function getUnitLabel(
  mode: 'pages_per_day' | 'words_per_day' | 'chapters_per_day',
): string {
  const labels: Record<string, string> = {
    pages_per_day: 'páginas',
    words_per_day: 'palabras',
    chapters_per_day: 'capítulos',
  };
  return labels[mode] || 'unidades';
}

/**
 * Calculate reading plan based on config
 * Core business logic: determines if a plan is viable and what the daily target is
 */
export function calculatePlan(config: PlanConfig): PlanCalculation {
  const warnings: string[] = [];

  // Calculate calendar days between start and target
  const daysTotal = diffDays(config.startDate, config.targetDate);

  if (daysTotal < 3) {
    warnings.push('El plan es muy corto (menos de 3 días)');
  }

  // Count reading days (exclude rest days/weekends)
  let effectiveDays = 0;
  const allDates = getDatesBetween(config.startDate, config.targetDate);

  for (const dateStr of allDates) {
    if (isReadingDay(dateStr, config)) {
      effectiveDays++;
    }
  }

  let isViable = true;
  let dailyTarget = 0;

  if (effectiveDays <= 0) {
    isViable = false;
    warnings.push(
      'No hay días de lectura disponibles con la configuración especificada',
    );
  } else {
    // Calculate daily target: ceil(totalUnits / effectiveDays)
    dailyTarget = Math.ceil(config.totalUnits / effectiveDays);

    // Check reasonable thresholds
    const thresholds = {
      pages_per_day: 50,
      words_per_day: 15000,
      chapters_per_day: 5,
    };

    const threshold = thresholds[config.mode];
    if (dailyTarget > threshold) {
      warnings.push(
        `Meta diaria alta: ${dailyTarget} ${getUnitLabel(config.mode)} por día`,
      );
    }

    if (dailyTarget < 1) {
      isViable = false;
      warnings.push('Meta diaria debe ser al menos 1 unidad por día');
    }
  }

  return {
    dailyTarget,
    daysTotal,
    effectiveDays,
    startDate: config.startDate,
    targetDate: config.targetDate,
    isViable,
    warnings,
  };
}

/**
 * Calculate current progress state given a plan and progress entries
 */
export function calculateProgress(
  plan: {
    id: string;
    startDate: string;
    targetDate: string;
    dailyTarget: number;
    totalUnits: number;
    completedUnits: number;
    calculationMode: string;
    configJson?: { skipWeekends?: boolean; restDays?: number[] };
  },
  progressEntries: ProgressEntry[],
): ProgressState {
  const today = formatDate(new Date());

  // Sum completed units from progress entries
  const completedUnits = progressEntries.reduce(
    (sum, entry) => sum + entry.actualUnits,
    0,
  );

  // Calculate days elapsed
  const daysElapsed = Math.max(0, diffDays(plan.startDate, today));

  // Calculate days remaining
  const daysRemaining = Math.max(0, diffDays(today, plan.targetDate));

  // Calculate remaining units
  const remainingUnits = Math.max(0, plan.totalUnits - completedUnits);

  // Adjusted daily target based on remaining time
  let dailyTargetAdjusted = 0;
  if (daysRemaining > 0) {
    // Count remaining reading days
    let effectiveRemainingDays = 0;
    const remainingDates = getDatesBetween(today, plan.targetDate);

    for (const dateStr of remainingDates) {
      if (isReadingDay(dateStr, plan.configJson)) {
        effectiveRemainingDays++;
      }
    }

    if (effectiveRemainingDays > 0) {
      dailyTargetAdjusted = Math.ceil(remainingUnits / effectiveRemainingDays);
    } else {
      dailyTargetAdjusted = Math.ceil(remainingUnits / 1);
    }
  } else {
    dailyTargetAdjusted = plan.dailyTarget;
  }

  // Determine if on track, ahead, or behind
  const expectedUnits = plan.dailyTarget * daysElapsed;
  const isOnTrack = Math.abs(completedUnits - expectedUnits) <= plan.dailyTarget;
  const isAhead = completedUnits > expectedUnits;
  const isBehind = completedUnits < expectedUnits;

  const behindByUnits = isBehind ? Math.max(0, expectedUnits - completedUnits) : 0;
  const aheadByUnits = isAhead ? completedUnits - expectedUnits : 0;

  // Project completion date
  let projectedCompletionDate = plan.targetDate;
  if (completedUnits > 0 && remainingUnits > 0) {
    const avgPacePerDay = completedUnits / Math.max(1, daysElapsed);
    const daysToComplete = Math.ceil(remainingUnits / avgPacePerDay);
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + daysToComplete);
    projectedCompletionDate = formatDate(projectedDate);
  } else if (completedUnits >= plan.totalUnits) {
    projectedCompletionDate = today;
  }

  // Calculate percent complete
  const percentComplete = Math.round(
    (completedUnits / Math.max(1, plan.totalUnits)) * 100,
  );

  // Calculate today's target and remaining
  const todayEntry = progressEntries.find((e) => e.progressDate === today);
  const completedToday = todayEntry?.actualUnits || 0;
  const todayTarget = dailyTargetAdjusted;
  const todayRemaining = Math.max(0, todayTarget - completedToday);

  return {
    completedUnits,
    daysElapsed,
    daysRemaining,
    dailyTargetOriginal: plan.dailyTarget,
    dailyTargetAdjusted,
    isOnTrack,
    isAhead,
    isBehind,
    behindByUnits,
    aheadByUnits,
    projectedCompletionDate,
    percentComplete,
    todayTarget,
    todayRemaining,
  };
}

/**
 * Replan from today with optional new target date
 */
export function replanFromToday(
  plan: {
    startDate: string;
    targetDate: string;
    totalUnits: number;
    completedUnits: number;
    dailyTarget: number;
    calculationMode: string;
    configJson?: { skipWeekends?: boolean; restDays?: number[] };
  },
  newTargetDate?: string,
): ReplanResult {
  const today = formatDate(new Date());
  const targetDate = newTargetDate || plan.targetDate;
  const warnings: string[] = [];

  const daysRemaining = Math.max(0, diffDays(today, targetDate));
  const remainingUnits = Math.max(0, plan.totalUnits - plan.completedUnits);

  // Count effective remaining reading days
  let effectiveRemainingDays = 0;
  if (daysRemaining > 0) {
    const remainingDates = getDatesBetween(today, targetDate);
    for (const dateStr of remainingDates) {
      if (isReadingDay(dateStr, plan.configJson)) {
        effectiveRemainingDays++;
      }
    }
  }

  let newDailyTarget = 0;
  let isViable = true;

  if (effectiveRemainingDays <= 0) {
    isViable = false;
    warnings.push(
      'No hay días de lectura disponibles con la fecha objetivo seleccionada',
    );
    newDailyTarget = Math.ceil(remainingUnits / Math.max(1, daysRemaining));
  } else {
    newDailyTarget = Math.ceil(remainingUnits / effectiveRemainingDays);

    if (newDailyTarget < 1) {
      isViable = false;
      warnings.push('Meta diaria debe ser al menos 1 unidad por día');
    }

    const thresholds = {
      pages_per_day: 50,
      words_per_day: 15000,
      chapters_per_day: 5,
    };

    const threshold = thresholds[plan.calculationMode as keyof typeof thresholds] || 50;
    if (newDailyTarget > threshold) {
      warnings.push(
        `Nueva meta diaria es alta: ${newDailyTarget} ${getUnitLabel(plan.calculationMode as 'pages_per_day' | 'words_per_day' | 'chapters_per_day')} por día`,
      );
    }
  }

  return {
    newDailyTarget,
    newTargetDate: targetDate,
    daysRemaining,
    isViable,
    warnings,
  };
}

/**
 * Calculate what remains to read today
 */
export function calculateTodayTarget(
  plan: {
    dailyTarget: number;
    totalUnits: number;
    completedUnits: number;
  },
  completedUnitsToday: number,
  totalCompletedUnits: number,
): number {
  // If ahead of schedule, reduce today's target proportionally
  const paceAdjustment = totalCompletedUnits > plan.completedUnits ? 0.75 : 1.0;
  const adjustedTarget = Math.ceil(plan.dailyTarget * paceAdjustment);

  return Math.max(0, adjustedTarget - completedUnitsToday);
}
