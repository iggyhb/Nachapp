'use client';

import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop) */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />
    </div>
  );
}
