'use client';

import { Lightbulb } from 'lucide-react';

interface ReflectionDisplayProps {
  summary?: string;
  reflection?: string;
  practicalPoint?: string;
  status?: string;
}

export function ReflectionDisplay({
  summary,
  reflection,
  practicalPoint,
  status,
}: ReflectionDisplayProps) {
  if (status === 'generating') {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-700 rounded-lg"></div>
        <div className="h-40 bg-gray-700 rounded-lg"></div>
        <div className="h-16 bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-600 rounded-lg p-4">
          <p className="text-sm text-blue-200 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Reflection */}
      {reflection && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-line font-serif">
            {reflection}
          </p>
          <p className="text-xs text-gray-500 mt-3">Generado por IA</p>
        </div>
      )}

      {/* Practical Point */}
      {practicalPoint && (
        <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-600 rounded-lg p-4 flex gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
              Punto Práctico
            </p>
            <p className="text-sm text-amber-100 mt-1">{practicalPoint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
