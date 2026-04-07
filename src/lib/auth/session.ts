import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-min-32-chars-long!!',
);

interface SessionPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Crea una nueva sesión JWT
 */
export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

/**
 * Verifica una sesión JWT desde una solicitud
 */
export async function verifySession(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return null;
    }

    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as unknown as SessionPayload;

    return payload.userId || null;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Destruye una sesión (cliente)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Obtiene la sesión del contexto del servidor
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return null;
    }

    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as SessionPayload;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}
