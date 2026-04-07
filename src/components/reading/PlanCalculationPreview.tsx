import { AlertTriangle } from 'lucide-react';

interface PlanCalculationPreviewProps {
  dailyTarget: number;
  daysTotal: number;
  effectiveDays: number;
  isViable: boolean;
  warnings: string[];
  mode: string;
}

const modeLabels: Record<string, string> = {
  pages_per_day: 'páginas',
  words_per_day: 'palabras',
  chapters_per_day: 'capítulos',
};

export function PlanCalculationPreview({
  dailyTarget,
  daysTotal,
  effectiveDays,
  isViable,
  warnings,
  mode,
}: PlanCalculationPreviewProps): React.ReactElement {
  const unitLabel = modeLabels[mode] || 'unidades';

  if (!isViable) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
              Plan no viable
            </h3>
            <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
              {warnings.map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Calculation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">
          Cálculo del plan
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              Meta diaria
            </p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {dailyTarget}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              {unitLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              Días totales
            </p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {daysTotal}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              calendario
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              Días de lectura
            </p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {effectiveDays}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              efectivos
            </p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Advertencias
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Viability Check */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-sm font-medium text-green-900 dark:text-green-200">
          ✓ Plan viable: Puedes completar este libro en las fechas especificadas
        </p>
      </div>
    </div>
  );
}
