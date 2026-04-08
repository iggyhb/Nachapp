'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { z } from 'zod';

const infoSchema = z.object({
  email: z.string().email('Email inválido'),
  displayName: z.string().min(1, 'El nombre es obligatorio').max(255),
});

const pinSchema = z.object({
  pin: z.string().length(6, 'El PIN debe tener 6 dígitos').regex(/^\d+$/, 'Solo dígitos'),
  pinConfirm: z.string().length(6, 'El PIN debe tener 6 dígitos'),
}).refine((d) => d.pin === d.pinConfirm, {
  message: 'Los PINs no coinciden',
  path: ['pinConfirm'],
});

export function SetupForm(): React.ReactElement {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    pin: '',
    pinConfirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'pin'>('info');

  const handleChange = (field: string, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleNextStep = (): void => {
    try {
      infoSchema.parse({ email: formData.email, displayName: formData.displayName });
      setErrors({});
      setStep('pin');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const handleRegister = async (): Promise<void> => {
    try {
      pinSchema.parse({ pin: formData.pin, pinConfirm: formData.pinConfirm });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          displayName: formData.displayName,
          pin: formData.pin,
        }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setErrors({ submit: data.error ?? 'Error al registrar. Inténtalo de nuevo.' });
        return;
      }

      router.push('/dashboard');
    } catch {
      setErrors({ submit: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === 'info' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Información personal
          </h3>

          <Input
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="tu@email.com"
            error={errors.email}
          />

          <Input
            label="Nombre para mostrar"
            type="text"
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            placeholder="Tu nombre"
            error={errors.displayName}
          />

          <Button onClick={handleNextStep} fullWidth size="lg">
            Siguiente
          </Button>
        </div>
      )}

      {step === 'pin' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Crea tu PIN
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Elige un PIN de 6 dígitos para acceder a tu app.
          </p>

          <Input
            label="PIN (6 dígitos)"
            type="password"
            value={formData.pin}
            onChange={(e) =>
              handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="••••••"
            error={errors.pin}
            inputMode="numeric"
          />

          <Input
            label="Confirmar PIN"
            type="password"
            value={formData.pinConfirm}
            onChange={(e) =>
              handleChange('pinConfirm', e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="••••••"
            error={errors.pinConfirm}
            inputMode="numeric"
          />

          {errors.submit && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
              {errors.submit}
            </div>
          )}

          <Button
            onClick={handleRegister}
            disabled={isLoading}
            fullWidth
            size="lg"
          >
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <Button
            onClick={() => setStep('info')}
            variant="secondary"
            fullWidth
          >
            Volver
          </Button>
        </div>
      )}
    </div>
  );
}
