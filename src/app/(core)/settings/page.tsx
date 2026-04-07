'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, Zap, Palette, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage(): React.ReactElement {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
      });
      router.push('/login');
    } catch {
      console.error('Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Profile update would be implemented here
      console.log('Profile updated:', { displayName, timezone });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configuración
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personaliza tu experiencia en la app
          </p>
        </div>

        {/* Profile Settings */}
        <Card title="Perfil" icon={<User className="w-5 h-5" />}>
          <div className="space-y-4">
            <Input
              label="Nombre para mostrar"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zona horaria
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Madrid">Madrid</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full"
            >
              Guardar cambios
            </Button>
          </div>
        </Card>

        {/* Appearance Settings */}
        <Card title="Apariencia" icon={<Palette className="w-5 h-5" />}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tema
              </label>
              <div className="space-y-2">
                {(['light', 'dark', 'auto'] as const).map((t) => (
                  <label key={t} className="flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value={t}
                      checked={theme === t}
                      onChange={(e) => setTheme(e.target.value as typeof t)}
                      className="w-4 h-4"
                    />
                    <span className="ml-3 text-gray-700 dark:text-gray-300 capitalize">
                      {t === 'auto' ? 'Automático' : t === 'light' ? 'Claro' : 'Oscuro'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card title="Seguridad" icon={<Lock className="w-5 h-5" />}>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Autenticación
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Tu cuenta está protegida con autenticación biométrica (Passkey) y PIN.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Passkeys registradas
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                1 passkey registrada
              </p>
            </div>

            <Button variant="secondary" className="w-full">
              Agregar nueva Passkey
            </Button>
          </div>
        </Card>

        {/* Modules Settings */}
        <Card title="Módulos" icon={<Zap className="w-5 h-5" />}>
          <div className="space-y-3">
            {[
              { id: 'readings', name: 'Lecturas diarias', enabled: true },
              { id: 'practices', name: 'Prácticas espirituales', enabled: true },
              { id: 'liturgy', name: 'Liturgia oficial', enabled: true },
              { id: 'ai_chat', name: 'Chat de IA', enabled: true },
            ].map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {module.name}
                </span>
                <input
                  type="checkbox"
                  defaultChecked={module.enabled}
                  className="w-5 h-5 rounded"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* AI Providers */}
        <Card title="Proveedores de IA" icon={<Zap className="w-5 h-5" />}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proveedor de IA por defecto
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT-4)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clave API de Anthropic
              </label>
              <Input
                type="password"
                placeholder="sk-ant-..."
                defaultValue=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clave API de OpenAI
              </label>
              <Input
                type="password"
                placeholder="sk-..."
                defaultValue=""
              />
            </div>
          </div>
        </Card>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          disabled={isLoading}
          variant="danger"
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
