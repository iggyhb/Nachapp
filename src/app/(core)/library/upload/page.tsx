'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/ebook/UploadDropzone';

type FileStatus = 'pending' | 'uploading' | 'done' | 'error' | 'duplicate';

interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  bookId?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === 'done') return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (status === 'error') return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
  if (status === 'duplicate') return <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
  if (status === 'uploading') return <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" />;
  return <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />;
}

export default function UploadPage(): React.ReactElement {
  const router = useRouter();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((e) => e.file.name));
      const toAdd = newFiles
        .filter((f) => !existingNames.has(f.name))
        .map((f) => ({
          id: `${f.name}-${f.size}-${Date.now()}`,
          file: f,
          status: 'pending' as FileStatus,
          progress: 0,
        }));
      return [...prev, ...toAdd];
    });
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((e) => e.id !== id));
  };

  const updateFile = (id: string, patch: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const uploadOne = (entry: FileEntry): Promise<void> => {
    return new Promise((resolve) => {
      updateFile(entry.id, { status: 'uploading', progress: 0 });

      const formData = new FormData();
      formData.append('file', entry.file);
      // Use filename without extension as title
      const titleGuess = entry.file.name.replace(/\.(epub|pdf)$/i, '');
      formData.append('titleOverride', titleGuess);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          updateFile(entry.id, { progress: Math.round((e.loaded / e.total) * 100) });
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status === 201 || xhr.status === 200) {
            updateFile(entry.id, { status: 'done', progress: 100, bookId: res.id });
          } else if (xhr.status === 409) {
            updateFile(entry.id, { status: 'duplicate', error: 'Ya existe en tu biblioteca' });
          } else {
            updateFile(entry.id, { status: 'error', error: res.error || 'Error desconocido' });
          }
        } catch {
          updateFile(entry.id, { status: 'error', error: 'Respuesta inesperada del servidor' });
        }
        resolve();
      });

      xhr.addEventListener('error', () => {
        updateFile(entry.id, { status: 'error', error: 'Error de conexión' });
        resolve();
      });

      xhr.open('POST', '/api/ebooks/upload');
      xhr.send(formData);
    });
  };

  const handleUploadAll = async () => {
    const pending = files.filter((e) => e.status === 'pending' || e.status === 'error');
    if (pending.length === 0) return;

    setIsUploading(true);
    // Upload sequentially to avoid overloading the server
    for (const entry of pending) {
      await uploadOne(entry);
    }
    setIsUploading(false);
  };

  const pendingCount = files.filter((e) => e.status === 'pending').length;
  const doneCount = files.filter((e) => e.status === 'done').length;
  const allDone = files.length > 0 && files.every((e) => e.status === 'done' || e.status === 'duplicate');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 md:px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/library">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Subir ebooks
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              EPUB o PDF · puedes arrastrar varios a la vez
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 md:px-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Drop zone */}
          <UploadDropzone
            onFilesSelected={addFiles}
            maxSizeMB={50}
            disabled={isUploading}
          />

          {/* File queue */}
          {files.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {files.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <StatusIcon status={entry.status} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {entry.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{formatSize(entry.file.size)}</span>
                      {entry.status === 'uploading' && (
                        <span className="text-xs text-blue-500">{entry.progress}%</span>
                      )}
                      {entry.status === 'done' && (
                        <span className="text-xs text-green-600 dark:text-green-400">Subido</span>
                      )}
                      {entry.status === 'duplicate' && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Ya existe</span>
                      )}
                      {entry.status === 'error' && entry.error && (
                        <span className="text-xs text-red-600 dark:text-red-400 truncate">{entry.error}</span>
                      )}
                    </div>
                    {entry.status === 'uploading' && (
                      <div className="mt-1.5 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-200"
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {entry.status === 'done' && entry.bookId && (
                    <button
                      onClick={() => router.push(`/library/${entry.bookId}`)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      Ver →
                    </button>
                  )}

                  {(entry.status === 'pending' || entry.status === 'error') && !isUploading && (
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Summary + actions */}
          {files.length > 0 && (
            <div className="flex flex-col gap-3">
              {!allDone ? (
                <Button
                  onClick={handleUploadAll}
                  disabled={isUploading || pendingCount === 0}
                  isLoading={isUploading}
                  fullWidth
                  variant="primary"
                  size="lg"
                >
                  {isUploading
                    ? `Subiendo... (${doneCount}/${files.filter(e => e.status !== 'pending').length + pendingCount})`
                    : pendingCount > 0
                    ? `Subir ${pendingCount} libro${pendingCount > 1 ? 's' : ''}`
                    : 'Reintentar errores'}
                </Button>
              ) : (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    ✓ {doneCount} libro{doneCount > 1 ? 's' : ''} añadido{doneCount > 1 ? 's' : ''} a tu biblioteca
                  </p>
                </div>
              )}

              <Link href="/library">
                <Button fullWidth variant="secondary" size="lg">
                  Volver a la biblioteca
                </Button>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
