import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Genera hash bcrypt del PIN
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verifica un PIN contra su hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, hash);
  } catch (error) {
    console.error('PIN verification error:', error);
    return false;
  }
}

/**
 * Verifica si la cuenta está bloqueada por demasiados intentos fallidos
 * En una implementación real, esto consultaría la base de datos
 */
export async function checkLockout(userId: string): Promise<boolean> {
  // This would check pin_credentials.locked_until in the database
  console.log(`Checking lockout for user: ${userId}`);
  return false;
}

/**
 * Incrementa el contador de intentos fallidos
 * En una implementación real, esto actualizaría la base de datos
 */
export async function incrementAttempts(userId: string): Promise<void> {
  // This would increment pin_credentials.failed_attempts and set locked_until if needed
  console.log(`Incrementing failed attempts for user: ${userId}`);
}

/**
 * Resetea el contador de intentos fallidos
 * En una implementación real, esto actualizaría la base de datos
 */
export async function resetAttempts(userId: string): Promise<void> {
  // This would reset pin_credentials.failed_attempts and clear locked_until
  console.log(`Resetting failed attempts for user: ${userId}`);
}
