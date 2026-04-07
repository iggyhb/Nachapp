import {
  pgTable,
  varchar,
  integer,
  timestamp,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';
import { books } from './ebook';

/**
 * Tabla de planes de lectura
 * Almacena un plan de lectura para un libro específico del usuario
 */
export const readingPlans = pgTable(
  'reading_plans',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    bookId: varchar('book_id', { length: 36 })
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: varchar('start_date', { length: 10 }).notNull(), // YYYY-MM-DD format
    targetDate: varchar('target_date', { length: 10 }).notNull(), // YYYY-MM-DD format
    calculationMode: varchar('calculation_mode', { length: 30 }).notNull(), // 'pages_per_day' | 'words_per_day' | 'chapters_per_day'
    dailyTarget: integer('daily_target').notNull(), // calculated pages/words/chapters per day
    totalUnits: integer('total_units').notNull(), // total pages/words/chapters in book
    completedUnits: integer('completed_units').default(0), // units read so far
    planStatus: varchar('plan_status', { length: 20 }).default('active'), // 'active' | 'paused' | 'completed' | 'abandoned'
    daysTotal: integer('days_total').notNull(), // total calendar days
    daysElapsed: integer('days_elapsed').default(0), // days that have passed
    configJson: json('config_json').$type<{
      skipWeekends?: boolean;
      restDays?: number[];
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('reading_plans_user_id_idx').on(table.userId),
      bookIdIdx: index('reading_plans_book_id_idx').on(table.bookId),
      statusIdx: index('reading_plans_plan_status_idx').on(table.planStatus),
      uniqueActivePlanPerBook: uniqueIndex(
        'reading_plans_book_id_plan_status_idx',
      ).on(table.bookId, table.planStatus),
    };
  },
);

/**
 * Tabla de progreso de lectura
 * Registra lo que el usuario ha leído cada día
 */
export const readingProgress = pgTable(
  'reading_progress',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    planId: varchar('plan_id', { length: 36 })
      .notNull()
      .references(() => readingPlans.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: varchar('book_id', { length: 36 })
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    progressDate: varchar('progress_date', { length: 10 }).notNull(), // YYYY-MM-DD format
    targetUnits: integer('target_units').notNull(), // expected for this day
    actualUnits: integer('actual_units').default(0), // what was actually read
    cumulativeUnits: integer('cumulative_units').default(0), // total read up to this date
    notes: varchar('notes', { length: 1000 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      planIdIdx: index('reading_progress_plan_id_idx').on(table.planId),
      progressDateIdx: index('reading_progress_progress_date_idx').on(
        table.progressDate,
      ),
      uniqueDatePerPlan: uniqueIndex(
        'reading_progress_plan_id_progress_date_idx',
      ).on(table.planId, table.progressDate),
    };
  },
);

/**
 * Relaciones de Drizzle para queries con `with`
 */
export const readingPlansRelations = relations(
  readingPlans,
  ({ one, many }) => ({
    user: one(users, {
      fields: [readingPlans.userId],
      references: [users.id],
    }),
    book: one(books, {
      fields: [readingPlans.bookId],
      references: [books.id],
    }),
    readingProgress: many(readingProgress),
  }),
);

export const readingProgressRelations = relations(
  readingProgress,
  ({ one }) => ({
    plan: one(readingPlans, {
      fields: [readingProgress.planId],
      references: [readingPlans.id],
    }),
    user: one(users, {
      fields: [readingProgress.userId],
      references: [users.id],
    }),
    book: one(books, {
      fields: [readingProgress.bookId],
      references: [books.id],
    }),
  }),
);
