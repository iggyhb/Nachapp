'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ChatThreadList } from '@/components/chat/ChatThreadList';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import type { ChatThread, ChatMessage } from '@/lib/chat/types';

export default function ThreadPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const threadId = params.threadId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Load thread on mount
  useEffect(() => {
    if (threadId) {
      loadThreadMessages(threadId);
    }
  }, [threadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadThreadMessages = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/threads/${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar el chat');
      }
      const data = await response.json();
      setCurrentThread(data.thread);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading thread:', error);
      router.push('/chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error('Error al crear el chat');
      }
      const thread = await response.json();
      router.push(`/chat/${thread.id}`);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const handleSelectThread = (id: string) => {
    router.push(`/chat/${id}`);
    setSidebarOpen(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentThread) return;

    try {
      setIsSendingMessage(true);

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        threadId: currentThread.id,
        role: 'user',
        content,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Send message to API
      const response = await fetch(
        `/api/chat/threads/${currentThread.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }

      // Simulate assistant response
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        threadId: currentThread.id,
        role: 'assistant',
        content: 'Entendido. Estoy procesando tu solicitud...',
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        threadId: currentThread?.id || '',
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu mensaje. Intenta de nuevo.',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="animate-spin mb-2 mx-auto w-fit">
            <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-50 dark:bg-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 z-50 md:relative md:z-auto md:translate-x-0 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ top: '64px', height: 'calc(100vh - 64px - 80px)' }}
      >
        <ChatThreadList
          onNewChat={handleNewChat}
          onSelectThread={handleSelectThread}
          activeThreadId={currentThread?.id}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {currentThread?.title || 'Sin título'}
            </h1>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">No hay mensajes aún</p>
              </div>
            ) : (
              messages.filter(m => m.role !== 'system').map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  role={message.role as 'user' | 'assistant' | 'tool'}
                  content={message.content}
                  timestamp={message.createdAt}
                  isLoading={isSendingMessage && message === messages[messages.length - 1] && message.role === 'assistant'}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isSendingMessage}
          placeholder="Escribe un mensaje..."
        />
      </div>
    </div>
  );
}
