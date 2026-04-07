'use client';

import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';

interface ReadingCardProps {
  type: 'first' | 'psalm' | 'second' | 'gospel';
  reference: string;
  title: string;
  text: string;
}

const typeConfig = {
  first: { icon: BookOpen, label: 'Primera Lectura', color: 'blue' },
  psalm: { icon: BookOpen, label: 'Salmo', color: 'purple' },
  second: { icon: BookOpen, label: 'Segunda Lectura', color: 'indigo' },
  gospel: { icon: BookOpen, label: 'Evangelio', color: 'amber' },
};

export function ReadingCard({ type, reference, title, text }: ReadingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[type];
  const Icon = config.icon;

  const colorClasses = {
    blue: 'bg-blue-900/20 border-blue-600 hover:bg-blue-900/30',
    purple: 'bg-purple-900/20 border-purple-600 hover:bg-purple-900/30',
    indigo: 'bg-indigo-900/20 border-indigo-600 hover:bg-indigo-900/30',
    amber: 'bg-amber-900/20 border-amber-600 hover:bg-amber-900/30',
  };

  const textColorClasses = {
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    indigo: 'text-indigo-300',
    amber: 'text-amber-300',
  };

  const formatText = (content: string) => {
    if (type === 'psalm') {
      // Format psalm verses with alternating indentation
      return content.split('\n').map((line, i) => (
        <div key={i} className={i % 2 === 0 ? '' : 'ml-8'}>
          {line}
        </div>
      ));
    }
    return content;
  };

  return (
    <div className={`border rounded-lg p-4 cursor-pointer transition ${colorClasses[config.color as keyof typeof colorClasses]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 text-left"
      >
        <Icon className={`w-5 h-5 ${textColorClasses[config.color as keyof typeof textColorClasses]} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${textColorClasses[config.color as keyof typeof textColorClasses]}`}>
            {config.label}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{reference}</p>
          {!expanded && title && (
            <p className="text-sm text-gray-300 mt-1 line-clamp-1">{title}</p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform mt-0.5 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-4 pl-8 space-y-3">
          {title && (
            <div>
              <p className="text-sm font-semibold text-gray-200">{title}</p>
            </div>
          )}
          <div className="text-sm leading-relaxed text-gray-300 space-y-2">
            {formatText(text)}
          </div>
        </div>
      )}
    </div>
  );
}
