'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Fingerprint } from 'lucide-react';

export function PasskeyLogin(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if WebAuthn is available
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported on this device');
      }

      // In a real implementation:
      // 1. Call /api/auth/passkey/authenticate to get challenge
      // 2. Use navigator.credentials.get() to authenticate
      // 3. Send credential response back to server
      // 4. Create session and redirect

      // Placeholder implementation
      console.log('Passkey authentication would start here');

      // Simulating successful login for now
      const response = await fetch('/api/auth/session', {
        method: 'GET',
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Passkey authentication failed',
      );
      console.error('Passkey authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Usa tu biometría o clave de seguridad para acceder
      </p>

      <Button
        onClick={handlePasskeyLogin}
        disabled={isLoading}
        fullWidth
        size="lg"
        className="flex items-center justify-center gap-2"
      >
        <Fingerprint className="w-5 h-5" />
        {isLoading ? 'Autenticando...' : 'Usar Passkey'}
      </Button>

      <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
        Requiere dispositivo compatible con WebAuthn
      </div>
    </div>
  );
}
