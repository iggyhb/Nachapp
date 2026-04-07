import {
  generateRegistrationOptions as genRegOptions,
  generateAuthenticationOptions as genAuthOptions,
  verifyRegistrationResponse as verifyReg,
  verifyAuthenticationResponse as verifyAuth,
} from '@simplewebauthn/server';

interface RegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout: number;
  attestation: 'none' | 'direct' | 'indirect' | 'enterprise';
}

interface AuthenticationOptions {
  challenge: string;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
  rpId: string;
}

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Genera opciones para registrar un nuevo passkey
 */
export async function generateRegistrationOptions(
  userId: string,
  userName: string,
  displayName: string,
): Promise<RegistrationOptions> {
  return genRegOptions({
    rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
    rpName: process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'Personal App',
    userID: stringToUint8Array(userId),
    userName,
    userDisplayName: displayName,
    timeout: 60000,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    supportedAlgorithmIDs: [-7, -257],
  }) as Promise<RegistrationOptions>;
}

/**
 * Verifica la respuesta de registro de passkey
 */
export async function verifyRegistration(
  response: unknown,
  expectedChallenge: string,
): Promise<boolean> {
  try {
    const verification = await verifyReg({
      response: response as Parameters<typeof verifyReg>[0]['response'],
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
    });
    return verification.verified;
  } catch (error) {
    console.error('Passkey registration verification failed:', error);
    return false;
  }
}

/**
 * Genera opciones para autenticación con passkey
 */
export async function generateAuthenticationOptions(): Promise<AuthenticationOptions> {
  return genAuthOptions({
    rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
    timeout: 60000,
    userVerification: 'preferred',
  }) as Promise<AuthenticationOptions>;
}

/**
 * Verifica la respuesta de autenticación con passkey
 *
 * Note: This function requires additional parameters (authenticator device info)
 * for v10 of simplewebauthn. See the actual route handlers for proper implementation.
 */
export async function verifyAuthentication(
  response: unknown,
  expectedChallenge: string,
  authenticatorDevice?: unknown,
): Promise<boolean> {
  try {
    const verification = await verifyAuth({
      response: response as Parameters<typeof verifyAuth>[0]['response'],
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
      authenticator: authenticatorDevice as any,
    });
    return verification.verified;
  } catch (error) {
    console.error('Passkey authentication verification failed:', error);
    return false;
  }
}
