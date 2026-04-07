/**
 * Tool Executor
 * Handles execution of tool calls and logging to database
 */

import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { toolExecutions } from '@/lib/db/schema';
import { executeTool } from './tools';

/**
 * Represents a tool call parsed from AI response
 */
export interface ParsedToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  toolName: string;
  status: 'success' | 'error';
  output: unknown;
  durationMs: number;
}

/**
 * Execute a single tool call and log it to database
 */
export async function executeSingleTool(
  userId: string,
  messageId: string,
  toolName: string,
  params: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    const result = await executeTool(toolName, userId, params);
    const durationMs = Date.now() - startTime;

    // Log to database
    await db.insert(toolExecutions).values({
      id: crypto.randomUUID(),
      messageId,
      toolName,
      input: params,
      output: result.result as Record<string, unknown> || null,
      status: result.success ? 'success' : 'error',
      durationMs,
      createdAt: new Date(),
    });

    return {
      toolName,
      status: result.success ? 'success' : 'error',
      output: result.result || result.error || null,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log error to database
    await db.insert(toolExecutions).values({
      id: crypto.randomUUID(),
      messageId,
      toolName,
      input: params,
      output: {
        error: error instanceof Error ? error.message : String(error),
      },
      status: 'error',
      durationMs,
      createdAt: new Date(),
    });

    return {
      toolName,
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : String(error),
      },
      durationMs,
    };
  }
}

/**
 * Execute multiple tool calls sequentially
 */
export async function executeToolCalls(
  userId: string,
  messageId: string,
  toolCalls: ParsedToolCall[],
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeSingleTool(
      userId,
      messageId,
      toolCall.name,
      toolCall.arguments,
    );
    results.push(result);
  }

  return results;
}

/**
 * Parse tool calls from AI response content
 * Simple parsing for now - looks for structured tool call patterns in the response
 * In production, use structured tool calling from the AI provider if available
 */
export function parseToolCalls(responseContent: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];

  // Match pattern: [TOOL: tool_name({"arg": "value"})]
  const toolPattern = /\[TOOL:\s*(\w+)\s*\(\s*({[^}]*})\s*\)\]/g;
  let match;

  while ((match = toolPattern.exec(responseContent)) !== null) {
    const toolName = match[1];
    const argsStr = match[2];

    try {
      const args = JSON.parse(argsStr);
      toolCalls.push({
        name: toolName,
        arguments: args,
      });
    } catch (error) {
      console.error(`Failed to parse tool call arguments for ${toolName}:`, error);
    }
  }

  return toolCalls;
}
