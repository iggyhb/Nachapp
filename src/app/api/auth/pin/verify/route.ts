import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPin, checkLockout } from '@/lib/auth/pin';
import { createSession } from '@/lib/auth/session';

const requestSchema = z.object({
  pin: z.string().length(6).regex(/^\d+$/),
});


export async function POST(
  request: NextRequest,
): Promise<NextResponse<unknown>> {
  try {
    const body: unknown = await request.json();
    const validatedBody = requestSchema.parse(body);

    // In a real implementation:
    // 1. Get the user's PIN credential from the database
    // 2. Check for lockout (too many failed attempts)
    // 3. Verify the PIN against the stored hash
    // 4. Reset failure counter on success

    const isLockedOut = await checkLockout('user-id-from-context');
    if (isLockedOut) {
      return NextResponse.json(
        { error: 'Account locked due to too many failed attempts' },
        { status: 429 },
      );
    }

    // This would be the stored PIN hash from the database
    const storedPINHash = '$2b$12$...'; // bcrypt hash
    const isPinValid = await verifyPin(validatedBody.pin, storedPINHash);

    if (!isPinValid) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 },
      );
    }

    // Create session and return token
    const userId = 'user-id-from-db';
    const token = await createSession(userId);

    const response = NextResponse.json({
      verified: true,
      token,
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.SESSION_COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800', 10),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('PIN verification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'PIN verification failed' },
      { status: 500 },
    );
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
