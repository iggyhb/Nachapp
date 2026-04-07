import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { updateExercise, deleteExercise, getExercises } from '@/lib/services/practice.service';
import { updateExerciseSchema, type UpdateExercise } from '@/lib/validation/practice';
import { ZodError } from 'zod';

/**
 * GET /api/practices/exercises/[id]
 * Get a specific practice exercise
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

    const exercises = await getExercises(session.userId);
    const exercise = exercises.find((e) => e.id === id);

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error('Error fetching practice exercise:', error);
    return NextResponse.json({ error: 'Error fetching exercise' }, { status: 500 });
  }
}

/**
 * PATCH /api/practices/exercises/[id]
 * Update a practice exercise
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

    let validatedInput: UpdateExercise;
    try {
      validatedInput = updateExerciseSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const updated = await updateExercise(id, session.userId, validatedInput);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating practice exercise:', error);
    const message = error instanceof Error ? error.message : 'Error updating exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/practices/exercises/[id]
 * Delete a practice exercise
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

    // Verify exercise exists and belongs to user
    const exercises = await getExercises(session.userId);
    const exercise = exercises.find((e) => e.id === id);
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    await deleteExercise(id, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting practice exercise:', error);
    const message = error instanceof Error ? error.message : 'Error deleting exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
