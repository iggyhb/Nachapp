'use client';

import { SetupForm } from '@/components/auth/SetupForm';
import { Card } from '@/components/ui/Card';

export default function SetupPage(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Nachapp
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configuración inicial
          </p>
        </div>

        <Card>
          <SetupForm />
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>Ya tienes cuenta?</p>
          <a
            href="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Inicia sesión
          </a>
        </div>
      </div>
    </div>
  );
}
