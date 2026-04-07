import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createExercise, getExercises } from '@/lib/services/practice.service';
import { createExerciseSchema, type CreateExercise } from '@/lib/validation/practice';
import { ZodError } from 'zod';

/**
 * POST /api/practices/exercises
 * Create a new practice exercise
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    let validatedInput: CreateExercise;
    try {
      validatedInput = createExerciseSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await createExercise(session.userId, validatedInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating practice exercise:', error);
    const message = error instanceof Error ? error.message : 'Error creating exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/practices/exercises
 * List exercises, optionally filtered by categoryId
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;

    const exercises = await getExercises(session.userId, categoryId || undefined);

    return NextResponse.json({ data: exercises });
  } catch (error) {
    console.error('Error fetching practice exercises:', error);
    return NextResponse.json({ error: 'Error fetching exercises' }, { status: 500 });
  }
}
