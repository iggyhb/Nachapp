import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { readingPlanService } from '@/lib/services/reading-plan.service';
import { createPlanSchema, planQuerySchema } from '@/lib/validation/reading-plan';
import { ZodError } from 'zod';

/**
 * POST /api/reading-plans
 * Create a new reading plan
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    let validatedInput;
    try {
      validatedInput = createPlanSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Create the plan — dates ya vienen como strings YYYY-MM-DD validados por Zod
    const result = await readingPlanService.createPlan(session.userId, {
      bookId: validatedInput.bookId,
      startDate: validatedInput.startDate,
      targetDate: validatedInput.targetDate,
      mode: validatedInput.mode,
      skipWeekends: validatedInput.skipWeekends,
      restDays: validatedInput.restDays,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating reading plan:', error);
    const message = error instanceof Error ? error.message : 'Error al crear el plan';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reading-plans
 * List user's reading plans with filters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      status: searchParams.get('status') || undefined,
      bookId: searchParams.get('bookId') || undefined,
    };

    let validatedQuery;
    try {
      validatedQuery = planQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Parámetros de consulta inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await readingPlanService.getPlans(session.userId, validatedQuery);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reading plans:', error);
    return NextResponse.json(
      { error: 'Error al obtener los planes' },
      { status: 500 },
    );
  }
}
