import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { libraryService } from '@/lib/services/library.service';
import { bookQuerySchema } from '@/lib/validation/ebook';
import { ZodError } from 'zod';

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
      q: searchParams.get('q') || undefined,
      sort: (searchParams.get('sort') as 'created_at' | 'title' | 'author') || 'created_at',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
    };

    let validatedQuery;
    try {
      validatedQuery = bookQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Parámetros de consulta inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Mapear sort de la query al campo del servicio
    const sortByMap: Record<string, 'title' | 'author' | 'createdAt'> = {
      created_at: 'createdAt',
      title: 'title',
      author: 'author',
    };

    const result = await libraryService.getBooks(session.userId, {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      status: validatedQuery.status as 'not_started' | 'reading' | 'completed' | 'abandoned' | undefined,
      search: validatedQuery.q,
      sortBy: sortByMap[validatedQuery.sort] || 'createdAt',
      sortOrder: validatedQuery.order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener libros:', error);
    return NextResponse.json(
      { error: 'Error al obtener la biblioteca' },
      { status: 500 },
    );
  }
}
