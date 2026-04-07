import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { logSession, getSessions } from '@/lib/services/practice.service';
import { logSessionSchema, sessionQuerySchema, type LogSession, type SessionQuery } from '@/lib/validation/practice';
import { ZodError } from 'zod';

/**
 * POST /api/practices/sessions
 * Log a practice session (fast path — most used endpoint)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    let validatedInput: LogSession;
    try {
      validatedInput = logSessionSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await logSession(session.userId, validatedInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error logging practice session:', error);
    const message = error instanceof Error ? error.message : 'Error logging session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/practices/sessions
 * List sessions with filters (categoryId, startDate, endDate, page, limit)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      categoryId: searchParams.get('categoryId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    };

    let validatedQuery: SessionQuery;
    try {
      validatedQuery = sessionQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await getSessions(session.userId, validatedQuery);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching practice sessions:', error);
    return NextResponse.json({ error: 'Error fetching sessions' }, { status: 500 });
  }
}
