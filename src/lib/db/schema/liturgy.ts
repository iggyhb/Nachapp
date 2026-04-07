import {
  pgTable,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  json,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

/**
 * Tabla de entradas de Liturgia Diaria
 * Almacena las lecturas y reflexión generada por IA para cada día
 */
export const dailyLiturgyEntries = pgTable(
  'daily_liturgy_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    liturgyDate: varchar('liturgy_date', { length: 10 }).notNull(), // YYYY-MM-DD
    liturgicalSeason: varchar('liturgical_season', { length: 50 }), // 'adviento' | 'navidad' | 'cuaresma' | 'pascua' | 'ordinario'
    liturgicalColor: varchar('liturgical_color', { length: 20 }), // 'verde' | 'morado' | 'blanco' | 'rojo' | 'rosa'
    feastName: varchar('feast_name', { length: 255 }), // nombre de la festividad o memorial
    readingsJson: json('readings_json').$type<{
      firstReading: {
        reference: string;
        title: string;
        text: string;
      };
      psalm: {
        reference: string;
        title: string;
        text: string;
      };
      secondReading?: {
        reference: string;
        title: string;
        text: string;
      };
      gospel: {
        reference: string;
        title: string;
        text: string;
      };
    }>(),
    summaryText: text('summary_text'), // resumen generado por IA
    reflectionText: text('reflection_text'), // reflexión espiritual generada por IA
    practicalPoint: text('practical_point'), // punto práctico para el día
    status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'fetching' | 'generating' | 'completed' | 'failed'
    aiProvider: varchar('ai_provider', { length: 50 }), // 'anthropic' | 'openai'
    aiModel: varchar('ai_model', { length: 100 }), // nombre del modelo usado
    aiTokensUsed: integer('ai_tokens_used'), // tokens totales usados
    aiCostUsd: varchar('ai_cost_usd', { length: 20 }), // costo en USD como string
    errorMessage: text('error_message'), // mensaje de error si falló
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('daily_liturgy_entries_user_id_idx').on(table.userId),
      liturgyDateUniqueIdx: uniqueIndex(
        'daily_liturgy_entries_liturgy_date_user_id_idx',
      ).on(table.liturgyDate, table.userId),
      statusIdx: index('daily_liturgy_entries_status_idx').on(table.status),
      seasonIdx: index('daily_liturgy_entries_season_idx').on(
        table.liturgicalSeason,
      ),
      dateIdx: index('daily_liturgy_entries_date_idx').on(table.liturgyDate),
    };
  },
);

/**
 * Tabla de citas y referencias fuente
 * Almacena las citas patrísticas, magisteriales, etc. usadas en la reflexión
 */
export const sourceCitations = pgTable(
  'source_citations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    liturgyEntryId: varchar('liturgy_entry_id', { length: 36 })
      .notNull()
      .references(() => dailyLiturgyEntries.id, { onDelete: 'cascade' }),
    sourceType: varchar('source_type', { length: 50 }).notNull(), // 'patristic' | 'magisterium' | 'catechism' | 'scripture' | 'commentary'
    author: varchar('author', { length: 255 }), // e.g., "San Agustín"
    work: varchar('work', { length: 500 }), // e.g., "Confesiones"
    citationRef: varchar('citation_ref', { length: 255 }), // e.g., "Cap. 3, 5"
    excerpt: text('excerpt').notNull(), // el texto citado exacto
    sourceUrl: varchar('source_url', { length: 500 }), // URL de la fuente si está disponible
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      liturgyEntryIdIdx: index('source_citations_liturgy_entry_id_idx').on(
        table.liturgyEntryId,
      ),
      sourceTypeIdx: index('source_citations_source_type_idx').on(
        table.sourceType,
      ),
    };
  },
);

/**
 * Relaciones de Drizzle para queries con `with`
 */
export const dailyLiturgyEntriesRelations = relations(
  dailyLiturgyEntries,
  ({ one, many }) => ({
    user: one(users, {
      fields: [dailyLiturgyEntries.userId],
      references: [users.id],
    }),
    citations: many(sourceCitations),
  }),
);

export const sourceCitationsRelations = relations(
  sourceCitations,
  ({ one }) => ({
    liturgyEntry: one(dailyLiturgyEntries, {
      fields: [sourceCitations.liturgyEntryId],
      references: [dailyLiturgyEntries.id],
    }),
  }),
);
