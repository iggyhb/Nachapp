import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { readingPlanService } from '@/lib/services/reading-plan.service';
import { recordProgressSchema } from '@/lib/validation/reading-plan';
import { ZodError } from 'zod';

/**
 * GET /api/reading-plans/[id]/progress
 * Get progress entries for plan
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const progressEntries = await readingPlanService.getProgressEntries(id, session.userId);

    return NextResponse.json({ entries: progressEntries });
  } catch (error) {
    console.error('Error fetching progress:', error);
    const message = error instanceof Error ? error.message : 'Error al obtener el progreso';

    if (message === 'Plan no encontrado') {
      return NextResponse.json(
        { error: message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reading-plans/[id]/progress
 * Record daily progress
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate request body
    let validatedInput;
    try {
      validatedInput = recordProgressSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Record progress
    const result = await readingPlanService.recordProgress(id, session.userId, {
      ...validatedInput,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error recording progress:', error);
    const message = error instanceof Error ? error.message : 'Error al registrar el progreso';

    if (message === 'Plan no encontrado') {
      return NextResponse.json(
        { error: message },
        { status: 404 },
      );
    }

    if (
      message === 'El plan no está activo' ||
      message.includes('Ya existe una entrada')
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
