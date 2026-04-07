import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getLiturgyHistory } from '@/lib/services/liturgy.service';
import { liturgyQuerySchema } from '@/lib/validation/liturgy';
import { ZodError } from 'zod';

/**
 * GET /api/liturgy/history?page=1&limit=10&season=ordinario&status=completed
 * Obtiene el historial de entradas de liturgia con paginación y filtros
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const season = searchParams.get('season') || undefined;
    const status = searchParams.get('status') || undefined;

    const validated = liturgyQuerySchema.parse({
      page,
      limit,
      startDate,
      endDate,
      season,
      status,
    });

    const history = await getLiturgyHistory(
      userId,
      {
        startDate: validated.startDate,
        endDate: validated.endDate,
        season: validated.season,
        status: validated.status,
      },
      validated.page,
      validated.limit,
    );

    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    console.error('[Liturgy History API] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
