import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { libraryService } from '@/lib/services/library.service';

const ALLOWED_MIME_TYPES = [
  'application/epub+zip',
  'application/pdf',
  'application/octet-stream', // fallback for browsers that don't recognize .epub
  'application/x-epub+zip',
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function isAllowedFile(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'epub' || ext === 'pdf') return true;
  return ALLOWED_MIME_TYPES.includes(file.type);
}

function getEffectiveMimeType(file: File): string {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'epub') return 'application/epub+zip';
  if (ext === 'pdf') return 'application/pdf';
  return file.type;
}

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
    const titleOverride = (formData.get('titleOverride') ?? formData.get('title')) as string | null;

    // Validar presencia de archivo
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validar tipo de archivo (por MIME o extensión)
    if (!isAllowedFile(file)) {
      return NextResponse.json(
        {
          error: 'Formato no válido. Solo se aceptan archivos EPUB y PDF.',
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
          mimeType: getEffectiveMimeType(file),
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

      console.error('Upload inner error:', errorMessage);
      return NextResponse.json(
        { error: `Error al subir el ebook: ${errorMessage}` },
        { status: 500 },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Upload error:', errorMessage);
    return NextResponse.json(
      { error: `Error al subir el ebook: ${errorMessage}` },
      { status: 500 },
    );
  }
}
