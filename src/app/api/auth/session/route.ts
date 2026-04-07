import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
): Promise<NextResponse<unknown>> {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 },
      );
    }

    const userId = await verifySession(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      userId,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Session verification failed' },
      { status: 401 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
): Promise<NextResponse> {
  try {
    const response = NextResponse.json(
      { success: true },
      { status: 200 },
    );

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.SESSION_COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(null, {
    headers: {
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
