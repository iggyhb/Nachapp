'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Trash2,
  Edit2,
  BookMarked,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { BookStatusBadge } from '@/components/ebook/BookStatusBadge';
import { ProgressBar } from '@/components/ebook/ProgressBar';
import { formatFileSize, formatMimeType } from '@/lib/ebook-utils';

interface BookDetail {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  language?: string;
  coverUrl?: string;
  readingStatus: string;
  progressPercent: number;
  mimeType: string;
  fileSize: number;
  totalPages?: number;
  totalWords?: number;
  totalChapters?: number;
  description?: string;
  tags?: string[];
  chapters?: Array<{
    id: string;
    title: string;
    pageStart?: number;
    pageEnd?: number;
  }>;
}

type ModalState = 'none' | 'delete' | 'progress' | 'edit';

export default function BookDetailPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>('none');
  const [progressValue, setProgressValue] = useState(0);
  const [editingStatus, setEditingStatus] = useState('reading');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchBook = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/ebooks/${bookId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch book');
        }

        const data = await response.json();
        setBook(data);
        setProgressValue(data.progressPercent);
        setEditingStatus(data.readingStatus);
      } catch (error) {
        console.error('Error fetching book:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/ebooks/${bookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/library');
      } else {
        console.error('Failed to delete book');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting book:', error);
      setIsDeleting(false);
    }
  };

  const handleUpdateProgress = async (): Promise<void> => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/ebooks/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercent: progressValue }),
      });

      if (response.ok) {
        const updated = await response.json();
        setBook((prev) =>
          prev ? { ...prev, progressPercent: updated.progressPercent } : null,
        );
        setModal('none');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (): Promise<void> => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/ebooks/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingStatus: editingStatus }),
      });

      if (response.ok) {
        const updated = await response.json();
        setBook((prev) =>
          prev ? { ...prev, readingStatus: updated.readingStatus } : null,
        );
        setModal('none');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner text="Cargando detalles del ebook..." />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-sm">
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Libro no encontrado
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              El libro que buscas no existe o ha sido eliminado.
            </p>
            <Link href="/library">
              <Button variant="primary" fullWidth>
                Volver a la biblioteca
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const getBackgroundColor = (title: string): string => {
    const colors = [
      'bg-blue-100 dark:bg-blue-900',
      'bg-purple-100 dark:bg-purple-900',
      'bg-pink-100 dark:bg-pink-900',
      'bg-green-100 dark:bg-green-900',
      'bg-yellow-100 dark:bg-yellow-900',
      'bg-indigo-100 dark:bg-indigo-900',
    ];
    const index = title.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getTextColor = (title: string): string => {
    const colors = [
      'text-blue-900 dark:text-blue-100',
      'text-purple-900 dark:text-purple-100',
      'text-pink-900 dark:text-pink-100',
      'text-green-900 dark:text-green-100',
      'text-yellow-900 dark:text-yellow-100',
      'text-indigo-900 dark:text-indigo-100',
    ];
    const index = title.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const firstLetter = book.title.charAt(0).toUpperCase();
  const bgColor = getBackgroundColor(book.title);
  const textColor = getTextColor(book.title);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 md:px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/library">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {book.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cover & Actions */}
            <div className="md:col-span-1">
              <div className={`aspect-[3/4] ${bgColor} rounded-lg overflow-hidden shadow-md mb-4 flex items-center justify-center`}>
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`text-6xl font-bold ${textColor}`}>{firstLetter}</div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setModal('progress')}
                  disabled={modal === 'progress'}
                >
                  <BookMarked className="w-4 h-4" />
                  {book.readingStatus === 'not_started'
                    ? 'Comenzar'
                    : 'Continuar leyendo'}
                </Button>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setModal('edit')}
                  disabled={modal === 'edit'}
                >
                  <Edit2 className="w-4 h-4" />
                  Editar estado
                </Button>

                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setModal('delete')}
                  disabled={modal === 'delete'}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Status & Progress */}
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Estado
                    </span>
                    <BookStatusBadge status={book.readingStatus} size="md" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Progreso
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {Math.round(book.progressPercent)}%
                      </span>
                    </div>
                    <ProgressBar
                      percent={book.progressPercent}
                      status={book.readingStatus}
                      showLabel={false}
                    />
                  </div>
                </div>
              </Card>

              {/* Metadata */}
              <Card title="Información">
                <div className="space-y-3">
                  {book.author && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Autor
                      </p>
                      <p className="text-gray-900 dark:text-white">{book.author}</p>
                    </div>
                  )}

                  {book.publisher && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Editorial
                      </p>
                      <p className="text-gray-900 dark:text-white">{book.publisher}</p>
                    </div>
                  )}

                  {book.language && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Idioma
                      </p>
                      <p className="text-gray-900 dark:text-white">{book.language}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Formato
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {formatMimeType(book.mimeType)} • {formatFileSize(book.fileSize)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* File Info */}
              <Card title="Detalles del archivo">
                <div className="grid grid-cols-2 gap-4">
                  {book.totalPages && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Páginas
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {book.totalPages}
                      </p>
                    </div>
                  )}

                  {book.totalWords && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Palabras
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(book.totalWords / 1000).toFixed(0)}K
                      </p>
                    </div>
                  )}

                  {book.totalChapters && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Capítulos
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {book.totalChapters}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Tamaño
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatFileSize(book.fileSize)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Description */}
              {book.description && (
                <Card title="Descripción">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {book.description}
                  </p>
                </Card>
              )}

              {/* Tags */}
              {book.tags && book.tags.length > 0 && (
                <Card title="Etiquetas">
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Chapters */}
              {book.chapters && book.chapters.length > 0 && (
                <Card title={`Capítulos (${book.chapters.length})`}>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {book.chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {chapter.title}
                            </p>
                            {chapter.pageStart && chapter.pageEnd && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                p. {chapter.pageStart}-{chapter.pageEnd}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {modal === 'delete' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="w-full md:w-full max-w-sm bg-white dark:bg-gray-800 rounded-t-lg md:rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Eliminar ebook
              </h2>
              <button
                onClick={() => setModal('none')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              ¿Estás seguro de que quieres eliminar "{book.title}"? Esta acción no se puede
              deshacer.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setModal('none')}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Modal */}
      {modal === 'progress' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="w-full md:w-full max-w-sm bg-white dark:bg-gray-800 rounded-t-lg md:rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Actualizar progreso
              </h2>
              <button
                onClick={() => setModal('none')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Porcentaje completado
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseInt(e.target.value))}
                  disabled={isUpdating}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-center text-lg font-semibold text-gray-900 dark:text-white mt-2">
                  {progressValue}%
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setModal('none')}
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleUpdateProgress}
                  isLoading={isUpdating}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {modal === 'edit' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="w-full md:w-full max-w-sm bg-white dark:bg-gray-800 rounded-t-lg md:rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Editar estado
              </h2>
              <button
                onClick={() => setModal('none')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {['not_started', 'reading', 'completed', 'abandoned'].map((status) => (
                <button
                  key={status}
                  onClick={() => setEditingStatus(status)}
                  className={`w-full p-3 rounded-lg text-left font-medium transition-colors ${
                    editingStatus === status
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  disabled={isUpdating}
                >
                  {status === 'not_started' && 'Sin empezar'}
                  {status === 'reading' && 'Leyendo'}
                  {status === 'completed' && 'Completado'}
                  {status === 'abandoned' && 'Abandonado'}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setModal('none')}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleUpdateStatus}
                isLoading={isUpdating}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
