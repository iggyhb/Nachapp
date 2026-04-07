'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { loginPinSchema } from '@/lib/validation/auth';
import { ZodError } from 'zod';

export function PINLogin(): React.ReactElement {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNumpadClick = (num: string): void => {
    if (pin.length < 6) {
      setPin(pin + num);
    }
  };

  const handleBackspace = (): void => {
    setPin(pin.slice(0, -1));
  };

  const handleVerifyPIN = async (): Promise<void> => {
    setError(null);

    try {
      // Validar formato de PIN
      const validated = loginPinSchema.parse({ pin });

      setIsLoading(true);

      const response = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validated),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else if (response.status === 401) {
        setError('PIN incorrecto');
        setPin('');
      } else if (response.status === 429) {
        setError('Cuenta bloqueada temporalmente. Intenta más tarde.');
        setPin('');
      } else {
        setError('Error al verificar el PIN');
      }
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.errors[0]?.message || 'PIN inválido');
      } else {
        setError(
          err instanceof Error ? err.message : 'Error desconocido',
        );
      }
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* PIN Display */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ingresa tu PIN de 6 dígitos
        </label>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center font-bold text-lg text-gray-900 dark:text-white"
            >
              {pin[index] ? '●' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumpadClick(String(num))}
            disabled={isLoading || pin.length >= 6}
            className="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-semibold text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {num}
          </button>
        ))}

        {/* Empty space */}
        <div></div>

        {/* 0 button */}
        <button
          onClick={() => handleNumpadClick('0')}
          disabled={isLoading || pin.length >= 6}
          className="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-semibold text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          0
        </button>

        {/* Backspace button */}
        <button
          onClick={handleBackspace}
          disabled={isLoading || pin.length === 0}
          className="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-semibold text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          ⌫
        </button>
      </div>

      {/* Verify Button */}
      <Button
        onClick={handleVerifyPIN}
        disabled={isLoading || pin.length !== 6}
        fullWidth
        size="lg"
      >
        {isLoading ? 'Verificando...' : 'Acceder'}
      </Button>
    </div>
  );
}
