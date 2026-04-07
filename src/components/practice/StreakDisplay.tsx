'use client';

import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  isActiveToday,
}: StreakDisplayProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
      <div className={`flex items-center gap-2 ${isActiveToday ? 'animate-pulse' : ''}`}>
        <Flame className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" />
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Racha actual</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{currentStreak}</p>
        </div>
      </div>

      <div className="flex-1" />

      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400">Mejor racha</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{longestStreak}</p>
      </div>
    </div>
  );
}
