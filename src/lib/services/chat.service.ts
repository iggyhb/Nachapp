/**
 * Chat Service
 * Handles chat thread management, message processing, and AI integration
 */

import crypto from 'crypto';
import { db } from '@/lib/db/client';
import {
  chatThreads,
  chatMessages,
  toolExecutions,
  memoryProfiles,
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AIGateway, type AIRequest } from '@/lib/ai/gateway';
import type { AIMessage, AITool } from '@/lib/ai/providers/types';
import { listTools } from '@/lib/chat/tools';
import {
  executeToolCalls,
  parseToolCalls,
  type ParsedToolCall,
} from '@/lib/chat/tool-executor';
import type {
  ChatThread,
  ChatMessage,
  ToolExecution,
  MemoryProfile,
  ToolCall,
} from '@/lib/chat/types';

/**
 * Response from sendMessage
 */
export interface SendMessageResponse {
  thread: ChatThread;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

/**
 * Chat Service — Handles all chat-related database operations
 */
export const chatService = {
  /**
   * Create a new chat thread
   */
  async createThread(
    userId: string,
    title?: string,
  ): Promise<ChatThread> {
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(chatThreads).values({
      id,
      userId,
      title: title || undefined,
      isArchived: false,
      lastMessageAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      title,
      isArchived: false,
      lastMessageAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Get threads for a user with pagination
   */
  async getThreads(
    userId: string,
    params: { page?: number; limit?: number; archived?: boolean } = {},
  ): Promise<{ threads: ChatThread[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(chatThreads.userId, userId)];

    if (params.archived !== undefined) {
      whereConditions.push(eq(chatThreads.isArchived, params.archived));
    }

    const where = whereConditions.length > 1
      ? and(...whereConditions)
      : whereConditions[0];

    const [records, countResult] = await Promise.all([
      db.query.chatThreads.findMany({
        where,
        orderBy: desc(chatThreads.lastMessageAt),
        limit,
        offset,
      }),
      db.query.chatThreads.findMany({
        where,
      }),
    ]);

    return {
      threads: records as ChatThread[],
      total: countResult.length,
    };
  },

  /**
   * Get thread by ID
   */
  async getThreadById(threadId: string, userId: string): Promise<ChatThread | null> {
    const result = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });

    return (result as ChatThread) || null;
  },

  /**
   * Get a single thread with all its messages
   */
  async getThread(threadId: string, userId: string): Promise<(ChatThread & { messages: ChatMessage[] }) | null> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
      with: {
        messages: {
          orderBy: (msg) => [msg.createdAt],
        },
      },
    });

    if (!thread) {
      return null;
    }

    return {
      ...thread,
      messages: thread.messages as unknown as ChatMessage[],
    } as ChatThread & { messages: ChatMessage[] };
  },

  /**
   * List user's threads with pagination
   */
  async listThreads(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      archived?: boolean;
      sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<{ threads: ChatThread[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      archived = false,
    } = options;

    return this.getThreads(userId, { page, limit, archived });
  },

  /**
   * Update thread
   */
  async updateThread(
    threadId: string,
    userId: string,
    updates: Partial<{ title: string; isArchived: boolean }>,
  ): Promise<ChatThread | null> {
    const existing = await this.getThreadById(threadId, userId);
    if (!existing) {
      return null;
    }

    await db
      .update(chatThreads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));

    const updated = await this.getThreadById(threadId, userId);
    return updated;
  },

  /**
   * Delete thread (archive it)
   */
  async deleteThread(threadId: string, userId: string): Promise<boolean> {
    const existing = await this.getThreadById(threadId, userId);
    if (!existing) {
      return false;
    }

    await db
      .update(chatThreads)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));

    return true;
  },

  /**
   * Send a message and get AI response
   * Creates thread if needed, calls AI gateway, executes tools, stores everything
   */
  async sendMessage(
    userId: string,
    params: { content: string; threadId?: string },
  ): Promise<SendMessageResponse> {
    // Create or get thread
    let threadId = params.threadId;
    let thread: ChatThread;

    if (threadId) {
      const existing = await this.getThreadById(threadId, userId);
      if (!existing) {
        throw new Error('Thread not found or not owned by user');
      }
      thread = existing;
    } else {
      // Auto-generate title from first 50 chars of content
      const title = params.content.substring(0, 50).trim();
      thread = await this.createThread(userId, title);
      threadId = thread.id;
    }

    // Insert user message
    const userMessageId = crypto.randomUUID();
    const now = new Date();

    await db.insert(chatMessages).values({
      id: userMessageId,
      threadId,
      role: 'user',
      content: params.content,
      createdAt: now,
    });

    const userMessage: ChatMessage = {
      id: userMessageId,
      threadId,
      role: 'user',
      content: params.content,
      createdAt: now,
    };

    // Build conversation history (last 20 messages)
    const conversationHistory = await db.query.chatMessages.findMany({
      where: eq(chatMessages.threadId, threadId),
      orderBy: (msg) => [msg.createdAt],
      limit: 20,
    });

    // Build AI messages from history + new message
    const aiMessages: AIMessage[] = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    aiMessages.push({
      role: 'user',
      content: params.content,
    });

    // Get memory profile if exists
    const memoryProfile = await db.query.memoryProfiles.findFirst({
      where: eq(memoryProfiles.userId, userId),
    });

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(memoryProfile);

    // Add system prompt as first message if not already present
    const systemMessageIndex = aiMessages.findIndex(m => m.role === 'system');
    if (systemMessageIndex === -1) {
      aiMessages.unshift({
        role: 'system',
        content: systemPrompt,
      });
    } else {
      aiMessages[systemMessageIndex].content = systemPrompt;
    }

    // Get available tools
    const tools = listTools();
    const aiTools: AITool[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));

    // Call AI Gateway
    const aiRequest: AIRequest = {
      task: 'chat_response',
      messages: aiMessages,
      tools: aiTools.length > 0 ? aiTools : undefined,
    };

    const aiResponse = await AIGateway.generateResponse(aiRequest);

    // Parse and execute tool calls
    let toolCalls: ParsedToolCall[] = [];

    try {
      toolCalls = parseToolCalls(aiResponse.content);

      if (toolCalls.length > 0) {
        const assistantMessageId = crypto.randomUUID();
        await executeToolCalls(userId, assistantMessageId, toolCalls);
      }
    } catch (error) {
      console.error('Error parsing/executing tools:', error);
      // Continue without tools if parsing fails
    }

    // Insert assistant message
    const assistantMessageId = crypto.randomUUID();
    const tokenUsage = {
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
      costUSD: aiResponse.usage.cost,
    };

    const toolCallsArray = toolCalls.map((tc, i) => ({
      id: `${i}`,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    }));

    await db.insert(chatMessages).values({
      id: assistantMessageId,
      threadId,
      role: 'assistant',
      content: aiResponse.content,
      modelProvider: aiResponse.provider,
      modelName: aiResponse.model,
      tokenUsageJson: tokenUsage,
      toolCallsJson: toolCallsArray.length > 0 ? toolCallsArray : null,
      createdAt: now,
    });

    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      threadId,
      role: 'assistant',
      content: aiResponse.content,
      modelProvider: aiResponse.provider,
      modelName: aiResponse.model,
      tokenUsage,
      toolCalls: toolCallsArray,
      createdAt: now,
    };

    // Update thread's lastMessageAt
    await db
      .update(chatThreads)
      .set({
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(chatThreads.id, threadId));

    return {
      thread,
      userMessage,
      assistantMessage,
    };
  },

  /**
   * Add message to thread (for manual insertion)
   */
  async addMessage(
    threadId: string,
    userId: string,
    message: {
      role: 'user' | 'assistant' | 'system' | 'tool';
      content: string;
      modelProvider?: string;
      modelName?: string;
      tokenUsage?: Record<string, unknown>;
      toolCalls?: Record<string, unknown>[];
    },
  ): Promise<ChatMessage | null> {
    // Verify thread exists and belongs to user
    const thread = await this.getThreadById(threadId, userId);
    if (!thread) {
      return null;
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(chatMessages).values({
      id,
      threadId,
      role: message.role,
      content: message.content,
      modelProvider: message.modelProvider,
      modelName: message.modelName,
      tokenUsageJson: message.tokenUsage,
      toolCallsJson: message.toolCalls,
      createdAt: now,
    });

    // Update thread's lastMessageAt
    await db
      .update(chatThreads)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(chatThreads.id, threadId));

    const toolCalls = message.toolCalls as unknown as ToolCall[] | undefined;
    return {
      id,
      threadId,
      role: message.role as 'user' | 'assistant' | 'system' | 'tool',
      content: message.content,
      modelProvider: message.modelProvider ?? undefined,
      modelName: message.modelName ?? undefined,
      tokenUsage: message.tokenUsage as Record<string, unknown> | undefined ?? undefined,
      toolCalls: toolCalls ?? undefined,
      createdAt: now,
    };
  },

  /**
   * Get messages for thread
   */
  async getMessages(
    threadId: string,
    userId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ messages: ChatMessage[]; total: number } | null> {
    // Verify thread exists and belongs to user
    const thread = await this.getThreadById(threadId, userId);
    if (!thread) {
      return null;
    }

    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const [records, countResult] = await Promise.all([
      db.query.chatMessages.findMany({
        where: eq(chatMessages.threadId, threadId),
        orderBy: (msg) => [msg.createdAt],
        limit,
        offset,
      }),
      db.query.chatMessages.findMany({
        where: eq(chatMessages.threadId, threadId),
      }),
    ]);

    return {
      messages: records.map((msg) => {
        const toolCalls = msg.toolCallsJson as unknown as ToolCall[] | null | undefined;
        return {
          id: msg.id,
          threadId: msg.threadId,
          role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
          content: msg.content,
          modelProvider: msg.modelProvider ?? undefined,
          modelName: msg.modelName ?? undefined,
          tokenUsage: msg.tokenUsageJson ?? undefined,
          toolCalls: toolCalls ?? undefined,
          createdAt: msg.createdAt,
        } as ChatMessage;
      }),
      total: countResult.length,
    };
  },

  /**
   * Record tool execution
   */
  async recordToolExecution(
    messageId: string,
    toolExecution: {
      toolName: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      status: 'success' | 'error' | 'pending';
      durationMs?: number;
    },
  ): Promise<ToolExecution | null> {
    // Verify message exists
    const message = await db.query.chatMessages.findFirst({
      where: eq(chatMessages.id, messageId),
    });

    if (!message) {
      return null;
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(toolExecutions).values({
      id,
      messageId,
      toolName: toolExecution.toolName,
      input: toolExecution.input,
      output: toolExecution.output,
      status: toolExecution.status,
      durationMs: toolExecution.durationMs,
      createdAt: now,
    });

    return {
      id,
      messageId,
      toolName: toolExecution.toolName,
      input: toolExecution.input,
      output: toolExecution.output,
      status: toolExecution.status,
      durationMs: toolExecution.durationMs,
      createdAt: now,
    };
  },

  /**
   * Get tool executions for message
   */
  async getToolExecutions(messageId: string): Promise<ToolExecution[]> {
    const results = await db.query.toolExecutions.findMany({
      where: eq(toolExecutions.messageId, messageId),
      orderBy: (te) => [te.createdAt],
    });

    return results as ToolExecution[];
  },

  /**
   * Get or create memory profile
   */
  async getMemoryProfile(userId: string): Promise<MemoryProfile> {
    const existing = await db.query.memoryProfiles.findFirst({
      where: eq(memoryProfiles.userId, userId),
    });

    if (existing) {
      return {
        id: existing.id,
        userId: existing.userId,
        profile: existing.profileJson,
        currentState: existing.currentStateJson,
        longTermSummary: existing.longTermSummaryJson,
        updatedAt: existing.updatedAt,
      };
    }

    // Create new memory profile
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(memoryProfiles).values({
      id,
      userId,
      profileJson: null,
      currentStateJson: null,
      longTermSummaryJson: null,
      updatedAt: now,
    });

    return {
      id,
      userId,
      profile: undefined,
      currentState: undefined,
      longTermSummary: undefined,
      updatedAt: now,
    };
  },

  /**
   * Update memory profile
   */
  async updateMemoryProfile(
    userId: string,
    updates: {
      profile?: Record<string, unknown>;
      currentState?: Record<string, unknown>;
      longTermSummary?: Record<string, unknown>;
    },
  ): Promise<MemoryProfile | null> {
    const existing = await db.query.memoryProfiles.findFirst({
      where: eq(memoryProfiles.userId, userId),
    });

    if (!existing) {
      return null;
    }

    const now = new Date();
    await db
      .update(memoryProfiles)
      .set({
        profileJson: updates.profile || existing.profileJson,
        currentStateJson: updates.currentState || existing.currentStateJson,
        longTermSummaryJson:
          updates.longTermSummary || existing.longTermSummaryJson,
        updatedAt: now,
      })
      .where(eq(memoryProfiles.userId, userId));

    return {
      id: existing.id,
      userId: existing.userId,
      profile: updates.profile || existing.profileJson,
      currentState: updates.currentState || existing.currentStateJson,
      longTermSummary: updates.longTermSummary || existing.longTermSummaryJson,
      updatedAt: now,
    };
  },

  /**
   * Build system prompt with user context and available tools
   */
  buildSystemPrompt(memoryProfile?: Record<string, unknown> | null): string {
    const toolNames = listTools().map(t => t.name).join(', ');

    let prompt = `Eres un asistente personal integrado en una app privada. Tu usuario es católico practicante. Puedes consultar herramientas internas para acceder a datos del usuario.

## Herramientas disponibles:
${toolNames}

Cuando necesites información sobre el usuario o sus actividades, puedes usar las herramientas disponibles. Por favor, sé amable, respetuoso y ofrece apoyo espiritual cuando sea apropiado.`;

    if (memoryProfile?.profileJson) {
      prompt += `

## Contexto del usuario:
${JSON.stringify(memoryProfile.profileJson, null, 2)}`;
    }

    if (memoryProfile?.currentStateJson) {
      prompt += `

## Estado actual:
${JSON.stringify(memoryProfile.currentStateJson, null, 2)}`;
    }

    if (memoryProfile?.longTermSummaryJson) {
      prompt += `

## Resumen a largo plazo:
${JSON.stringify(memoryProfile.longTermSummaryJson, null, 2)}`;
    }

    return prompt;
  },
};
