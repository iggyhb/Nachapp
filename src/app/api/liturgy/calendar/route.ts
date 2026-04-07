import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getCalendarOverview } from '@/lib/services/liturgy.service';

/**
 * GET /api/liturgy/calendar?year=2026&month=3
 * Obtiene un resumen del calendario con estado de entradas por día
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString(), 10);

    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid year or month' },
        { status: 400 },
      );
    }

    const calendar = await getCalendarOverview(userId, year, month);

    return NextResponse.json(calendar, { status: 200 });
  } catch (error) {
    console.error('[Liturgy Calendar API] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
