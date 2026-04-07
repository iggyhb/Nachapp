import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { libraryService } from '@/lib/services/library.service';

const ALLOWED_MIME_TYPES = ['application/epub+zip', 'application/pdf'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parsear form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const titleOverride = formData.get('titleOverride') as string | null;

    // Validar presencia de archivo
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 },
      );
    }

    // Convertir a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      // Crear libro usando la interfaz correcta del servicio
      const book = await libraryService.createBook({
        userId: session.userId,
        title: titleOverride || undefined,
        sourceType: 'upload',
        file: {
          buffer,
          originalFilename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });

      return NextResponse.json(book, { status: 201 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Manejar duplicado por hash
      if (errorMessage.includes('already exists')) {
        return NextResponse.json(
          { error: 'Un libro con este contenido ya existe en tu biblioteca' },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error al subir el ebook' },
      { status: 500 },
    );
  }
}
