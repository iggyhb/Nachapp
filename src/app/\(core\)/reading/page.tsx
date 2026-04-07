'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { TodayReadingCard } from '@/components/reading/TodayReadingCard';
import { PlanCard } from '@/components/reading/PlanCard';
import { Plus, BookOpen, ChevronRight } from 'lucide-react';

interface TodayReading {
  bookTitle: string;
  planId: string;
  bookId: string;
  targetUnits: number;
  completedUnits: number;
  remainingUnits: number;
  mode: string;
  unitLabel: string;
  isComplete: boolean;
  percentToday: number;
}

interface Plan {
  id: string;
  bookId: string;
  title: string;
  author?: string;
  coverUrl?: string;
  completedUnits: number;
  totalUnits: number;
  planStatus: string;
  dailyTarget: number;
  targetDate: string;
  startDate: string;
  calculationMode: string;
  daysTotal: number;
  daysElapsed: number;
}

interface PlanWithBook extends Plan {
  book?: {
    title: string;
    author?: string;
    coverUrl?: string;
  };
}

export default function ReadingPage(): React.ReactElement {
  const [todayReadings, setTodayReadings] = useState<TodayReading[]>([]);
  const [activePlans, setActivePlans] = useState<PlanWithBook[]>([]);
  const [completedPlans, setCompletedPlans] = useState<PlanWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandCompleted, setExpandCompleted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch today's readings
        const todayRes = await fetch('/api/reading-plans/today');
        if (!todayRes.ok) throw new Error('Failed to fetch today readings');
        const todayData = await todayRes.json();
        setTodayReadings(todayData.readings || []);

        // Fetch all plans
        const plansRes = await fetch('/api/reading-plans?limit=100');
        if (!plansRes.ok) throw new Error('Failed to fetch plans');
        const plansData = await plansRes.json();

        const plans: PlanWithBook[] = (plansData.plans || []).map((p: any) => ({
          ...p,
          title: p.book?.title || 'Unknown',
          author: p.book?.author,
          coverUrl: p.book?.coverUrl,
        }));

        // Separate active and completed
        const active = plans.filter((p) => p.planStatus === 'active' || p.planStatus === 'paused');
        const completed = plans.filter(
          (p) => p.planStatus === 'completed' || p.planStatus === 'abandoned',
        );

        setActivePlans(active);
        setCompletedPlans(completed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Planificador de lectura
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mantén el control de tu progreso
            </p>
          </div>
          <Link
            href="/reading/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Crear plan</span>
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando planes...</p>
          </div>
        )}

        {/* Today's Reading Section */}
        {!loading && todayReadings.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Lectura de hoy
            </h2>
            <div className="space-y-3">
              {todayReadings.map((reading) => (
                <TodayReadingCard
                  key={reading.planId}
                  planId={reading.planId}
                  bookTitle={reading.bookTitle}
                  targetUnits={reading.targetUnits}
                  completedUnits={reading.completedUnits}
                  mode={reading.mode}
                  unitLabel={reading.unitLabel}
                  isComplete={reading.isComplete}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Active Plans Section */}
        {!loading && activePlans.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Planes activos
            </h2>
            <div className="space-y-3">
              {activePlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </Card>
        )}

        {/* Completed Plans Section */}
        {!loading && completedPlans.length > 0 && (
          <Card>
            <button
              onClick={() => setExpandCompleted(!expandCompleted)}
              className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
            >
              <span>Planes completados / abandonados</span>
              <ChevronRight
                className={`w-5 h-5 transition-transform ${
                  expandCompleted ? 'rotate-90' : ''
                }`}
              />
            </button>
            {expandCompleted && (
              <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                {completedPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Empty State */}
        {!loading && activePlans.length === 0 && todayReadings.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Sin planes de lectura
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Crea tu primer plan para comenzar a leer de forma planificada
              </p>
              <Link
                href="/reading/new"
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear plan
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
