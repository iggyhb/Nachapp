import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Plan {
  id: string;
  title: string;
  author?: string;
  completedUnits: number;
  totalUnits: number;
  planStatus: string;
  dailyTarget: number;
  targetDate: string;
  calculationMode: string;
}


const modeShortcuts: Record<string, string> = {
  pages_per_day: 'pág',
  words_per_day: 'pal',
  chapters_per_day: 'cap',
};

export function PlanCard({ plan }: { plan: Plan }): React.ReactElement {
  const percentComplete = Math.round(
    (plan.completedUnits / Math.max(1, plan.totalUnits)) * 100,
  );

  // Determine status color
  const getStatusColor = () => {
    if (plan.planStatus === 'completed') return 'text-green-600 dark:text-green-400';
    if (plan.planStatus === 'abandoned') return 'text-red-600 dark:text-red-400';
    if (plan.planStatus === 'paused') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getStatusBg = () => {
    if (plan.planStatus === 'completed') return 'bg-green-100 dark:bg-green-900/30';
    if (plan.planStatus === 'abandoned') return 'bg-red-100 dark:bg-red-900/30';
    if (plan.planStatus === 'paused') return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-blue-100 dark:bg-blue-900/30';
  };

  const statusLabel: Record<string, string> = {
    active: 'Activo',
    paused: 'Pausado',
    completed: 'Completado',
    abandoned: 'Abandonado',
  };

  const shortMode = modeShortcuts[plan.calculationMode] || 'un';

  return (
    <Link href={`/reading/${plan.id}`}>
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {plan.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {plan.author || 'Autor desconocido'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {plan.completedUnits}/{plan.totalUnits} {shortMode}
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {percentComplete}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100, percentComplete)}%` }}
            />
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Meta diaria</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {plan.dailyTarget} {shortMode}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Finaliza</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {new Date(plan.targetDate).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBg()} ${getStatusColor()}`}
        >
          {statusLabel[plan.planStatus] || plan.planStatus}
        </div>
      </div>
    </Link>
  );
}
