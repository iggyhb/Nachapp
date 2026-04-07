import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ProgressEntryProps {
  date: string;
  target: number;
  actual: number;
  cumulative: number;
  notes?: string;
}

export function ProgressEntry({
  date,
  target,
  actual,
  cumulative,
  notes,
}: ProgressEntryProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const metTarget = actual >= target;
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900 dark:text-white">
              {dateStr}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  metTarget
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {actual}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                / {target}
              </span>
            </div>
          </div>
          {!expanded && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Total acumulado: {cumulative}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${
              metTarget ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <ChevronDown
            className={`w-4 h-4 text-gray-400 dark:text-gray-600 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Meta</p>
              <p className="font-semibold text-gray-900 dark:text-white">{target}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Leído</p>
              <p className="font-semibold text-gray-900 dark:text-white">{actual}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
              <p className="font-semibold text-gray-900 dark:text-white">{cumulative}</p>
            </div>
          </div>

          {metTarget ? (
            <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
              ✓ Meta alcanzada
            </div>
          ) : (
            <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
              ✗ Por debajo de la meta ({actual - target})
            </div>
          )}

          {notes && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Notas
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
