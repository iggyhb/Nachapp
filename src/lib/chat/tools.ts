/**
 * Chat Tools Registry
 * Defines available tools that can be executed during chat conversations
 * Each tool has a name, description, input schema, and execute function
 */

import { libraryService } from '@/lib/services/library.service';
import { readingPlanService } from '@/lib/services/reading-plan.service';
import { getDashboardStats as getPracticeStats, logSession as logPracticeSessionService } from '@/lib/services/practice.service';
import { getDailyLiturgy } from '@/lib/services/liturgy.service';
import type { ToolDefinition, DashboardData, DaySuggestion } from './types';

/**
 * Get today's dashboard data
 * Aggregates reading progress, practice streaks, and liturgy status
 */
async function getTodayDashboard(userId: string): Promise<DashboardData> {
  try {
    // Get reading progress
    const books = await libraryService.getBooks(userId, {
      status: 'reading',
      limit: 100,
    });

    const allBooks = await libraryService.getBooks(userId, { limit: 100 });

    // Get practice stats
    const practiceStats = await getPracticeStats(userId);

    // Get today's liturgy
    const today = new Date().toISOString().split('T')[0];
    const liturgy = await getDailyLiturgy(userId, today);

    return {
      readingProgress: {
        totalBooks: allBooks.total || 0,
        currentlyReading: books.total || 0,
        completionRate: (allBooks.total ?? 0) > 0
          ? ((allBooks.books?.filter(b => b.readingStatus === 'completed').length ?? 0) / (allBooks.total ?? 1)) * 100
          : 0,
      },
      practiceStreaks: Object.fromEntries(
        (practiceStats?.categoryStats ?? []).map(cat => [
          cat.categoryId,
          {
            categoryName: cat.categoryName,
            currentStreak: cat.currentStreak ?? 0,
            longestStreak: cat.longestStreak ?? 0,
            sessionsThisWeek: cat.totalSessions ?? 0,
          },
        ]),
      ),
      liturgyStatus: {
        date: today,
        title: liturgy?.feastName,
        hasRead: false, // Would need to track in separate table
      },
    };
  } catch (error) {
    console.error('Error getting today dashboard:', error);
    return {};
  }
}

/**
 * List active books currently being read
 */
async function listActiveBooks(userId: string): Promise<unknown> {
  try {
    const result = await libraryService.getBooks(userId, {
      status: 'reading',
      limit: 20,
    });

    return {
      activeBooks: (result.books ?? []).map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        currentProgressPercent: book.currentProgressPercent,
        totalPages: book.totalPages,
        coverUrl: book.coverUrl,
      })),
      total: result.total,
    };
  } catch (error) {
    console.error('Error listing active books:', error);
    return { activeBooks: [], total: 0, error: String(error) };
  }
}

/**
 * Get current reading plan with today's target
 */
async function getReadingPlan(userId: string): Promise<unknown> {
  try {
    const result = await readingPlanService.getPlans(userId, {
      limit: 10,
      page: 1,
      offset: 0,
    });

    return {
      plans: (result.plans ?? []).map((plan: any) => ({
        id: plan.id,
        bookId: plan.bookId,
        dailyTarget: plan.dailyTarget,
        totalUnits: plan.totalUnits,
        completedUnits: plan.completedUnits,
        startDate: plan.startDate,
        targetDate: plan.targetDate,
        status: plan.planStatus,
      })),
      todayTarget: result.plans && result.plans.length > 0 ? result.plans[0].dailyTarget : undefined,
    };
  } catch (error) {
    console.error('Error getting reading plan:', error);
    return { plans: [], error: String(error) };
  }
}

/**
 * Log a practice session
 */
async function logPracticeSessionTool(
  userId: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  try {
    const { categoryId, durationMinutes, notes } = params;

    if (!categoryId || typeof categoryId !== 'string') {
      return { error: 'categoryId is required' };
    }

    if (!durationMinutes || typeof durationMinutes !== 'number') {
      return { error: 'durationMinutes is required and must be a number' };
    }

    const today = new Date().toISOString().split('T')[0];

    const result = await logPracticeSessionService(userId, {
      categoryId,
      sessionDate: today,
      durationMinutes,
      notes: notes ? String(notes) : undefined,
    });

    return {
      success: true,
      session: {
        id: result.session.id,
        categoryId: result.session.categoryId,
        durationMinutes: result.session.durationMinutes,
        sessionDate: result.session.sessionDate,
        createdAt: result.session.createdAt,
      },
    };
  } catch (error) {
    console.error('Error logging practice session:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get today's liturgy entry
 */
async function getDailyLiturgyContent(userId: string): Promise<unknown> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const liturgy = await getDailyLiturgy(userId, today);

    return {
      date: today,
      title: liturgy?.feastName,
      summary: liturgy?.summaryText,
      reflection: liturgy?.reflectionText,
      practicalPoint: liturgy?.practicalPoint,
    };
  } catch (error) {
    console.error('Error getting daily liturgy:', error);
    return { error: String(error) };
  }
}

/**
 * Suggest a day plan based on all module data
 */
async function suggestDayPlan(userId: string): Promise<DaySuggestion> {
  try {
    const dashboard = await getTodayDashboard(userId);
    const activeBooks = await listActiveBooks(userId);
    const liturgy = await getDailyLiturgyContent(userId);

    const suggestion: DaySuggestion = {
      summary: 'Your daily plan based on your reading, practice, and liturgy goals.',
    };

    // Add reading suggestion
    if (dashboard.readingProgress?.currentlyReading && (activeBooks as any).activeBooks?.length > 0) {
      const firstBook = (activeBooks as any).activeBooks[0];
      suggestion.reading = {
        activity: `Continue reading "${firstBook.title}"`,
        targetPages: dashboard.readingProgress.todayTargetPages ?? 20,
        estimatedMinutes: (dashboard.readingProgress.todayTargetPages ?? 20) * 2,
      };
    }

    // Add practice suggestion
    if (dashboard.practiceStreaks && Object.keys(dashboard.practiceStreaks).length > 0) {
      const categories = Object.values(dashboard.practiceStreaks);
      const lowestStreak = categories.reduce((min, cat) =>
        cat.currentStreak < min.currentStreak ? cat : min,
      );

      suggestion.practice = {
        activity: `Practice ${lowestStreak.categoryName}`,
        suggestedDuration: 30,
        reason: `Maintain your ${lowestStreak.currentStreak}-day streak`,
      };
    }

    // Add liturgy suggestion
    if ((liturgy as any).title) {
      suggestion.liturgy = {
        activity: `Read today's liturgy: ${(liturgy as any).title}`,
        timeOfDay: 'morning',
      };
    }

    return suggestion;
  } catch (error) {
    console.error('Error suggesting day plan:', error);
    return {
      summary: 'Could not generate day plan. Please check back later.',
    };
  }
}

/**
 * Tool Registry
 * Maps tool names to their definitions
 */
export const toolRegistry = new Map<string, ToolDefinition>([
  [
    'get_today_dashboard',
    {
      name: 'get_today_dashboard',
      description: 'Get today\'s dashboard data including reading progress, practice streaks, and liturgy status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async (userId: string) => getTodayDashboard(userId),
    },
  ],
  [
    'list_active_books',
    {
      name: 'list_active_books',
      description: 'Get a list of books currently being read',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async (userId: string) => listActiveBooks(userId),
    },
  ],
  [
    'get_reading_plan',
    {
      name: 'get_reading_plan',
      description: 'Get the current reading plan with today\'s target pages',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async (userId: string) => getReadingPlan(userId),
    },
  ],
  [
    'log_practice_session',
    {
      name: 'log_practice_session',
      description: 'Log a practice session for a specific category',
      inputSchema: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'string',
            description: 'UUID of the practice category',
          },
          durationMinutes: {
            type: 'number',
            description: 'Duration of the practice session in minutes',
          },
          notes: {
            type: 'string',
            description: 'Optional notes about the practice session',
          },
        },
        required: ['categoryId', 'durationMinutes'],
      },
      execute: async (userId: string, params: Record<string, unknown>) =>
        logPracticeSessionTool(userId, params),
    },
  ],
  [
    'get_daily_liturgy',
    {
      name: 'get_daily_liturgy',
      description: 'Get today\'s liturgy entry with readings and content',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async (userId: string) => getDailyLiturgyContent(userId),
    },
  ],
  [
    'suggest_day_plan',
    {
      name: 'suggest_day_plan',
      description: 'Generate a suggested plan for today based on reading, practice, and liturgy data',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async (userId: string) => suggestDayPlan(userId),
    },
  ],
]);

/**
 * Get tool definition by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

/**
 * List all available tools
 */
export function listTools(): Array<{
  name: string;
  description: string;
  inputSchema: unknown;
}> {
  return Array.from(toolRegistry.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

/**
 * Execute a tool
 */
export async function executeTool(
  toolName: string,
  userId: string,
  params: Record<string, unknown> = {},
): Promise<{
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}> {
  const startTime = Date.now();
  const tool = getTool(toolName);

  if (!tool) {
    return {
      success: false,
      error: `Tool "${toolName}" not found`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const result = await tool.execute(userId, params);
    return {
      success: true,
      result,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };
  }
}
