import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { z } from 'zod';
import { createSession } from '@/lib/auth/session';

const requestSchema = z.object({
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.string(),
  }),
});


export async function POST(
  request: NextRequest,
): Promise<NextResponse<unknown>> {
  try {
    const body: unknown = await request.json();
    const validatedBody = requestSchema.parse(body);

    // Verify authentication response
    // TODO: In production, retrieve the stored authenticator and challenge from DB
    const verification = await verifyAuthenticationResponse({
      response: {
        id: validatedBody.credential.id,
        rawId: validatedBody.credential.rawId,
        response: {
          clientDataJSON: validatedBody.credential.response.clientDataJSON,
          authenticatorData:
            validatedBody.credential.response.authenticatorData,
          signature: validatedBody.credential.response.signature,
          userHandle: validatedBody.credential.response.userHandle,
        },
        clientExtensionResults: {},
        type: 'public-key',
      },
      expectedChallenge: '',
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || '',
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || '',
      credential: {
        id: validatedBody.credential.id,
        publicKey: new Uint8Array(),
        counter: 0,
      },
    } as unknown as Parameters<typeof verifyAuthenticationResponse>[0]);

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 401 },
      );
    }

    // In a real implementation, you would:
    // 1. Look up the user from the credential ID
    // 2. Verify credential counter hasn't been tampered with
    // 3. Create a session token
    const userId = 'user-id-from-db'; // This would come from your database
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
    console.error('Passkey authentication error:', error);
    return NextResponse.json(
      { error: 'Passkey authentication failed' },
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
