import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { readingPlanService } from '@/lib/services/reading-plan.service';
import { updatePlanSchema } from '@/lib/validation/reading-plan';
import { ZodError } from 'zod';

/**
 * GET /api/reading-plans/[id]
 * Get plan detail with progress entries
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

    const result = await readingPlanService.getPlanById(id, session.userId);

    // Get progress entries
    const progressEntries = await readingPlanService.getProgressEntries(id, session.userId);

    return NextResponse.json({
      ...result,
      progressEntries,
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    const message = error instanceof Error ? error.message : 'Error al obtener el plan';

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
 * PATCH /api/reading-plans/[id]
 * Update plan (status, target date)
 */
export async function PATCH(
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
      validatedInput = updatePlanSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Handle different update types based on what was provided
    let updatedPlan;

    if (validatedInput.planStatus) {
      // Update status
      if (validatedInput.planStatus === 'paused') {
        updatedPlan = await readingPlanService.pausePlan(id, session.userId);
      } else if (validatedInput.planStatus === 'active') {
        updatedPlan = await readingPlanService.resumePlan(id, session.userId);
      } else if (validatedInput.planStatus === 'abandoned') {
        updatedPlan = await readingPlanService.abandonPlan(id, session.userId);
      }
    } else if (validatedInput.targetDate) {
      // Replan with new target date
      const result = await readingPlanService.replan(id, session.userId, {
        newTargetDate: validatedInput.targetDate,
      });
      updatedPlan = result.plan;
    }

    if (!updatedPlan) {
      return NextResponse.json(
        { error: 'No se proporcionaron cambios válidos' },
        { status: 400 },
      );
    }

    // Fetch full plan data with progress
    const result = await readingPlanService.getPlanById(id, session.userId);
    const progressEntries = await readingPlanService.getProgressEntries(id, session.userId);

    return NextResponse.json({
      ...result,
      progressEntries,
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar el plan';

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
 * DELETE /api/reading-plans/[id]
 * Delete plan and progress entries
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    await readingPlanService.deletePlan(id, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    const message = error instanceof Error ? error.message : 'Error al eliminar el plan';

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
