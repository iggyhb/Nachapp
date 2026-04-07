import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getDashboardStats,
  getWeeklySummary,
  getCategoryStats,
  getCalendarHeatmap,
} from '@/lib/services/practice.service';

/**
 * GET /api/practices/stats
 * Dashboard stats — streaks, weekly summary, category breakdown
 * Query params: ?type=dashboard|weekly|categories|heatmap&month=2026-03&weekOffset=0
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const month = searchParams.get('month');
    const weekOffset: number = searchParams.get('weekOffset')
      ? parseInt(searchParams.get('weekOffset')!, 10)
      : 0;

    // Parse month (YYYY-MM)
    let year: number = new Date().getFullYear();
    let monthNum: number = new Date().getMonth() + 1;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      year = y;
      monthNum = m;
    }

    // Ensure valid month
    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    }

    switch (type) {
      case 'dashboard': {
        const stats = await getDashboardStats(session.userId);
        return NextResponse.json(stats);
      }

      case 'weekly': {
        const stats = await getWeeklySummary(session.userId, weekOffset);
        return NextResponse.json(stats);
      }

      case 'categories': {
        const stats = await getCategoryStats(session.userId);
        return NextResponse.json({ data: stats });
      }

      case 'heatmap': {
        const data = await getCalendarHeatmap(session.userId, year, monthNum);
        return NextResponse.json({ year, month: monthNum, data });
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching practice stats:', error);
    const message = error instanceof Error ? error.message : 'Error fetching stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

