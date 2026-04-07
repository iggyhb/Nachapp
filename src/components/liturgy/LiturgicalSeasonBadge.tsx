'use client';

interface LiturgicalSeasonBadgeProps {
  season?: string;
  color?: string;
}

const seasonConfig: Record<string, { label: string; dotColor: string }> = {
  ordinario: { label: 'Tiempo Ordinario', dotColor: 'bg-green-500' },
  adviento: { label: 'Adviento', dotColor: 'bg-purple-500' },
  navidad: { label: 'Navidad', dotColor: 'bg-amber-300' },
  cuaresma: { label: 'Cuaresma', dotColor: 'bg-purple-600' },
  pascua: { label: 'Pascua', dotColor: 'bg-amber-100' },
  pentecostes: { label: 'Pentecostés', dotColor: 'bg-red-500' },
};

const colorConfig: Record<string, string> = {
  verde: 'bg-green-500',
  morado: 'bg-purple-500',
  blanco: 'bg-amber-100',
  rojo: 'bg-red-500',
  rosa: 'bg-pink-500',
};

export function LiturgicalSeasonBadge({
  season,
  color,
}: LiturgicalSeasonBadgeProps) {
  const config = seasonConfig[season || 'ordinario'];
  const dotColor = colorConfig[color || 'verde'] || colorConfig.verde;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-xs font-medium text-gray-300">{config.label}</span>
    </div>
  );
}
