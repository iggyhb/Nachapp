'use client';

import { Quote } from 'lucide-react';

interface CitationBlockProps {
  sourceType: string;
  author?: string;
  work?: string;
  citationRef?: string;
  excerpt: string;
  sourceUrl?: string;
}

const sourceTypeLabels: Record<string, { label: string; color: string }> = {
  patristic: { label: 'Patrística', color: 'bg-purple-600/20 border-purple-600 text-purple-300' },
  magisterium: { label: 'Magisterio', color: 'bg-red-600/20 border-red-600 text-red-300' },
  catechism: { label: 'Catecismo', color: 'bg-blue-600/20 border-blue-600 text-blue-300' },
  scripture: { label: 'Escritura', color: 'bg-green-600/20 border-green-600 text-green-300' },
  commentary: { label: 'Comentario', color: 'bg-gray-600/20 border-gray-600 text-gray-300' },
};

export function CitationBlock({
  sourceType,
  author,
  work,
  citationRef,
  excerpt,
  sourceUrl,
}: CitationBlockProps) {
  const sourceConfig = sourceTypeLabels[sourceType] || sourceTypeLabels.commentary;

  return (
    <div className={`border rounded-lg p-4 ${sourceConfig.color}`}>
      <div className="flex gap-3">
        <Quote className="w-4 h-4 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              {author && <p className="text-sm font-semibold text-gray-200">{author}</p>}
              {work && (
                <p className="text-xs text-gray-400">
                  <em>{work}</em>
                  {citationRef && `, ${citationRef}`}
                </p>
              )}
            </div>
            <span className="text-xs px-2 py-1 rounded bg-current/10 whitespace-nowrap">
              {sourceConfig.label}
            </span>
          </div>
          <p className="text-sm text-gray-300 italic">{excerpt}</p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-2 text-blue-400 hover:text-blue-300 underline"
            >
              Ver fuente
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
