import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db/client';
import { users, pinCredentials } from '@/lib/db/schema';
import { createSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

const requestSchema = z.object({
  pin: z.string().length(6).regex(/^\d+$/),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { pin } = requestSchema.parse(body);

    // Get the only user (single-user app)
    const userRows = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .limit(1);

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'No hay cuenta registrada' }, { status: 401 });
    }

    const user = userRows[0];

    if (!user.isActive) {
      return NextResponse.json({ error: 'Cuenta desactivada' }, { status: 401 });
    }

    // Get PIN credential
    const pinRows = await db
      .select({
        pinHash: pinCredentials.pinHash,
        failedAttempts: pinCredentials.failedAttempts,
        lockedUntil: pinCredentials.lockedUntil,
      })
      .from(pinCredentials)
      .where(eq(pinCredentials.userId, user.id))
      .limit(1);

    if (pinRows.length === 0) {
      return NextResponse.json({ error: 'PIN no configurado' }, { status: 401 });
    }

    const cred = pinRows[0];

    // Check lockout
    if (cred.lockedUntil && cred.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Cuenta bloqueada temporalmente. Intenta más tarde.' },
        { status: 429 },
      );
    }

    // Verify PIN
    const isValid = await compare(pin, cred.pinHash);

    if (!isValid) {
      const newAttempts = (cred.failedAttempts ?? 0) + 1;
      const lockedUntil =
        newAttempts >= MAX_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await db
        .update(pinCredentials)
        .set({ failedAttempts: newAttempts, lockedUntil })
        .where(eq(pinCredentials.userId, user.id));

      if (lockedUntil) {
        return NextResponse.json(
          { error: `Demasiados intentos. Bloqueado ${LOCKOUT_MINUTES} minutos.` },
          { status: 429 },
        );
      }

      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
    }

    // Reset failed attempts on success
    await db
      .update(pinCredentials)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(pinCredentials.userId, user.id));

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Create session
    const token = await createSession(user.id);

    const response = NextResponse.json({ verified: true });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.SESSION_COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE ?? '604800', 10),
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Formato de PIN inválido' }, { status: 400 });
    }
    console.error('[PIN verify] Error:', error);
    return NextResponse.json({ error: 'Error al verificar el PIN' }, { status: 500 });
  }
}

export async function OPTIONS(): Promise<NextResponse<null>> {
  return NextResponse.json(null, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
