import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { updateCategory, deleteCategory, getCategories } from '@/lib/services/practice.service';
import { updateCategorySchema, type UpdateCategory } from '@/lib/validation/practice';
import { ZodError } from 'zod';

/**
 * GET /api/practices/categories/[id]
 * Get a specific practice category
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

    const categories = await getCategories(session.userId);
    const category = categories.find((c) => c.id === id);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching practice category:', error);
    return NextResponse.json({ error: 'Error fetching category' }, { status: 500 });
  }
}

/**
 * PATCH /api/practices/categories/[id]
 * Update a practice category
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

    let validatedInput: UpdateCategory;
    try {
      validatedInput = updateCategorySchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const updated = await updateCategory(id, session.userId, validatedInput);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating practice category:', error);
    const message = error instanceof Error ? error.message : 'Error updating category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/practices/categories/[id]
 * Delete a practice category
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

    // Verify category exists and belongs to user
    const categories = await getCategories(session.userId);
    const category = categories.find((c) => c.id === id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await deleteCategory(id, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting practice category:', error);
    const message = error instanceof Error ? error.message : 'Error deleting category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
