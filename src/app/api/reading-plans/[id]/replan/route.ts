import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { readingPlanService } from '@/lib/services/reading-plan.service';
import { replanSchema } from '@/lib/validation/reading-plan';
import { ZodError } from 'zod';

/**
 * POST /api/reading-plans/[id]/replan
 * Replan from today with optional new target date
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
      validatedInput = replanSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Replan
    const result = await readingPlanService.replan(id, session.userId, {
      newTargetDate: validatedInput.newTargetDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error replanning:', error);
    const message = error instanceof Error ? error.message : 'Error al replanificar';

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
