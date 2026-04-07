import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { readingPlanService } from '@/lib/services/reading-plan.service';

/**
 * GET /api/reading-plans/today
 * Get today's reading targets across all active plans
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayReadings = await readingPlanService.getTodayReadings(session.userId);

    return NextResponse.json({ readings: todayReadings });
  } catch (error) {
    console.error('Error fetching today readings:', error);
    return NextResponse.json(
      { error: 'Error al obtener la lectura de hoy' },
      { status: 500 },
    );
  }
}
