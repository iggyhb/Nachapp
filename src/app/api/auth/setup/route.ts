import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { users, pinCredentials } from '@/lib/db/schema';
import { createSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

const setupSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(255),
  pin: z.string().length(6).regex(/^\d+$/),
});

function generateId(): string {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { email, displayName, pin } = setupSchema.parse(body);

    // Check if any user already exists (single-user app)
    const existing = await db.select({ id: users.id }).from(users).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta registrada. Inicia sesión.' },
        { status: 409 },
      );
    }

    // Check email uniqueness
    const emailExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (emailExists.length > 0) {
      return NextResponse.json(
        { error: 'Este correo ya está registrado.' },
        { status: 409 },
      );
    }

    // Create user
    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      email,
      displayName,
      isActive: true,
    });

    // Hash and store PIN
    const pinHash = await hash(pin, 12);
    await db.insert(pinCredentials).values({
      id: generateId(),
      userId,
      pinHash,
    });

    // Create session
    const token = await createSession(userId);

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[Setup] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
