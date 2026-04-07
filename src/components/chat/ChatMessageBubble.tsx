'use client';

import { Bot, User } from 'lucide-react';

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: Date;
  isLoading?: boolean;
}

export function ChatMessageBubble({
  role,
  content,
  timestamp,
  isLoading = false,
}: ChatMessageBubbleProps): React.ReactElement {
  const isUser = role === 'user';

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div
      className={`flex gap-2 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
        </div>
      )}

      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'order-2' : ''}`}
      >
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 dark:bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
          }`}
        >
          {isLoading ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <p
            className={`text-xs mt-1 ${
              isUser
                ? 'text-right text-gray-500 dark:text-gray-400'
                : 'text-left text-gray-500 dark:text-gray-400'
            }`}
          >
            {formatTime(timestamp)}
          </p>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 order-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
