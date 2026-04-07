'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SessionCard } from '@/components/practice/SessionCard';

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sessionCount: number;
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

interface CategoryStats {
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  recentSessions: Session[];
  lastSessionDate?: string;
}

export default function CategoryDetailPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, sessRes] = await Promise.all([
          fetch(`/api/practices/categories/${categoryId}`),
          fetch(`/api/practices/sessions?categoryId=${categoryId}&limit=100`),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategory(catData);
        }

        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSessions(sessData.data || []);

          // Calculate stats
          const totalMinutes = sessData.data.reduce(
            (sum: number, s: Session) => sum + s.durationMinutes,
            0,
          );

          setStats({
            totalSessions: sessData.data.length,
            totalMinutes,
            averageDuration: sessData.data.length > 0 ? Math.round(totalMinutes / sessData.data.length) : 0,
            recentSessions: sessData.data.slice(0, 10),
            lastSessionDate: sessData.data[0]?.createdAt,
          });
        }
      } catch (error) {
        console.error('Error loading category data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [categoryId]);

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

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Categoría no encontrada</p>
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: category.color }}
            >
              {category.icon}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Category Info */}
        {category.description && (
          <Card className="p-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm">{category.description}</p>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <Card>
            <div className="grid grid-cols-3 gap-4 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalMinutes}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Minutos totales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSessions}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sesiones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageDuration}m
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Promedio</p>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Sessions */}
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white">Sesiones recientes</h3>
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
                Sin sesiones registradas
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
