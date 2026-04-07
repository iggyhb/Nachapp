import { z } from 'zod';

/**
 * Esquema para una fecha en formato YYYY-MM-DD
 */
export const liturgyDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
  .refine((date) => {
    const d = new Date(date + 'T00:00:00');
    return !isNaN(d.getTime());
  }, 'Fecha inválida');

/**
 * Esquema para la configuración de generación
 */
export const generationConfigSchema = z
  .object({
    provider: z.enum(['anthropic', 'openai']).optional(),
    model: z.string().optional(),
    includePatristicSources: z.boolean().optional(),
    maxReflectionLength: z.number().int().positive().optional(),
    tone: z.enum(['contemplative', 'practical', 'academic']).optional(),
  })
  .strict();

/**
 * Esquema para solicitar generar liturgia diaria
 */
export const generateLiturgySchema = z
  .object({
    date: liturgyDateSchema,
    config: generationConfigSchema.optional(),
  })
  .strict();

/**
 * Esquema para regenerar una entrada de liturgia
 */
export const regenerateSchema = z
  .object({
    provider: z.enum(['anthropic', 'openai']).optional(),
    model: z.string().optional(),
    tone: z.enum(['contemplative', 'practical', 'academic']).optional(),
  })
  .strict();

/**
 * Esquema para consultas de historial de liturgia
 */
export const liturgyQuerySchema = z
  .object({
    startDate: liturgyDateSchema.optional(),
    endDate: liturgyDateSchema.optional(),
    season: z
      .enum(['adviento', 'navidad', 'cuaresma', 'pascua', 'ordinario'])
      .optional(),
    status: z
      .enum(['pending', 'fetching', 'generating', 'completed', 'failed'])
      .optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10),
  })
  .strict();

/**
 * Tipos TypeScript derivados de los esquemas
 */
export type LiturgyDate = z.infer<typeof liturgyDateSchema>;
export type GenerationConfig = z.infer<typeof generationConfigSchema>;
export type GenerateLiturgyRequest = z.infer<typeof generateLiturgySchema>;
export type RegenerateRequest = z.infer<typeof regenerateSchema>;
export type LiturgyQuery = z.infer<typeof liturgyQuerySchema>;
