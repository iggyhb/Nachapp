import { z } from 'zod';
import { paginationSchema, sortSchema } from './common';

export const uploadEbookSchema = z.object({
  file: z.instanceof(File),
  titleOverride: z.string().max(500).optional(),
});

export const updateBookSchema = z.object({
  title: z.string().max(500).optional(),
  author: z.string().max(255).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  readingStatus: z.enum(['not_started', 'reading', 'completed', 'abandoned']).optional(),
  publisher: z.string().max(255).optional(),
  publishedDate: z.string().max(20).optional(),
  isbn: z.string().max(30).optional(),
  language: z.string().max(10).optional(),
});

export const bookQuerySchema = paginationSchema.extend({
  status: z.enum(['not_started', 'reading', 'completed', 'abandoned']).optional(),
  q: z.string().max(255).optional(),
  sort: z.enum(['created_at', 'title', 'author']).default('created_at'),
  order: sortSchema.default('desc'),
});

export const updateProgressSchema = z.object({
  currentPage: z.number().int().nonnegative().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  readingStatus: z.enum(['not_started', 'reading', 'completed', 'abandoned']).optional(),
});

export type UploadEbook = z.infer<typeof uploadEbookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type BookQuery = z.infer<typeof bookQuerySchema>;
export type UpdateProgress = z.infer<typeof updateProgressSchema>;
