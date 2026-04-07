import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDailyLiturgy } from '@/lib/services/liturgy.service';

/**
 * GET /api/liturgy/today
 * Get today's liturgy entry
 * If not generated yet, triggers generation
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    try {
      const entry = await getDailyLiturgy(session.userId, today);
      return NextResponse.json({
        entry,
        status: entry.status,
        date: today,
      });
    } catch (error) {
      // If generation fails, return the error status
      console.error('Error generating today liturgy:', error);
      return NextResponse.json(
        {
          entry: null,
          status: 'failed',
          date: today,
          error: 'Error al generar la liturgia',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error fetching today liturgy:', error);
    return NextResponse.json(
      { error: 'Error al obtener la liturgia de hoy' },
      { status: 500 },
    );
  }
}
