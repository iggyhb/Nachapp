'use client';

import { MessageSquare } from 'lucide-react';

interface EmptyChatProps {
  onSuggestClick: (text: string) => void;
}

export function EmptyChat({ onSuggestClick }: EmptyChatProps): React.ReactElement {
  const suggestions = [
    '¿Qué leo hoy?',
    'Resumen de mis prácticas',
    'Ficha litúrgica del día',
    '¿Qué debería hacer hoy?',
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          ¿En qué puedo ayudarte hoy?
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Puedo ayudarte con tu lectura, prácticas, liturgia y más
        </p>

        {/* Suggestions */}
        <div className="flex flex-col gap-3 sm:flex-wrap sm:flex-row sm:justify-center">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestClick(suggestion)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
