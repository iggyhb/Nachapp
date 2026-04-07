import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

/**
 * Date string validation: YYYY-MM-DD format
 */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');

/**
 * Slug validation: lowercase, hyphens, alphanumeric
 */
const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

/**
 * Color validation: hex color
 */
const colorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Invalid hex color (e.g., #3b82f6)');

/**
 * Difficulty enum
 */
const difficultyEnum = z.enum(['easy', 'medium', 'hard']);

/**
 * Mood enum
 */
const moodEnum = z.enum(['great', 'good', 'neutral', 'tired', 'frustrated']);

/**
 * Effort enum
 */
const effortEnum = z.enum(['easy', 'moderate', 'intense']);

/**
 * Create practice category schema
 */
export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema.optional(),
  description: z.string().max(1000).optional(),
  color: colorSchema.optional(),
  icon: z.string().max(50).optional(),
});

/**
 * Update practice category schema
 */
export const updateCategorySchema = createCategorySchema.partial();

/**
 * Create practice exercise schema
 */
export const createExerciseSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  difficulty: difficultyEnum.optional(),
});

/**
 * Update practice exercise schema
 */
export const updateExerciseSchema = createExerciseSchema.partial().omit({ categoryId: true });

/**
 * Log session schema
 */
export const logSessionSchema = z.object({
  categoryId: uuidSchema,
  exerciseId: uuidSchema.optional(),
  sessionDate: dateStringSchema,
  durationMinutes: z.number().int().min(1).max(720),
  notes: z.string().max(2000).optional(),
  mood: moodEnum.optional(),
  effort: effortEnum.optional(),
  metricsJson: z.record(z.unknown()).optional(),
});

/**
 * Session query schema
 */
export const sessionQuerySchema = paginationSchema.extend({
  categoryId: uuidSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

/**
 * Reorder categories schema
 */
export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(uuidSchema).min(1),
});

// Type exports
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type CreateExercise = z.infer<typeof createExerciseSchema>;
export type UpdateExercise = z.infer<typeof updateExerciseSchema>;
export type LogSession = z.infer<typeof logSessionSchema>;
export type SessionQuery = z.infer<typeof sessionQuerySchema>;
export type ReorderCategories = z.infer<typeof reorderCategoriesSchema>;

/**
 * Auto-generate slug from name
 * Used when slug is not provided in create request
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // remove special chars
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim hyphens from start/end
}
