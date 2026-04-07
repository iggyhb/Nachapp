'use client';

interface DayData {
  date: string;
  hasActivity: boolean;
  minutes: number;
}

interface WeekDotsProps {
  days: DayData[];
}

const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function WeekDots({ days }: WeekDotsProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-between">
        {dayLabels.map((label, idx) => {
          const day = days[idx];
          const hasActivity = day?.hasActivity || false;
          const minutes = day?.minutes || 0;

          return (
            <div key={label} className="flex flex-col items-center gap-1">
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  hasActivity
                    ? 'bg-green-500 text-white dark:bg-green-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
                title={`${label}: ${minutes}m`}
              >
                {hasActivity ? '✓' : label}
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
              {hasActivity && <span className="text-xs font-semibold text-green-600 dark:text-green-400">{minutes}m</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
