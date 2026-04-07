'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

const steps = [
  'Obteniendo lecturas...',
  'Procesando textos...',
  'Generando reflexión...',
  'Añadiendo citas...',
  'Guardando...',
];

export function GeneratingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-12 flex flex-col items-center gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <div className="relative bg-gray-800 rounded-full p-4 border border-blue-500/30">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-lg font-semibold text-gray-200">
          Preparando la reflexión del día...
        </p>
        <p className="text-sm text-gray-400 animate-pulse">
          {steps[currentStep]}
        </p>
      </div>

      {/* Progress steps */}
      <div className="w-full max-w-xs space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= currentStep ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            />
            <span
              className={`text-xs transition-colors ${
                i <= currentStep ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
