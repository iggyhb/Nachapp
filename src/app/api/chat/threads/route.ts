import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { chatService } from '@/lib/services/chat.service';
import {
  createThreadSchema,
  threadQuerySchema,
} from '@/lib/validation/chat';
import { ZodError } from 'zod';

/**
 * POST /api/chat/threads
 * Create a new chat thread
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    let validatedInput;
    try {
      validatedInput = createThreadSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const thread = await chatService.createThread(userId, validatedInput.title);

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error('Error creating thread:', error);
    const message = error instanceof Error ? error.message : 'Error al crear el chat';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/chat/threads
 * List user's chat threads
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      archived: searchParams.get('archived') === 'true',
      sortBy: (searchParams.get('sortBy') || 'updatedAt') as
        | 'createdAt'
        | 'updatedAt'
        | 'lastMessageAt',
      order: (searchParams.get('order') || 'desc') as 'asc' | 'desc',
    };

    let validatedQuery;
    try {
      validatedQuery = threadQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Parámetros de consulta inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await chatService.listThreads(userId, {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      archived: validatedQuery.archived,
      sortBy: validatedQuery.sortBy,
      order: validatedQuery.order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Error al obtener los chats' },
      { status: 500 },
    );
  }
}
