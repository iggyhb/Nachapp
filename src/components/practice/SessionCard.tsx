'use client';

import { Trash2 } from 'lucide-react';

interface SessionCardProps {
  id: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  durationMinutes: number;
  mood?: string;
  effort?: string;
  notes?: string;
  createdAt: Date;
  onDelete?: (id: string) => Promise<void>;
}

const moodEmoji: Record<string, string> = {
  great: '😊',
  good: '😃',
  neutral: '😐',
  tired: '😴',
  frustrated: '😤',
};

const effortLabel: Record<string, string> = {
  easy: 'Fácil',
  moderate: 'Moderado',
  intense: 'Intenso',
};

export function SessionCard({
  id,
  categoryName,
  categoryColor,
  categoryIcon,
  durationMinutes,
  mood,
  effort,
  notes,
  createdAt,
  onDelete,
}: SessionCardProps): React.ReactElement {
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationText =
    hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const timeStr = new Date(createdAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-3">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: categoryColor }}
        >
          {categoryIcon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{categoryName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{durationText}</p>

          {(mood || effort) && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {mood && (
                <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {moodEmoji[mood] || '💭'} {mood}
                </span>
              )}
              {effort && (
                <span className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  {effortLabel[effort] || effort}
                </span>
              )}
            </div>
          )}

          {notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{notes}</p>}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{timeStr}</p>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Eliminar sesión"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
