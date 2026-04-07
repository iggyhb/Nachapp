// DEPRECATED: Use /api/liturgy/[date]/regenerate instead
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Deprecated. Use /api/liturgy/[date]/regenerate instead.' },
    { status: 410 },
  );
}
