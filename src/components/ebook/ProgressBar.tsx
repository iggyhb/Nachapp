'use client';

interface ProgressBarProps {
  percent: number;
  status?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  percent,
  status = 'reading',
  showLabel = true,
}: ProgressBarProps): React.ReactElement {
  const percentage = Math.min(100, Math.max(0, percent));

  const colorClass =
    status === 'completed'
      ? 'bg-green-500'
      : status === 'abandoned'
        ? 'bg-red-500'
        : 'bg-blue-500';

  return (
    <div className="w-full">
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}
