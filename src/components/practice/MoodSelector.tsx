'use client';

interface MoodSelectorProps {
  value?: string;
  onChange: (mood: string) => void;
}

const moods = [
  { emoji: '😊', label: 'Genial', value: 'great' },
  { emoji: '😃', label: 'Bien', value: 'good' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😴', label: 'Cansado', value: 'tired' },
  { emoji: '😤', label: 'Frustrado', value: 'frustrated' },
];

export function MoodSelector({ value, onChange }: MoodSelectorProps): React.ReactElement {
  return (
    <div className="flex gap-2 justify-center">
      {moods.map((mood) => (
        <button
          key={mood.value}
          onClick={() => onChange(mood.value)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
            value === mood.value
              ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={mood.label}
        >
          <span className="text-2xl">{mood.emoji}</span>
          <span className="text-xs font-medium">{mood.label}</span>
        </button>
      ))}
    </div>
  );
}
