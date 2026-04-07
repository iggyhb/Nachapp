import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDailyLiturgy, regenerateEntry } from '@/lib/services/liturgy.service';
import { liturgyDateSchema, regenerateSchema } from '@/lib/validation/liturgy';

/**
 * POST /api/liturgy/[date]/regenerate
 * Regenerate the reflection for a date
 * Body: { provider?, model?, tone? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await params;

    // Validate date format
    const dateValidation = liturgyDateSchema.safeParse(date);
    if (!dateValidation.success) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const configValidation = regenerateSchema.safeParse(body);

    if (!configValidation.success) {
      return NextResponse.json(
        { error: 'Configuración inválida', details: configValidation.error.errors },
        { status: 400 },
      );
    }

    const config = configValidation.data;

    // Check if entry exists
    try {
      const entry = await getDailyLiturgy(session.userId, date);

      // Trigger regeneration
      const config2 = {
        provider: config.provider as 'anthropic' | 'openai',
        tone: config.tone as 'contemplative' | 'practical' | 'academic',
        maxReflectionLength: 1500,
      };

      const result = await regenerateEntry(entry.id, session.userId, config2);

      return NextResponse.json({
        success: true,
        message: 'Regeneración iniciada',
        date,
        status: result.status,
        config: {
          provider: config.provider || 'anthropic',
          model: config.model,
          tone: config.tone || 'contemplative',
        },
      });
    } catch (error) {
      console.error('Error in regenerate:', error);
      return NextResponse.json(
        { error: 'Entrada de liturgia no encontrada para esta fecha' },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error('Error regenerating reflection:', error);
    return NextResponse.json(
      { error: 'Error al regenerar la reflexión' },
      { status: 500 },
    );
  }
}
