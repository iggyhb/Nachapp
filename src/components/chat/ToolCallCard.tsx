'use client';

import { useState } from 'react';
import { ChevronDown, Wrench, CheckCircle, AlertCircle } from 'lucide-react';

interface ToolCallCardProps {
  toolName: string;
  status: 'success' | 'error' | 'pending';
  result?: Record<string, unknown>;
  input?: Record<string, unknown>;
}

export function ToolCallCard({
  toolName,
  status,
  result,
  input,
}: ToolCallCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'pending':
        return <Wrench className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'pending':
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'success':
        return 'Exitoso';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Procesando';
    }
  };

  return (
    <div className={`rounded-lg p-3 mb-3 ${getStatusColor()}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 justify-between hover:opacity-75 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {toolName}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              {getStatusLabel()}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
          {input && (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entrada:
              </p>
              <pre className="text-xs bg-gray-200 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}

          {result && (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resultado:
              </p>
              <pre className="text-xs bg-gray-200 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
