'use client';

import { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Escribe un mensaje...',
}: ChatInputProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 6 * 24); // Max 6 lines (24px per line)
      textarea.style.height = `${newHeight}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, unless Shift is held (allow newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText && !disabled) {
      onSend(trimmedText);
      setText('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 min-h-10 max-h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Enviar mensaje"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
