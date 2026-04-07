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
 * Tabla de categorías de prácticas
 * Agrupa ejercicios relacionados (p.ej., "Dibujo", "Música", "Estudio")
 */
export const practiceCategories = pgTable(
  'practice_categories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#3b82f6'), // hex color
    icon: varchar('icon', { length: 50 }), // emoji or icon name
    isActive: boolean('is_active').default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('practice_categories_user_id_idx').on(table.userId),
      userSlugIdx: uniqueIndex('practice_categories_user_id_slug_idx').on(
        table.userId,
        table.slug,
      ),
    };
  },
);

/**
 * Tabla de ejercicios de práctica
 * Ejercicios específicos dentro de una categoría
 */
export const practiceExercises = pgTable(
  'practice_exercises',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    categoryId: varchar('category_id', { length: 36 })
      .notNull()
      .references(() => practiceCategories.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    difficulty: varchar('difficulty', { length: 20 }), // 'easy' | 'medium' | 'hard'
    isActive: boolean('is_active').default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      categoryIdIdx: index('practice_exercises_category_id_idx').on(
        table.categoryId,
      ),
      userIdIdx: index('practice_exercises_user_id_idx').on(table.userId),
    };
  },
);

/**
 * Tabla de sesiones de práctica
 * Registra cada sesión de práctica del usuario
 */
export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 36 })
      .notNull()
      .references(() => practiceCategories.id, { onDelete: 'cascade' }),
    exerciseId: varchar('exercise_id', { length: 36 }).references(
      () => practiceExercises.id,
      { onDelete: 'set null' },
    ), // optional
    sessionDate: varchar('session_date', { length: 10 }).notNull(), // YYYY-MM-DD
    durationMinutes: integer('duration_minutes').notNull(),
    notes: text('notes'),
    mood: varchar('mood', { length: 20 }), // 'great' | 'good' | 'neutral' | 'tired' | 'frustrated'
    effort: varchar('effort', { length: 20 }), // 'easy' | 'moderate' | 'intense'
    metricsJson: json('metrics_json').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('practice_sessions_user_id_idx').on(table.userId),
      categoryIdIdx: index('practice_sessions_category_id_idx').on(
        table.categoryId,
      ),
      sessionDateIdx: index('practice_sessions_session_date_idx').on(
        table.sessionDate,
      ),
      userDateCategoryIdx: index(
        'practice_sessions_user_id_session_date_category_id_idx',
      ).on(table.userId, table.sessionDate, table.categoryId),
    };
  },
);

/**
 * Relaciones de Drizzle ORM
 */
export const practiceCategoriesRelations = relations(
  practiceCategories,
  ({ one, many }) => ({
    user: one(users, {
      fields: [practiceCategories.userId],
      references: [users.id],
    }),
    exercises: many(practiceExercises),
    sessions: many(practiceSessions),
  }),
);

export const practiceExercisesRelations = relations(
  practiceExercises,
  ({ one }) => ({
    user: one(users, {
      fields: [practiceExercises.userId],
      references: [users.id],
    }),
    category: one(practiceCategories, {
      fields: [practiceExercises.categoryId],
      references: [practiceCategories.id],
    }),
  }),
);

export const practiceSessionsRelations = relations(
  practiceSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [practiceSessions.userId],
      references: [users.id],
    }),
    category: one(practiceCategories, {
      fields: [practiceSessions.categoryId],
      references: [practiceCategories.id],
    }),
    exercise: one(practiceExercises, {
      fields: [practiceSessions.exerciseId],
      references: [practiceExercises.id],
    }),
  }),
);
