'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BookCard } from '@/components/ebook/BookCard';
import { EmptyLibrary } from '@/components/ebook/EmptyLibrary';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  readingStatus: string;
  progressPercent: number;
  mimeType: string;
  totalPages?: number;
}

type FilterStatus = 'todos' | 'reading' | 'completed' | 'not_started' | 'abandoned';
type SortOption = 'recientes' | 'titulo' | 'autor';

const FILTER_CHIPS: Array<{ label: string; value: FilterStatus }> = [
  { label: 'Todos', value: 'todos' },
  { label: 'Leyendo', value: 'reading' },
  { label: 'Completados', value: 'completed' },
  { label: 'Sin empezar', value: 'not_started' },
  { label: 'Abandonados', value: 'abandoned' },
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: 'Recientes', value: 'recientes' },
  { label: 'Título', value: 'titulo' },
  { label: 'Autor', value: 'autor' },
];

export default function LibraryPage(): React.ReactElement {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('todos');
  const [selectedSort, setSelectedSort] = useState<SortOption>('recientes');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const fetchBooks = useCallback(async (query: string, filter: FilterStatus, sort: SortOption) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (query) params.append('search', query);
      if (filter !== 'todos') params.append('status', filter);
      params.append('sort', sort);

      const response = await fetch(`/api/ebooks?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBooks(data.ebooks || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchBooks(searchQuery, selectedFilter, selectedSort);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, selectedFilter, selectedSort, fetchBooks]);

  const bookCount = books.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Biblioteca
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {bookCount} {bookCount === 1 ? 'ebook' : 'ebooks'}
              </p>
            </div>
            <Link href="/library/upload" className="hidden md:block">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4" />
                Subir ebook
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por título o autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:pb-0">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setSelectedFilter(chip.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedFilter === chip.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Ordenar por:</span>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {SORT_OPTIONS.find((opt) => opt.value === selectedSort)?.label}
              </button>

              {showSortMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-max">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedSort(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedSort === option.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <LoadingSpinner text="Cargando biblioteca..." />
            </div>
          ) : books.length === 0 ? (
            <EmptyLibrary />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {books.map((book) => (
                <BookCard key={book.id} {...book} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="fixed md:hidden bottom-20 right-4">
        <Link href="/library/upload">
          <button className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        </Link>
      </div>
    </div>
  );
}
