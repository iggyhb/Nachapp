'use client';

interface CalendarDay {
  date: string;
  hasEntry: boolean;
  status?: string;
  season?: string;
  color?: string;
  feastName?: string;
}

interface LiturgicalCalendarProps {
  year: number;
  month: number;
  entries: CalendarDay[];
  onDayClick?: (date: string) => void;
}

export function LiturgicalCalendar({
  year,
  month,
  entries,
  onDayClick,
}: LiturgicalCalendarProps) {
  const getDayBackgroundColor = (color?: string) => {
    const colors: Record<string, string> = {
      verde: 'bg-green-500/10',
      morado: 'bg-purple-500/10',
      blanco: 'bg-slate-300/10',
      rojo: 'bg-red-500/10',
      rosa: 'bg-pink-500/10',
    };
    return colors[color || 'verde'] || 'bg-green-500/10';
  };

  const getDotColor = (color?: string) => {
    const colors: Record<string, string> = {
      verde: 'bg-green-500',
      morado: 'bg-purple-500',
      blanco: 'bg-slate-300',
      rojo: 'bg-red-500',
      rosa: 'bg-pink-500',
    };
    return colors[color || 'verde'] || 'bg-green-500';
  };

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build calendar grid
  const calendarDays: (CalendarDay | null)[] = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push(null); // placeholder
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = entries.find((e) => e.date === dateStr);
    calendarDays.push(
      entry || {
        date: dateStr,
        hasEntry: false,
      }
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const dayNum = parseInt(day.date.split('-')[2], 10);

          return (
            <button
              key={day.date}
              onClick={() => onDayClick?.(day.date)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg
                text-xs font-medium transition-colors cursor-pointer
                ${getDayBackgroundColor(day.color)}
                hover:bg-gray-600
              `}
            >
              <span>{dayNum}</span>
              {day.hasEntry && (
                <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(day.color)} mt-0.5`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs pt-3 border-t border-gray-700">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-400">Ordinario</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-gray-400">Adviento/Cuaresma</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-400">Pentecostés</span>
        </div>
      </div>
    </div>
  );
}
