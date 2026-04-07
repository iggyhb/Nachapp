/**
 * POST /api/ebooks/ingest
 * Endpoint para el agente local de iCloud.
 * Acepta Bearer token en lugar de cookie de sesión.
 * Recibe un ebook y lo procesa igual que el upload manual.
 */

import { NextRequest, NextResponse } from 'next/server';
import { libraryService } from '@/lib/services/library.service';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

const ALLOWED_MIME_TYPES = ['application/epub+zip', 'application/pdf'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Validate the agent token from Authorization header.
 * Returns the user ID associated with the agent token,
 * or null if invalid.
 */
async function validateAgentToken(token: string): Promise<string | null> {
  const agentToken = process.env.AGENT_INGEST_TOKEN;
  const agentUserId = process.env.AGENT_USER_ID;

  if (!agentToken || !agentUserId) {
    console.error('[Ingest] AGENT_INGEST_TOKEN or AGENT_USER_ID not configured');
    return null;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== agentToken.length) return null;

  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(agentToken);

  if (a.byteLength !== b.byteLength) return null;

  const { subtle } = globalThis.crypto;
  const keyA = await subtle.importKey('raw', a, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const keyB = await subtle.importKey('raw', b, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigA = new Uint8Array(await subtle.sign('HMAC', keyA, a));
  const sigB = new Uint8Array(await subtle.sign('HMAC', keyB, b));

  let match = true;
  for (let i = 0; i < sigA.length; i++) {
    if (sigA[i] !== sigB[i]) match = false;
  }

  return match ? agentUserId : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Validate Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <token>' },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const userId = await validateAgentToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid agent token' },
        { status: 401 },
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sourcePath = formData.get('sourcePath') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // 3. Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // 4. Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 },
      );
    }

    // 5. Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      // 6. Create book via library service
      const book = await libraryService.createBook({
        userId,
        sourceType: 'agent',
        sourcePath: sourcePath ?? undefined,
        file: {
          buffer,
          originalFilename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });

      console.log(`[Ingest] Book created: ${book.id} — ${book.title} (from agent)`);

      return NextResponse.json(
        {
          success: true,
          book: {
            id: book.id,
            title: book.title,
            author: book.author,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate file — this ebook already exists in the library',
            isDuplicate: true,
          },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('[Ingest] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during ingestion' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ebooks/ingest
 * Health/status check for the agent endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const userId = await validateAgentToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: 'Invalid agent token' },
      { status: 401 },
    );
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: 'ingest',
    acceptedTypes: ALLOWED_MIME_TYPES,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  });
}
