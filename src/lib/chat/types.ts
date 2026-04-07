/**
 * Chat message role
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Tool execution status
 */
export type ToolExecutionStatus = 'success' | 'error' | 'pending';

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUSD?: number;
}

/**
 * Tool call information
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Chat thread
 */
export interface ChatThread {
  id: string;
  userId: string;
  title?: string | null;
  isArchived: boolean;
  lastMessageAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  modelProvider?: string | null;
  modelName?: string | null;
  tokenUsage?: TokenUsage | null;
  toolCalls?: ToolCall[] | null;
  createdAt: Date;
}

/**
 * Tool execution
 */
export interface ToolExecution {
  id: string;
  messageId: string;
  toolName: string;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  status: ToolExecutionStatus;
  durationMs?: number | null;
  createdAt: Date;
}

/**
 * Memory profile
 */
export interface MemoryProfile {
  id: string;
  userId: string;
  profile?: Record<string, unknown> | null;
  currentState?: Record<string, unknown> | null;
  longTermSummary?: Record<string, unknown> | null;
  updatedAt: Date;
}

/**
 * Tool definition for chat
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (userId: string, params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Dashboard data aggregated for chat
 */
export interface DashboardData {
  readingProgress?: {
    totalBooks: number;
    currentlyReading: number;
    completionRate: number;
    todayTargetPages?: number;
  };
  practiceStreaks?: {
    [categoryId: string]: {
      categoryName: string;
      currentStreak: number;
      longestStreak: number;
      sessionsThisWeek: number;
    };
  };
  liturgyStatus?: {
    date: string;
    title?: string;
    hasRead: boolean;
  };
}

/**
 * Day plan suggestion
 */
export interface DaySuggestion {
  reading?: {
    activity: string;
    targetPages: number;
    estimatedMinutes: number;
  };
  practice?: {
    activity: string;
    suggestedDuration: number;
    reason: string;
  };
  liturgy?: {
    activity: string;
    timeOfDay: string;
  };
  summary: string;
}
