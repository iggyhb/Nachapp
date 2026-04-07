'use client';

import { useState } from 'react';
import { PasskeyLogin } from '@/components/auth/PasskeyLogin';
import { PINLogin } from '@/components/auth/PINLogin';
import { Card } from '@/components/ui/Card';

type AuthMethod = 'pin' | 'passkey';

export default function LoginPage(): React.ReactElement {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('pin');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Mi App Personal
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acceso seguro con autenticación biométrica
          </p>
        </div>

        <Card className="mb-6">
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setAuthMethod('pin')}
              className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                authMethod === 'pin'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              PIN
            </button>
            <button
              onClick={() => setAuthMethod('passkey')}
              className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                authMethod === 'passkey'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Passkey
            </button>
          </div>

          {authMethod === 'pin' && <PINLogin />}
          {authMethod === 'passkey' && <PasskeyLogin />}
        </Card>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Primera vez aquí?</p>
          <a
            href="/setup"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    </div>
  );
}
