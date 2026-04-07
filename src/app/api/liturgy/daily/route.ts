// DEPRECATED: Use /api/liturgy/today instead
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Deprecated. Use /api/liturgy/today instead.' },
    { status: 410 },
  );
}
