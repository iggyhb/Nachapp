'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { MoodSelector } from './MoodSelector';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Exercise {
  id: string;
  name: string;
  categoryId: string;
}

interface QuickLogModalProps {
  category: Category;
  exercises: Exercise[];
  onClose: () => void;
  onSuccess: () => void;
}

const quickDurations = [15, 30, 45, 60, 90, 120];
const effortOptions = [
  { label: 'Fácil', value: 'easy' },
  { label: 'Moderado', value: 'moderate' },
  { label: 'Intenso', value: 'intense' },
];

export function QuickLogModal({
  category,
  exercises,
  onClose,
  onSuccess,
}: QuickLogModalProps): React.ReactElement {
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('');
  const [effort, setEffort] = useState('');
  const [expandNotes, setExpandNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const categoryExercises = exercises.filter((e) => e.categoryId === category.id);
  const finalDuration = customDuration ? parseInt(customDuration, 10) : duration;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const today = new Date().toISOString().split('T')[0];

      const response = await fetch('/api/practices/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: category.id,
          exerciseId: exerciseId || undefined,
          sessionDate: today,
          durationMinutes: finalDuration,
          notes: notes || undefined,
          mood: mood || undefined,
          effort: effort || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Error logging session');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error logging session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-lg w-full md:max-w-md max-h-[90vh] overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Registrar sesión</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category badge */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: category.color + '20' }}
          >
            <span className="text-3xl">{category.icon}</span>
            <p className="font-semibold text-gray-900 dark:text-white">{category.name}</p>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              Duración
            </label>
            <div className="flex gap-2 flex-wrap">
              {quickDurations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDuration(d);
                    setCustomDuration('');
                  }}
                  className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    duration === d && !customDuration
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>

            <div className="mt-2">
              <input
                type="number"
                min="1"
                max="720"
                placeholder="Custom (minutos)"
                value={customDuration}
                onChange={(e) => {
                  setCustomDuration(e.target.value);
                  if (e.target.value) setDuration(0);
                }}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Exercise */}
          {categoryExercises.length > 0 && (
            <div>
              <label htmlFor="exercise" className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                Ejercicio (opcional)
              </label>
              <select
                id="exercise"
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm"
              >
                <option value="">Seleccionar ejercicio...</option>
                {categoryExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mood */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              Ánimo (opcional)
            </label>
            <MoodSelector value={mood} onChange={setMood} />
          </div>

          {/* Effort */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              Esfuerzo (opcional)
            </label>
            <div className="flex gap-2">
              {effortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEffort(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    effort === opt.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <button
              type="button"
              onClick={() => setExpandNotes(!expandNotes)}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2"
            >
              {expandNotes ? '▼' : '▶'} Notas (opcional)
            </button>
            {expandNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega notas sobre esta sesión..."
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm resize-none h-20"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors mt-4"
          >
            {isLoading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
