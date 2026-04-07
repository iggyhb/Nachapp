// DEPRECATED: Use /api/liturgy/[date] instead
// This route exists as a stub — the [id] dynamic segment conflicts with [date]
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Deprecated. Use /api/liturgy/[date] (YYYY-MM-DD format) instead.' },
    { status: 410 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Deprecated. Use /api/liturgy/[date] (YYYY-MM-DD format) instead.' },
    { status: 410 },
  );
}
