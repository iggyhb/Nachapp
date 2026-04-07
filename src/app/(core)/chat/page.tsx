'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { ChatThreadList } from '@/components/chat/ChatThreadList';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyChat } from '@/components/chat/EmptyChat';
import type { ChatThread, ChatMessage } from '@/lib/chat/types';

export default function ChatPage(): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

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

  const loadThreadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat/threads/${threadId}`);
      if (!response.ok) {
        throw new Error('Error al cargar el chat');
      }
      const data = await response.json();
      setCurrentThread(data.thread);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading thread:', error);
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
      setCurrentThread(thread);
      setMessages([]);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const handleSelectThread = (threadId: string) => {
    loadThreadMessages(threadId);
    setSidebarOpen(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentThread) {
      handleNewChat();
      return;
    }

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

      // Simulate assistant response (in real app, would come from AI backend)
      // This is where you'd integrate with your AI provider
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
      // Show error message to user
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

  const handleSuggestClick = (suggestion: string) => {
    if (!currentThread) {
      handleNewChat();
    }
    setTimeout(() => handleSendMessage(suggestion), 100);
  };

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

          <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white px-2">
            {currentThread?.title || 'Nuevo chat'}
          </h1>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-4">
          {!currentThread || messages.length === 0 ? (
            <EmptyChat onSuggestClick={handleSuggestClick} />
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.filter(m => m.role !== 'system').map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  role={message.role as 'user' | 'assistant' | 'tool'}
                  content={message.content}
                  timestamp={message.createdAt}
                  isLoading={isSendingMessage && message === messages[messages.length - 1] && message.role === 'assistant'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentThread && (
          <ChatInput
            onSend={handleSendMessage}
            disabled={isSendingMessage}
            placeholder="Escribe un mensaje..."
          />
        )}
      </div>
    </div>
  );
}
