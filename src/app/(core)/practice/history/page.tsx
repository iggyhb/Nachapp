'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CalendarHeatmap } from '@/components/practice/CalendarHeatmap';
import { SessionCard } from '@/components/practice/SessionCard';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface DayActivity {
  date: string;
  sessions: number;
  totalMinutes: number;
  categories: string[];
  hasActivity: boolean;
}

interface Session {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  durationMinutes: number;
  mood?: string;
  effort?: string;
  notes?: string;
  createdAt: Date;
}

export default function HistoryPage(): React.ReactElement {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<DayActivity[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, heatRes] = await Promise.all([
          fetch('/api/practices/categories'),
          fetch(`/api/practices/stats?type=heatmap&month=${year}-${String(month).padStart(2, '0')}`),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data || []);
        }

        if (heatRes.ok) {
          const heatData = await heatRes.json();
          setActivities(heatData.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [month, year]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!selectedDay) {
        setSessions([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/practices/sessions?startDate=${selectedDay}&endDate=${selectedDay}&limit=100${
            selectedCategory ? `&categoryId=${selectedCategory}` : ''
          }`,
        );

        if (res.ok) {
          const data = await res.json();
          setSessions(data.data || []);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    };

    fetchSessions();
  }, [selectedDay, selectedCategory]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('¿Eliminar esta sesión?')) return;

    try {
      const res = await fetch(`/api/practices/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const monthStats = activities.reduce(
    (acc, a) => {
      acc.totalMinutes += a.totalMinutes;
      acc.totalSessions += a.sessions;
      acc.daysActive += a.hasActivity ? 1 : 0;
      return acc;
    },
    { totalMinutes: 0, totalSessions: 0, daysActive: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Heatmap */}
        <Card>
          <div className="p-4">
            <CalendarHeatmap
              activities={activities}
              year={year}
              month={month}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            {/* Month stats */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {monthStats.totalMinutes}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Minutos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {monthStats.totalSessions}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sesiones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {monthStats.daysActive}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Días activos</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {new Date(year, month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        {selectedDay && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: cat.color }
                    : undefined
                }
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Sessions List */}
        {selectedDay && (
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {new Date(selectedDay).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
            </div>
            <div className="p-4">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    id={session.id}
                    categoryName={session.categoryName}
                    categoryColor={session.categoryColor}
                    categoryIcon={session.categoryIcon}
                    durationMinutes={session.durationMinutes}
                    mood={session.mood}
                    effort={session.effort}
                    notes={session.notes}
                    createdAt={session.createdAt}
                    onDelete={handleDeleteSession}
                  />
                ))
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  Sin sesiones este día
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
