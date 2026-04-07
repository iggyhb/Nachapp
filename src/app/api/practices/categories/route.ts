import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createCategory, getCategories } from '@/lib/services/practice.service';
import { createCategorySchema, type CreateCategory } from '@/lib/validation/practice';
import { ZodError } from 'zod';

/**
 * POST /api/practices/categories
 * Create a new practice category
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    let validatedInput: CreateCategory;
    try {
      validatedInput = createCategorySchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const result = await createCategory(session.userId, validatedInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating practice category:', error);
    const message = error instanceof Error ? error.message : 'Error creating category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/practices/categories
 * List user's practice categories with session counts
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await getCategories(session.userId);

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching practice categories:', error);
    return NextResponse.json({ error: 'Error fetching categories' }, { status: 500 });
  }
}
