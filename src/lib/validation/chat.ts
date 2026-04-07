import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

/**
 * Status enum for tool executions
 */
const statusEnum = z.enum(['success', 'error', 'pending']);

/**
 * Create chat thread schema
 */
export const createThreadSchema = z.object({
  title: z.string().max(255).optional(),
});

/**
 * Update chat thread schema
 */
export const updateThreadSchema = z.object({
  title: z.string().max(255).optional(),
  isArchived: z.boolean().optional(),
});

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  threadId: uuidSchema.optional(),
});

/**
 * Thread query schema
 */
export const threadQuerySchema = paginationSchema.extend({
  archived: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastMessageAt']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Message query schema
 */
export const messageQuerySchema = paginationSchema.extend({
  threadId: uuidSchema,
});

/**
 * Update memory profile schema
 */
export const updateMemorySchema = z.object({
  profileJson: z.record(z.unknown()).optional(),
  currentStateJson: z.record(z.unknown()).optional(),
  longTermSummaryJson: z.record(z.unknown()).optional(),
});

/**
 * Tool execution input schema
 */
export const toolExecutionSchema = z.object({
  messageId: uuidSchema,
  toolName: z.string().min(1).max(100),
  input: z.record(z.unknown()).optional(),
  status: statusEnum,
});

/**
 * Tool execution output schema
 */
export const toolExecutionResultSchema = z.object({
  id: uuidSchema,
  messageId: uuidSchema,
  toolName: z.string(),
  input: z.record(z.unknown()).nullable(),
  output: z.record(z.unknown()).nullable(),
  status: statusEnum,
  durationMs: z.number().int().nonnegative().nullable(),
  createdAt: z.date(),
});

// Type exports
export type CreateThread = z.infer<typeof createThreadSchema>;
export type UpdateThread = z.infer<typeof updateThreadSchema>;
export type SendMessage = z.infer<typeof sendMessageSchema>;
export type ThreadQuery = z.infer<typeof threadQuerySchema>;
export type MessageQuery = z.infer<typeof messageQuerySchema>;
export type UpdateMemory = z.infer<typeof updateMemorySchema>;
export type ToolExecution = z.infer<typeof toolExecutionSchema>;
export type ToolExecutionResult = z.infer<typeof toolExecutionResultSchema>;
