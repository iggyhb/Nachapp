import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

/**
 * Date string validation: YYYY-MM-DD format
 */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');

/**
 * Create reading plan schema
 */
export const createPlanSchema = z
  .object({
    bookId: uuidSchema,
    startDate: dateStringSchema,
    targetDate: dateStringSchema,
    mode: z.enum([
      'pages_per_day',
      'words_per_day',
      'chapters_per_day',
    ]),
    skipWeekends: z.boolean().optional(),
    restDays: z
      .array(z.number().int().min(0).max(6))
      .optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const target = new Date(data.targetDate);
      return target > start;
    },
    {
      message: 'Target date must be after start date',
      path: ['targetDate'],
    },
  );

/**
 * Update reading plan schema
 */
export const updatePlanSchema = z.object({
  targetDate: dateStringSchema.optional(),
  planStatus: z
    .enum(['active', 'paused', 'completed', 'abandoned'])
    .optional(),
  skipWeekends: z.boolean().optional(),
  restDays: z
    .array(z.number().int().min(0).max(6))
    .optional(),
});

/**
 * Record progress schema
 */
export const recordProgressSchema = z.object({
  date: dateStringSchema,
  actualUnits: z.number().int().positive('Must read at least 1 unit'),
  notes: z.string().max(1000).optional(),
});

/**
 * Replan schema
 */
export const replanSchema = z.object({
  newTargetDate: dateStringSchema.optional(),
});

/**
 * Plan query schema
 */
export const planQuerySchema = paginationSchema.extend({
  status: z
    .enum(['active', 'paused', 'completed', 'abandoned'])
    .optional(),
  bookId: uuidSchema.optional(),
});

// Type exports
export type CreatePlan = z.infer<typeof createPlanSchema>;
export type UpdatePlan = z.infer<typeof updatePlanSchema>;
export type RecordProgress = z.infer<typeof recordProgressSchema>;
export type Replan = z.infer<typeof replanSchema>;
export type PlanQuery = z.infer<typeof planQuerySchema>;
