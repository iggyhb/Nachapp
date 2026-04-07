'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Zap,
  MessageCircle,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home },
  { label: 'Biblioteca', href: '/library', icon: BookOpen },
  { label: 'Prácticas', href: '/practice', icon: Zap },
  { label: 'Liturgia', href: '/liturgy', icon: BookOpen },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
];

export function BottomNav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav className="fixed md:hidden bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
