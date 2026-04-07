import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

/**
 * Chat threads - stores conversation sessions
 * Each thread represents a distinct chat conversation for a user
 */
export const chatThreads = pgTable(
  'chat_threads',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    isArchived: boolean('is_archived').default(false),
    lastMessageAt: timestamp('last_message_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('chat_threads_user_id_idx').on(table.userId),
      userArchivedIdx: index('chat_threads_user_id_is_archived_idx').on(
        table.userId,
        table.isArchived,
      ),
      lastMessageAtIdx: index('chat_threads_last_message_at_idx').on(
        table.lastMessageAt,
      ),
    };
  },
);

/**
 * Chat messages - stores individual messages in a conversation
 * role: 'user' | 'assistant' | 'system' | 'tool'
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    threadId: varchar('thread_id', { length: 36 })
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system' | 'tool'
    content: text('content').notNull(),
    modelProvider: varchar('model_provider', { length: 50 }),
    modelName: varchar('model_name', { length: 100 }),
    tokenUsageJson: json('token_usage_json').$type<Record<string, unknown>>(),
    toolCallsJson: json('tool_calls_json').$type<Record<string, unknown>[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      threadIdIdx: index('chat_messages_thread_id_idx').on(table.threadId),
      roleIdx: index('chat_messages_role_idx').on(table.role),
    };
  },
);

/**
 * Tool executions - tracks execution of tools called during chat
 * status: 'success' | 'error' | 'pending'
 */
export const toolExecutions = pgTable(
  'tool_executions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    messageId: varchar('message_id', { length: 36 })
      .notNull()
      .references(() => chatMessages.id, { onDelete: 'cascade' }),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    input: json('input').$type<Record<string, unknown>>(),
    output: json('output').$type<Record<string, unknown>>(),
    status: varchar('status', { length: 20 }).notNull(), // 'success' | 'error' | 'pending'
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      messageIdIdx: index('tool_executions_message_id_idx').on(table.messageId),
      statusIdx: index('tool_executions_status_idx').on(table.status),
    };
  },
);

/**
 * Memory profiles - stores user memory and context for AI
 * Tracks user profile, current state, and long-term summaries
 */
export const memoryProfiles = pgTable(
  'memory_profiles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileJson: json('profile_json').$type<Record<string, unknown>>(),
    currentStateJson: json('current_state_json').$type<Record<string, unknown>>(),
    longTermSummaryJson: json('long_term_summary_json').$type<Record<string, unknown>>(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: uniqueIndex('memory_profiles_user_id_idx').on(table.userId),
    };
  },
);

/**
 * Drizzle ORM Relations
 */
export const chatThreadsRelations = relations(
  chatThreads,
  ({ one, many }) => ({
    user: one(users, {
      fields: [chatThreads.userId],
      references: [users.id],
    }),
    messages: many(chatMessages),
  }),
);

export const chatMessagesRelations = relations(
  chatMessages,
  ({ one, many }) => ({
    thread: one(chatThreads, {
      fields: [chatMessages.threadId],
      references: [chatThreads.id],
    }),
    toolExecutions: many(toolExecutions),
  }),
);

export const toolExecutionsRelations = relations(
  toolExecutions,
  ({ one }) => ({
    message: one(chatMessages, {
      fields: [toolExecutions.messageId],
      references: [chatMessages.id],
    }),
  }),
);

export const memoryProfilesRelations = relations(
  memoryProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [memoryProfiles.userId],
      references: [users.id],
    }),
  }),
);
