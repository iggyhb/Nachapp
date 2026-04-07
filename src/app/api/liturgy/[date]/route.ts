import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDailyLiturgy, deleteLiturgyEntry, getLiturgyEntry } from '@/lib/services/liturgy.service';
import { liturgyDateSchema } from '@/lib/validation/liturgy';

/**
 * GET /api/liturgy/[date]
 * Get liturgy for a specific date (YYYY-MM-DD)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await params;

    // Validate date format
    const validationResult = liturgyDateSchema.safeParse(date);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 },
      );
    }

    try {
      const entry = await getDailyLiturgy(session.userId, date);
      return NextResponse.json({
        entry,
        status: entry.status,
        date,
      });
    } catch (error) {
      console.error('Error generating liturgy:', error);
      return NextResponse.json(
        {
          entry: null,
          status: 'failed',
          date,
          error: 'Error al generar la liturgia',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error fetching liturgy by date:', error);
    return NextResponse.json(
      { error: 'Error al obtener la liturgia' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/liturgy/[date]
 * Delete a liturgy entry
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await params;

    // Validate date format
    const validationResult = liturgyDateSchema.safeParse(date);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 },
      );
    }

    // First, find the entry by date to get its ID
    const entry = await getLiturgyEntry(date) ||
      (await getDailyLiturgy(session.userId, date).catch(() => null));

    if (!entry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 },
      );
    }

    const deleted = await deleteLiturgyEntry(entry.id, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la entrada' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Entrada eliminada correctamente',
      date,
    });
  } catch (error) {
    console.error('Error deleting liturgy entry:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la entrada' },
      { status: 500 },
    );
  }
}
