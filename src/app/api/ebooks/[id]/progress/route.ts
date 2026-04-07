import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { libraryService } from '@/lib/services/library.service';
import { updateProgressSchema } from '@/lib/validation/ebook';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/ebooks/[id]/progress — Actualizar progreso de lectura
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    let validatedProgress;
    try {
      validatedProgress = updateProgressSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de progreso inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Verificar que el libro existe y es del usuario
    const book = await libraryService.getBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 });
    }
    if (book.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Construir updates para el libro
    const updates: Record<string, unknown> = {};

    if (validatedProgress.progressPercent !== undefined) {
      updates.currentProgressPercent = validatedProgress.progressPercent;

      // Auto-completar si llega al 100%
      if (validatedProgress.progressPercent >= 100) {
        updates.readingStatus = 'completed';
      } else if (validatedProgress.progressPercent > 0 && book.readingStatus === 'not_started') {
        updates.readingStatus = 'reading';
      }
    }

    if (validatedProgress.readingStatus !== undefined) {
      updates.readingStatus = validatedProgress.readingStatus;
    }

    if (validatedProgress.currentPage !== undefined) {
      // Calcular porcentaje si tenemos total de páginas
      if (book.totalPages && book.totalPages > 0) {
        updates.currentProgressPercent = Math.min(
          100,
          Math.round((validatedProgress.currentPage / book.totalPages) * 100),
        );
      }
    }

    const updatedBook = await libraryService.updateBook(bookId, session.userId, updates);
    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el progreso de lectura' },
      { status: 500 },
    );
  }
}
