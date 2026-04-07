import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { chatService } from '@/lib/services/chat.service';
import { updateThreadSchema } from '@/lib/validation/chat';
import { ZodError } from 'zod';

/**
 * GET /api/chat/threads/[threadId]
 * Get thread details with messages
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await context.params;

    const thread = await chatService.getThreadById(threadId, userId);
    if (!thread) {
      return NextResponse.json(
        { error: 'Chat no encontrado' },
        { status: 404 },
      );
    }

    // Get messages for the thread
    const messagesResult = await chatService.getMessages(threadId, userId, {
      page: 1,
      limit: 100,
    });

    if (!messagesResult) {
      return NextResponse.json(
        { error: 'Chat no encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      thread,
      messages: messagesResult.messages,
      total: messagesResult.total,
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    const message = error instanceof Error ? error.message : 'Error al obtener el chat';

    if (message === 'Chat no encontrado') {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/chat/threads/[threadId]
 * Update thread (title, archived status)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await context.params;
    const body = await request.json();

    let validatedInput;
    try {
      validatedInput = updateThreadSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const updated = await chatService.updateThread(threadId, userId, validatedInput);
    if (!updated) {
      return NextResponse.json(
        { error: 'Chat no encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating thread:', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar el chat';

    if (message === 'Chat no encontrado') {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/threads/[threadId]
 * Delete thread and all messages
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await context.params;

    const success = await chatService.deleteThread(threadId, userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Chat no encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread:', error);
    const message = error instanceof Error ? error.message : 'Error al eliminar el chat';

    if (message === 'Chat no encontrado') {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
