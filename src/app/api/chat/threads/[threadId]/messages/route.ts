import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { chatService } from '@/lib/services/chat.service';
import { sendMessageSchema, messageQuerySchema } from '@/lib/validation/chat';
import { ZodError } from 'zod';

/**
 * POST /api/chat/threads/[threadId]/messages
 * Send a message to a thread
 */
export async function POST(
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

    // Validate request body
    let validatedInput;
    try {
      validatedInput = sendMessageSchema.parse({
        content: body.content,
        threadId: body.threadId || threadId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Use threadId from params if not provided in body
    const actualThreadId = validatedInput.threadId || threadId;

    const message = await chatService.addMessage(
      actualThreadId,
      userId,
      {
        role: 'user',
        content: validatedInput.content,
      },
    );

    if (!message) {
      return NextResponse.json(
        { error: 'Chat no encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    const message = error instanceof Error ? error.message : 'Error al enviar el mensaje';

    if (message === 'Chat no encontrado') {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/chat/threads/[threadId]/messages
 * List messages for a thread
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
    const { searchParams } = new URL(request.url);

    const queryParams = {
      threadId,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: 0,
    };

    let validatedQuery;
    try {
      validatedQuery = messageQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Parámetros de consulta inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await chatService.getMessages(threadId, userId, {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Chat no encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Error al obtener los mensajes' },
      { status: 500 },
    );
  }
}
