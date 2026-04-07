'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { PlanCalculationPreview } from '@/components/reading/PlanCalculationPreview';
import { BookOpen, ChevronLeft, AlertTriangle } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  totalPages?: number;
  totalWords?: number;
  totalChapters?: number;
}

interface PlanCalculation {
  dailyTarget: number;
  daysTotal: number;
  effectiveDays: number;
  isViable: boolean;
  warnings: string[];
}

type Mode = 'pages_per_day' | 'words_per_day' | 'chapters_per_day';
type Step = 'select-book' | 'configure' | 'confirm';

export default function NewPlanPage(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select-book');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [mode, setMode] = useState<Mode>('pages_per_day');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [targetDate, setTargetDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [calculation, setCalculation] = useState<PlanCalculation | null>(null);

  // Fetch books on mount
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/ebooks?limit=100');
        if (!res.ok) throw new Error('Failed to fetch books');
        const data = await res.json();
        // Filter books with required metadata
        const validBooks = (data.books || []).filter((b: Book) => {
          if (mode === 'pages_per_day') return b.totalPages;
          if (mode === 'words_per_day') return b.totalWords;
          if (mode === 'chapters_per_day') return b.totalChapters;
          return false;
        });
        setBooks(validBooks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [mode]);

  // Calculate plan when dates or mode change
  useEffect(() => {
    if (!selectedBook || !startDate || !targetDate) {
      setCalculation(null);
      return;
    }

    const getTotalUnits = (): number => {
      if (mode === 'pages_per_day') return selectedBook.totalPages || 0;
      if (mode === 'words_per_day') return selectedBook.totalWords || 0;
      if (mode === 'chapters_per_day') return selectedBook.totalChapters || 0;
      return 0;
    };

    const totalUnits = getTotalUnits();
    if (!totalUnits) return;

    // Simple calculation (matching the backend logic)
    const start = new Date(startDate);
    const target = new Date(targetDate);
    const daysTotal = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysTotal < 1) {
      setCalculation(null);
      return;
    }

    let effectiveDays = daysTotal;
    if (skipWeekends) {
      let current = new Date(start);
      effectiveDays = 0;
      while (current <= target) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          effectiveDays++;
        }
        current.setDate(current.getDate() + 1);
      }
    }

    const dailyTarget = Math.ceil(totalUnits / Math.max(1, effectiveDays));
    const warnings: string[] = [];

    if (dailyTarget < 1) {
      warnings.push('Meta diaria debe ser al menos 1 unidad');
    }

    const thresholds = {
      pages_per_day: 50,
      words_per_day: 15000,
      chapters_per_day: 5,
    };

    if (dailyTarget > thresholds[mode]) {
      warnings.push(`Meta diaria alta: ${dailyTarget} unidades por día`);
    }

    setCalculation({
      dailyTarget,
      daysTotal,
      effectiveDays,
      isViable: dailyTarget >= 1,
      warnings,
    });
  }, [selectedBook, mode, startDate, targetDate, skipWeekends]);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setStep('configure');
  };

  const handleCreatePlan = async () => {
    if (!selectedBook || !calculation?.isViable) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/reading-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook.id,
          startDate: new Date(startDate),
          targetDate: new Date(targetDate),
          mode,
          skipWeekends,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create plan');
      }

      router.push('/reading');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select Book
  if (step === 'select-book') {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Nuevo plan de lectura
            </h1>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando libros...</p>
            </div>
          ) : books.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sin libros disponibles
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Sube un libro a tu biblioteca primero
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {books.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleSelectBook(book)}
                    className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {book.author || 'Autor desconocido'}
                    </p>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                      {book.totalPages && <p>{book.totalPages} páginas</p>}
                      {book.totalWords && <p>{book.totalWords} palabras</p>}
                      {book.totalChapters && <p>{book.totalChapters} capítulos</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2 & 3: Configure and Confirm
  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep('select-book')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configurar plan
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Selected Book */}
        <Card className="mb-6">
          <div className="flex gap-4">
            {selectedBook?.coverUrl && (
              <img
                src={selectedBook.coverUrl}
                alt={selectedBook.title}
                className="w-20 h-28 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {selectedBook?.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedBook?.author}
              </p>
              <button
                onClick={() => setStep('select-book')}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Cambiar libro
              </button>
            </div>
          </div>
        </Card>

        {/* Mode Selection */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Unidad de medida
          </h2>
          <div className="space-y-2">
            {[
              { value: 'pages_per_day' as const, label: 'Páginas por día', available: !!selectedBook?.totalPages },
              { value: 'words_per_day' as const, label: 'Palabras por día', available: !!selectedBook?.totalWords },
              { value: 'chapters_per_day' as const, label: 'Capítulos por día', available: !!selectedBook?.totalChapters },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  mode === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${
                  !option.available
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={(e) => setMode(e.target.value as Mode)}
                  disabled={!option.available}
                  className="w-4 h-4"
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
                {!option.available && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    No disponible
                  </span>
                )}
              </label>
            ))}
          </div>
        </Card>

        {/* Date Selection */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Fechas
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha objetivo
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Options */}
        <Card className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="font-medium text-gray-900 dark:text-white">
              Saltar fines de semana
            </span>
          </label>
        </Card>

        {/* Preview */}
        {calculation && (
          <Card className="mb-6">
            <PlanCalculationPreview
              dailyTarget={calculation.dailyTarget}
              daysTotal={calculation.daysTotal}
              effectiveDays={calculation.effectiveDays}
              isViable={calculation.isViable}
              warnings={calculation.warnings}
              mode={mode}
            />
          </Card>
        )}

        {/* Warnings */}
        {calculation?.warnings.length ? (
          <Card className="mb-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {calculation.warnings.map((warning, i) => (
                  <p key={i} className="text-sm text-yellow-800 dark:text-yellow-200">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep('select-book')}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Atrás
          </button>
          <button
            onClick={handleCreatePlan}
            disabled={loading || !calculation?.isViable}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Creando...' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
