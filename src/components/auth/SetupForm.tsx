'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { setupSchema } from '@/lib/validation/auth';
import { ZodError } from 'zod';

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
  const [step, setStep] = useState<'info' | 'pin' | 'passkey'>('info');

  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleNextStep = async (): Promise<void> => {
    try {
      setupSchema.parse(formData);

      // In a real implementation:
      // 1. Create user account
      // 2. Store hashed PIN
      // 3. Initialize modules
      // 4. Proceed to passkey registration

      setStep('passkey');
    } catch (err) {
      if (err instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const path = error.path[0];
          if (path) {
            newErrors[path as string] = error.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const handleRegister = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // In a real implementation:
      // 1. Register passkey
      // 2. Create session
      // 3. Redirect to dashboard

      // Simulating successful registration
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        submit: 'Error during registration. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: User Info */}
      {step === 'info' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Información personal
          </h3>

          <Input
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="tu@email.com"
            error={errors.email}
          />

          <Input
            label="Nombre para mostrar"
            type="text"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            placeholder="Tu nombre"
            error={errors.displayName}
          />

          <Button
            onClick={handleNextStep}
            fullWidth
            size="lg"
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Step 2: PIN Setup */}
      {step === 'pin' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Establece tu PIN
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            El PIN debe tener 6 dígitos y se usará como método de autenticación alternativo.
          </p>

          <Input
            label="PIN (6 dígitos)"
            type="password"
            value={formData.pin}
            onChange={(e) =>
              handleInputChange('pin', e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="000000"
            error={errors.pin}
            inputMode="numeric"
          />

          <Input
            label="Confirmar PIN"
            type="password"
            value={formData.pinConfirm}
            onChange={(e) =>
              handleInputChange('pinConfirm', e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="000000"
            error={errors.pinConfirm}
            inputMode="numeric"
          />

          {errors.submit && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
              {errors.submit}
            </div>
          )}

          <Button
            onClick={() => setStep('passkey')}
            fullWidth
            size="lg"
          >
            Siguiente: Passkey
          </Button>
        </div>
      )}

      {/* Step 3: Passkey Registration */}
      {step === 'passkey' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registra tu Passkey
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Usa tu sensor biométrico o llave de seguridad para autenticarte de forma segura.
          </p>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              El Passkey es el método de autenticación más seguro. Se almacena de forma segura en tu dispositivo.
            </p>
          </div>

          <Button
            onClick={handleRegister}
            disabled={isLoading}
            fullWidth
            size="lg"
          >
            {isLoading ? 'Registrando...' : 'Completar registro'}
          </Button>

          <Button
            onClick={() => setStep('pin')}
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
