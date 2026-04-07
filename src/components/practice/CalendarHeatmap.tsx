'use client';

interface DayActivity {
  date: string;
  sessions: number;
  totalMinutes: number;
  categories: string[];
  hasActivity: boolean;
}

interface CalendarHeatmapProps {
  activities: DayActivity[];
  year: number;
  month: number;
  selectedDay?: string;
  onSelectDay?: (date: string) => void;
}

const intensityColor = (minutes: number): string => {
  if (minutes === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (minutes < 30) return 'bg-green-200 dark:bg-green-900/40';
  if (minutes < 60) return 'bg-green-400 dark:bg-green-800/60';
  if (minutes < 120) return 'bg-green-600 dark:bg-green-700';
  return 'bg-green-800 dark:bg-green-600';
};

export function CalendarHeatmap({
  activities,
  year,
  month,
  selectedDay,
  onSelectDay,
}: CalendarHeatmapProps): React.ReactElement {
  const activityMap = new Map(activities.map((a) => [a.date, a]));

  // Get first day of month and number of days
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
  const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 capitalize">
        {monthName} {year}
      </h3>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 h-6 flex items-center justify-center">
            {label}
          </div>
        ))}

        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const activity = activityMap.get(dateStr);
          const isSelected = selectedDay === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay?.(dateStr)}
              className={`
                w-full aspect-square rounded text-xs font-semibold flex items-center justify-center
                transition-all border-2
                ${isSelected ? 'border-blue-500' : 'border-transparent'}
                ${intensityColor(activity?.totalMinutes || 0)}
              `}
              title={activity ? `${activity.totalMinutes}m (${activity.sessions} sesiones)` : 'Sin actividad'}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-gray-600 dark:text-gray-400">Intensidad:</span>
        <div className="flex gap-1 ml-auto">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" title="0m" />
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/40" title="1-30m" />
          <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-800/60" title="30-60m" />
          <div className="w-3 h-3 rounded bg-green-600 dark:bg-green-700" title="60-120m" />
          <div className="w-3 h-3 rounded bg-green-800 dark:bg-green-600" title="120m+" />
        </div>
      </div>
    </div>
  );
}
