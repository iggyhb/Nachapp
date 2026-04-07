'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
];

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sessionCount: number;
}

interface Exercise {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  difficulty?: string;
}

export default function ManagePage(): React.ReactElement {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎯');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [editingEx, setEditingEx] = useState<string | null>(null);
  const [newExName, setNewExName] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, exRes] = await Promise.all([
          fetch('/api/practices/categories'),
          fetch('/api/practices/exercises'),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data || []);
        }

        if (exRes.ok) {
          const exData = await exRes.json();
          setExercises(exData.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/practices/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          icon: newCatIcon,
          color: newCatColor,
        }),
      });

      if (res.ok) {
        const newCat = await res.json();
        setCategories([...categories, newCat]);
        setNewCatName('');
        setNewCatIcon('🎯');
        setNewCatColor('#3b82f6');
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;

    try {
      const res = await fetch(`/api/practices/categories/${catId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== catId));
        setExercises(exercises.filter((e) => e.categoryId !== catId));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleCreateExercise = async (catId: string) => {
    if (!newExName.trim()) return;

    try {
      const res = await fetch('/api/practices/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: catId,
          name: newExName,
        }),
      });

      if (res.ok) {
        const newEx = await res.json();
        setExercises([...exercises, newEx]);
        setNewExName('');
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
    }
  };

  const handleDeleteExercise = async (exId: string) => {
    if (!confirm('¿Eliminar este ejercicio?')) return;

    try {
      const res = await fetch(`/api/practices/exercises/${exId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setExercises(exercises.filter((e) => e.id !== exId));
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const categoryExercisesMap = new Map(
    categories.map((cat) => [
      cat.id,
      exercises.filter((ex) => ex.categoryId === cat.id),
    ]),
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestionar categorías</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create Category Form */}
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5" /> Nueva categoría
            </h3>
          </div>
          <form onSubmit={handleCreateCategory} className="p-4 space-y-3">
            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm"
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Emoji/Icono"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                maxLength={1}
                className="w-16 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-center text-2xl"
              />

              <div className="flex gap-1 flex-wrap flex-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newCatColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Crear
            </button>
          </form>
        </Card>

        {/* Categories List */}
        {categories.map((cat) => {
          const isExpanded = expandedCats.has(cat.id);
          const catExercises = categoryExercisesMap.get(cat.id) || [];

          return (
            <Card key={cat.id}>
              <div
                className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => {
                  const newExp = new Set(expandedCats);
                  if (isExpanded) {
                    newExp.delete(cat.id);
                  } else {
                    newExp.add(cat.id);
                  }
                  setExpandedCats(newExp);
                }}
              >
                <GripVertical className="w-5 h-5 text-gray-400" />
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{cat.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cat.sessionCount} sesiones</p>
                </div>
                <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </div>

              {isExpanded && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                  {/* Exercises */}
                  {catExercises.length > 0 && (
                    <div className="space-y-2">
                      {catExercises.map((ex) => (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg text-sm"
                        >
                          <span className="text-gray-900 dark:text-white">{ex.name}</span>
                          <button
                            onClick={() => handleDeleteExercise(ex.id)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Exercise */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo ejercicio..."
                      value={editingEx === cat.id ? newExName : ''}
                      onChange={(e) => {
                        if (editingEx === cat.id) {
                          setNewExName(e.target.value);
                        }
                      }}
                      onFocus={() => {
                        setEditingEx(cat.id);
                        setNewExName('');
                      }}
                      className="flex-1 px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-xs"
                    />
                    <button
                      onClick={() => handleCreateExercise(cat.id)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-xs transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Delete Category */}
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="w-full py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar categoría
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
