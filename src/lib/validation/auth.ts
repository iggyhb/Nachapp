import { z } from 'zod';

export const loginPinSchema = z.object({
  pin: z.string().length(6).regex(/^\d+$/, 'PIN must be 6 digits'),
});

export const registerPasskeySchema = z.object({
  credentialId: z.string().min(1),
  publicKey: z.string().min(1),
  counter: z.number().int().default(0),
  transports: z.array(z.string()).optional(),
  name: z.string().default('My Device'),
});

export const setupSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1).max(255),
  pin: z.string().length(6).regex(/^\d+$/, 'PIN must be 6 digits'),
  pinConfirm: z.string().length(6).regex(/^\d+$/, 'PIN confirmation must be 6 digits'),
}).refine((data) => data.pin === data.pinConfirm, {
  message: 'PINs do not match',
  path: ['pinConfirm'],
});

export const changePasswordSchema = z.object({
  oldPin: z.string().length(6).regex(/^\d+$/, 'Current PIN must be 6 digits'),
  newPin: z.string().length(6).regex(/^\d+$/, 'New PIN must be 6 digits'),
  confirmPin: z.string().length(6).regex(/^\d+$/, 'PIN confirmation must be 6 digits'),
}).refine((data) => data.newPin === data.confirmPin, {
  message: 'New PINs do not match',
  path: ['confirmPin'],
}).refine((data) => data.oldPin !== data.newPin, {
  message: 'New PIN must be different from current PIN',
  path: ['newPin'],
});

export type LoginPinInput = z.infer<typeof loginPinSchema>;
export type RegisterPasskeyInput = z.infer<typeof registerPasskeySchema>;
export type SetupInput = z.infer<typeof setupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
