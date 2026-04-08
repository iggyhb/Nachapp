'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryButton } from '@/components/practice/CategoryButton';
import { QuickLogModal } from '@/components/practice/QuickLogModal';
import { StreakDisplay } from '@/components/practice/StreakDisplay';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sessionCount: number;
  todayMinutes: number;
}

interface Exercise {
  id: string;
  name: string;
  categoryId: string;
}

interface StatsData {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  totalMinutes: number;
  totalSessions: number;
  totalCategories: number;
  weekSummary: WeekData | null;
  categoryStats: unknown[];
  topCategories: unknown[];
  monthlyTrend: unknown[];
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  totalSessions: number;
  daysActive: number;
  categoriesUsed: string[];
  averageSessionMinutes: number;
  comparedToPreviousWeek: {
    minutesDiff: number;
    sessionsDiff: number;
    trend: 'up' | 'down' | 'stable';
  } | null;
}

export default function PracticePage(): React.ReactElement {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, exRes, statsRes, weekRes] = await Promise.all([
          fetch('/api/practices/categories'),
          fetch('/api/practices/exercises'),
          fetch('/api/practices/stats?type=dashboard'),
          fetch('/api/practices/stats?type=weekly'),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data || []);
        }

        if (exRes.ok) {
          const exData = await exRes.json();
          setExercises(exData.data || []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (weekRes.ok) {
          const weekDataRes = await weekRes.json();
          setWeekData(weekDataRes);
        }
      } catch (error) {
        console.error('Error loading practice data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuickLog = async () => {
    // Refresh data after logging
    const res = await fetch('/api/practices/stats?type=dashboard');
    if (res.ok) {
      const statsData = await res.json();
      setStats(statsData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const trend = weekData?.comparedToPreviousWeek?.trend;
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prácticas</h1>
          <button
            onClick={() => router.push('/practice/manage')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Gestionar categorías"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Log Hero Section */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Registrar sesión en 15 segundos</p>
          <div className="grid grid-cols-3 gap-3">
            {categories.slice(0, 6).map((cat) => (
              <CategoryButton
                key={cat.id}
                id={cat.id}
                name={cat.name}
                color={cat.color}
                icon={cat.icon}
                todayMinutes={cat.todayMinutes}
                onClick={() => {
                  setSelectedCategory(cat);
                  setShowModal(true);
                }}
              />
            ))}
            {categories.length > 6 && (
              <button
                onClick={() => router.push('/practice/manage')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[80px]"
              >
                <span className="text-2xl">➕</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Más</span>
              </button>
            )}
          </div>
        </Card>

        {/* Streak Display */}
        {stats && (
          <StreakDisplay
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
            isActiveToday={stats.isActiveToday}
          />
        )}

        {/* Weekly Summary */}
        {weekData && (
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Semana: {weekData.totalMinutes} minutos
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {weekData.totalSessions} sesiones • {weekData.daysActive} días
              </p>
            </div>
            <div className="p-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Media: {weekData.averageSessionMinutes}m por sesión</span>
                <span>{weekData.categoriesUsed.length} categorías</span>
              </div>
              {weekData.comparedToPreviousWeek && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    {trendIcon} {trend === 'up' ? 'Mejora' : trend === 'down' ? 'Reducción' : 'Similar'} vs semana anterior:{' '}
                    <span className={weekData.comparedToPreviousWeek.minutesDiff > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                      {Math.abs(weekData.comparedToPreviousWeek.minutesDiff)}m
                    </span>
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Quick Log Modal */}
      {showModal && selectedCategory && (
        <QuickLogModal
          category={selectedCategory}
          exercises={exercises}
          onClose={() => setShowModal(false)}
          onSuccess={handleQuickLog}
        />
      )}
    </div>
  );
}
