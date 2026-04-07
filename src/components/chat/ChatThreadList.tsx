'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { ChatThread } from '@/lib/chat/types';

interface ChatThreadListProps {
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  activeThreadId?: string;
}

export function ChatThreadList({
  onNewChat,
  onSelectThread,
  activeThreadId,
}: ChatThreadListProps): React.ReactElement {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/chat/threads?limit=50&order=desc&sortBy=lastMessageAt');
      if (!response.ok) {
        throw new Error('Error al cargar los chats');
      }
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('Error loading threads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
      try {
        const response = await fetch(`/api/chat/threads/${threadId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setThreads(threads.filter((t) => t.id !== threadId));
        }
      } catch (err) {
        console.error('Error deleting thread:', err);
      }
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo chat
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin mb-2">
                <div className="w-6 h-6 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 p-4">
            <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay chats aún</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-colors group ${
                  activeThreadId === thread.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {thread.title || 'Sin título'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDate(thread.lastMessageAt ?? undefined)}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      aria-label="Eliminar chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
