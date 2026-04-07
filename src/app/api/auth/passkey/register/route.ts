import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { z } from 'zod';

const requestSchema = z.object({
  challenge: z.string().optional(),
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
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

    // Verify registration response
    const verification = await verifyRegistrationResponse({
      response: {
        id: validatedBody.credential.id,
        rawId: validatedBody.credential.rawId,
        response: {
          clientDataJSON: validatedBody.credential.response.clientDataJSON,
          attestationObject:
            validatedBody.credential.response.attestationObject,
        },
        clientExtensionResults: {},
        type: 'public-key',
      },
      expectedChallenge: validatedBody.challenge || '',
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || '',
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || '',
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      verified: true,
      credentialID: validatedBody.credential.id,
    });
  } catch (error) {
    console.error('Passkey registration error:', error);
    return NextResponse.json(
      { error: 'Passkey registration failed' },
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
