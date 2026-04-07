import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  index,
  json,
  text,
  integer,
} from 'drizzle-orm/pg-core';

/**
 * Tabla de módulos - controla qué módulos están habilitados
 */
export const modules = pgTable(
  'modules',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    key: varchar('key', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isEnabled: boolean('is_enabled').default(true),
    configJson: json('config_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      keyIdx: index('modules_key_idx').on(table.key),
    };
  },
);

/**
 * Tabla de trabajos en segundo plano
 */
export const jobRuns = pgTable(
  'job_runs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    jobType: varchar('job_type', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }),
    entityId: varchar('entity_id', { length: 36 }),
    status: varchar('status', { length: 20 }).notNull(), // pending, running, completed, failed
    startedAt: timestamp('started_at').defaultNow().notNull(),
    finishedAt: timestamp('finished_at'),
    logJson: json('log_json'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      jobTypeIdx: index('job_runs_job_type_idx').on(table.jobType),
      statusIdx: index('job_runs_status_idx').on(table.status),
      entityIdx: index('job_runs_entity_idx').on(table.entityType),
      createdAtIdx: index('job_runs_created_at_idx').on(table.createdAt),
    };
  },
);

/**
 * Tabla de ingestion events - para rastrear cambios de datos externos
 */
export const ingestionEvents = pgTable(
  'ingestion_events',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    source: varchar('source', { length: 100 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: json('payload').notNull(),
    processedAt: timestamp('processed_at'),
    status: varchar('status', { length: 20 }).default('pending'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      sourceIdx: index('ingestion_events_source_idx').on(table.source),
      statusIdx: index('ingestion_events_status_idx').on(table.status),
      createdAtIdx: index('ingestion_events_created_at_idx').on(table.createdAt),
    };
  },
);

/**
 * Tabla de uso de IA - para rastrear costos y uso
 */
export const aiUsageLogs = pgTable(
  'ai_usage_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(), // anthropic, openai
    model: varchar('model', { length: 100 }).notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    costUsd: text('cost_usd'), // Stored as string to avoid floating point issues
    task: varchar('task', { length: 255 }),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('ai_usage_logs_user_id_idx').on(table.userId),
      providerIdx: index('ai_usage_logs_provider_idx').on(table.provider),
      createdAtIdx: index('ai_usage_logs_created_at_idx').on(table.createdAt),
    };
  },
);
