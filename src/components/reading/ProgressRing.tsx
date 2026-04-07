interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
}: ProgressRingProps): React.ReactElement {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
          style={{
            filter: `drop-shadow(0 2px 4px ${color}40)`,
          }}
        />
      </svg>

      {/* Text overlay */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {percent}%
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Completado
        </span>
      </div>
    </div>
  );
}
