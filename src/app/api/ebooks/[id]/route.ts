import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { libraryService } from '@/lib/services/library.service';
import { updateBookSchema } from '@/lib/validation/ebook';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ebooks/[id] — Detalle de libro con capítulos
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;

    const book = await libraryService.getBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 });
    }

    if (book.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('Error al obtener libro:', error);
    return NextResponse.json({ error: 'Error al obtener el libro' }, { status: 500 });
  }
}

/**
 * PATCH /api/ebooks/[id] — Actualizar metadatos del libro
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

    let validatedUpdates;
    try {
      validatedUpdates = updateBookSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de actualización inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    try {
      const updatedBook = await libraryService.updateBook(bookId, session.userId, validatedUpdates);
      return NextResponse.json(updatedBook);
    } catch (error) {
      if (error instanceof Error && error.message === 'Book not found') {
        return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al actualizar libro:', error);
    return NextResponse.json({ error: 'Error al actualizar el libro' }, { status: 500 });
  }
}

/**
 * DELETE /api/ebooks/[id] — Eliminar libro y archivos asociados
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;

    try {
      await libraryService.deleteBook(bookId, session.userId);
      return NextResponse.json({ success: true, message: 'Libro eliminado' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Book not found') {
        return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al eliminar libro:', error);
    return NextResponse.json({ error: 'Error al eliminar el libro' }, { status: 500 });
  }
}
