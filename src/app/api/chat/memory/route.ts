import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { chatService } from '@/lib/services/chat.service';
import { updateMemorySchema } from '@/lib/validation/chat';
import { ZodError } from 'zod';

/**
 * GET /api/chat/memory
 * Get user's memory profile
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await chatService.getMemoryProfile(userId);

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching memory profile:', error);
    return NextResponse.json(
      { error: 'Error al obtener el perfil de memoria' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/chat/memory
 * Update user's memory profile
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await verifySession(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    let validatedInput;
    try {
      validatedInput = updateMemorySchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const updated = await chatService.updateMemoryProfile(userId, {
      profile: validatedInput.profileJson,
      currentState: validatedInput.currentStateJson,
      longTermSummary: validatedInput.longTermSummaryJson,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el perfil' },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating memory profile:', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar el perfil de memoria';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
