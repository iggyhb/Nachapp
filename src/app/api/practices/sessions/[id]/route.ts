import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { deleteSession, getSessions } from '@/lib/services/practice.service';

/**
 * GET /api/practices/sessions/[id]
 * Get a specific practice session
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const result = await getSessions(session.userId, { page: 1, limit: 1, offset: 0 });
    const practiceSession = result.sessions.find((s) => s.id === id);

    if (!practiceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(practiceSession);
  } catch (error) {
    console.error('Error fetching practice session:', error);
    return NextResponse.json({ error: 'Error fetching session' }, { status: 500 });
  }
}

/**
 * DELETE /api/practices/sessions/[id]
 * Delete a practice session
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify session exists and belongs to user
    const result = await getSessions(session.userId, { page: 1, limit: 1, offset: 0 });
    const practiceSession = result.sessions.find((s) => s.id === id);
    if (!practiceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await deleteSession(id, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting practice session:', error);
    const message = error instanceof Error ? error.message : 'Error deleting session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
