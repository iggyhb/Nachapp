'use client';

interface CategoryButtonProps {
  id: string;
  name: string;
  color: string;
  icon: string;
  todayMinutes?: number;
  onClick?: () => void;
}

export function CategoryButton({
  name,
  color,
  icon,
  todayMinutes = 0,
  onClick,
}: CategoryButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg transition-transform active:scale-95 min-h-[80px]"
      style={{
        backgroundColor: color,
      }}
      aria-label={`${name} - ${todayMinutes} minutos hoy`}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
        <span className="text-3xl">{icon}</span>
      </div>
      <span className="text-xs font-semibold text-white text-center">{name}</span>
      {todayMinutes > 0 && (
        <span className="text-xs bg-white/30 text-white px-2 py-1 rounded-full">
          {todayMinutes}m
        </span>
      )}
    </button>
  );
}
