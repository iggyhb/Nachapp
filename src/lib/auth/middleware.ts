import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './session';

/**
 * Middleware para proteger rutas autenticadas
 */
export async function authMiddleware(
  request: NextRequest,
): Promise<NextResponse<unknown> | null> {
  const userId = await verifySession(request);

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  return null;
}

/**
 * Helper para validar autenticación en rutas API
 */
export async function requireAuth(
  request: NextRequest,
): Promise<string | NextResponse<unknown>> {
  const userId = await verifySession(request);

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  return userId;
}
