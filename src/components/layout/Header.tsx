'use client';

import { Menu, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps): React.ReactElement {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Menu button (mobile) + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
            Mi App
          </h1>
        </div>

        {/* Right: User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              U
            </div>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden z-50">
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                onClick={() => setShowDropdown(false)}
              >
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-600"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
