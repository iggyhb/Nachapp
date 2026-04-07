import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Start date must be before end date',
  path: ['endDate'],
});

export const sortSchema = z.enum([
  'asc',
  'desc',
]);

export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  'Invalid timezone',
);

export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Sort = z.infer<typeof sortSchema>;
