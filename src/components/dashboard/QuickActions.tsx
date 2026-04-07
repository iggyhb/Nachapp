import Link from 'next/link';
import { BookOpen, Zap, MessageCircle, Calendar } from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const actions: QuickAction[] = [
  {
    label: 'Lectura de hoy',
    href: '/reading',
    icon: BookOpen,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Practicar',
    href: '/practices',
    icon: Zap,
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  },
  {
    label: 'Preguntar',
    href: '/chat',
    icon: MessageCircle,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    label: 'Liturgia',
    href: '/liturgy',
    icon: Calendar,
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  },
];

export function QuickActions(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-transform hover:scale-105 ${action.color}`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs md:text-sm font-medium text-center">
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
