import Link from 'next/link';
import { Check } from 'lucide-react';

interface TodayReadingCardProps {
  planId: string;
  bookTitle: string;
  targetUnits: number;
  completedUnits: number;
  mode: string;
  unitLabel: string;
  isComplete: boolean;
}

const modeShortcuts: Record<string, string> = {
  pages_per_day: 'pág',
  words_per_day: 'pal',
  chapters_per_day: 'cap',
};

export function TodayReadingCard({
  planId,
  bookTitle,
  targetUnits,
  completedUnits,
  mode,
  unitLabel,
  isComplete,
}: TodayReadingCardProps): React.ReactElement {
  const percentComplete = targetUnits > 0 ? Math.round((completedUnits / targetUnits) * 100) : 0;
  const shortMode = modeShortcuts[mode] || unitLabel;

  return (
    <Link href={`/reading/${planId}`}>
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {bookTitle}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isComplete ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, percentComplete)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {completedUnits}/{targetUnits} {shortMode}
              </span>
            </div>
          </div>

          {isComplete && (
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
