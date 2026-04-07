'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/reading/ProgressRing';
import { ProgressEntry } from '@/components/reading/ProgressEntry';
import {
  ChevronLeft,
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface ProgressState {
  completedUnits: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyTargetOriginal: number;
  dailyTargetAdjusted: number;
  isOnTrack: boolean;
  isAhead: boolean;
  isBehind: boolean;
  behindByUnits: number;
  aheadByUnits: number;
  projectedCompletionDate: string;
  percentComplete: number;
  todayTarget: number;
  todayRemaining: number;
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
  book?: {
    title: string;
    author?: string;
    coverUrl?: string;
  };
}

interface PlanWithData {
  plan: Plan;
  progress: ProgressState;
  book: any;
  progressEntries: any[];
}

export default function PlanDetailPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [data, setData] = useState<PlanWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitsToday, setUnitsToday] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/reading-plans/${planId}`);
        if (!res.ok) throw new Error('Plan not found');
        const planData = await res.json();
        setData(planData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };

    if (planId) fetchPlan();
  }, [planId]);

  const handleLogProgress = async () => {
    if (!data || !unitsToday) return;

    try {
      setSubmitting(true);
      const today = new Date().toISOString().split('T')[0];

      const res = await fetch(`/api/reading-plans/${planId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(today),
          actualUnits: parseInt(unitsToday, 10),
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log progress');
      }

      // Refresh data
      const planRes = await fetch(`/api/reading-plans/${planId}`);
      const newData = await planRes.json();
      setData(newData);

      // Reset form
      setUnitsToday('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log progress');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!data) return;
    try {
      const res = await fetch(`/api/reading-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planStatus: 'paused' }),
      });
      if (!res.ok) throw new Error('Failed to pause');
      const newData = await res.json();
      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResume = async () => {
    if (!data) return;
    try {
      const res = await fetch(`/api/reading-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planStatus: 'active' }),
      });
      if (!res.ok) throw new Error('Failed to resume');
      const newData = await res.json();
      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este plan? Esta acción no se puede deshacer.')) return;

    try {
      const res = await fetch(`/api/reading-plans/${planId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/reading');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando plan...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Atrás
          </button>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">{error || 'Plan no encontrado'}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const { plan, progress, book, progressEntries } = data;
  const modeLabels: Record<string, string> = {
    pages_per_day: 'páginas',
    words_per_day: 'palabras',
    chapters_per_day: 'capítulos',
  };
  const unitLabel = modeLabels[plan.calculationMode] || 'unidades';

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
              {book?.title || plan.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {book?.author || plan.author}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Progress Dashboard */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center">
              <ProgressRing percent={progress.percentComplete} size={200} />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Progreso</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {progress.completedUnits} / {plan.totalUnits} {unitLabel}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Meta diaria</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {progress.dailyTargetAdjusted} {unitLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Días restantes</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {progress.daysRemaining}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                <div className="flex gap-2 mt-1">
                  {progress.isAhead && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      Adelantado
                    </span>
                  )}
                  {progress.isOnTrack && !progress.isAhead && !progress.isBehind && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                      <Target className="w-4 h-4" />
                      En horario
                    </span>
                  )}
                  {progress.isBehind && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                      <TrendingDown className="w-4 h-4" />
                      Atrasado
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Finalización prevista: {new Date(progress.projectedCompletionDate).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Log Progress Card */}
        {plan.planStatus === 'active' && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Registrar progreso de hoy
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)} leídas
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitsToday}
                  onChange={(e) => setUnitsToday(e.target.value)}
                  placeholder={`Ej: ${progress.todayTarget}`}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Añade notas sobre tu lectura..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <button
                onClick={handleLogProgress}
                disabled={submitting || !unitsToday}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {submitting ? 'Registrando...' : 'Registrar progreso'}
              </button>
            </div>
          </Card>
        )}

        {/* Progress History */}
        {progressEntries.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Historial de progreso
            </h2>
            <div className="space-y-2">
              {[...progressEntries].reverse().map((entry) => (
                <ProgressEntry
                  key={entry.id}
                  date={entry.progressDate}
                  target={entry.targetUnits}
                  actual={entry.actualUnits}
                  cumulative={entry.cumulativeUnits}
                  notes={entry.notes}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Acciones
          </h2>
          <div className="space-y-2">
            {plan.planStatus === 'active' && (
              <button
                onClick={handlePause}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Pause className="w-5 h-5" />
                Pausar plan
              </button>
            )}
            {plan.planStatus === 'paused' && (
              <button
                onClick={handleResume}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Play className="w-5 h-5" />
                Reanudar plan
              </button>
            )}
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar plan
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
