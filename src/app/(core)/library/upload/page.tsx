'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/ebook/UploadDropzone';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadError {
  message: string;
  code?: string;
}

export default function UploadPage(): React.ReactElement {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [titleOverride, setTitleOverride] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelected = (file: File | null): void => {
    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(0);

    if (file && !titleOverride) {
      const fileName = file.name.replace(/\.(epub|pdf)$/i, '');
      setTitleOverride(fileName);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedFile) {
      setUploadError({ message: 'Por favor selecciona un archivo' });
      return;
    }

    setUploadState('uploading');
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (titleOverride) {
      formData.append('title', titleOverride);
    }

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          setUploadState('success');

          setTimeout(() => {
            router.push(`/library/${response.id}`);
          }, 1500);
        } else {
          const response = JSON.parse(xhr.responseText);
          setUploadState('error');
          setUploadError({
            message: response.error || 'Error al subir el archivo',
            code: response.code,
          });
        }
      });

      xhr.addEventListener('error', () => {
        setUploadState('error');
        setUploadError({ message: 'Error de conexión al subir el archivo' });
      });

      xhr.open('POST', '/api/ebooks/upload');
      xhr.send(formData);
    } catch (error) {
      setUploadState('error');
      setUploadError({
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

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
              Subir ebook
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              EPUB o PDF, máximo 50MB
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Archivo de ebook
              </label>
              <UploadDropzone
                onFileSelected={handleFileSelected}
                selectedFile={selectedFile}
                maxSizeMB={50}
              />
            </div>

            {/* Title Override */}
            {selectedFile && (
              <div>
                <Input
                  label="Título (opcional)"
                  type="text"
                  placeholder="Personaliza el título del ebook"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  disabled={uploadState === 'uploading'}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Si dejas este campo vacío, usaremos el nombre del archivo
                </p>
              </div>
            )}

            {/* Progress Indicator */}
            {uploadState === 'uploading' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subiendo...
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadState === 'success' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✓ Ebook subido exitosamente
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Redireccionando a los detalles del libro...
                </p>
              </div>
            )}

            {/* Error Message */}
            {uploadState === 'error' && uploadError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200 font-medium">
                  Error al subir el ebook
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {uploadError.message}
                </p>
                {uploadError.code && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Código: {uploadError.code}
                  </p>
                )}
              </div>
            )}

            {/* Upload Button */}
            {selectedFile && uploadState !== 'success' && (
              <Button
                onClick={handleUpload}
                disabled={uploadState === 'uploading' || !selectedFile}
                isLoading={uploadState === 'uploading'}
                fullWidth
                variant="primary"
                size="lg"
              >
                {uploadState === 'uploading' ? 'Subiendo...' : 'Subir ebook'}
              </Button>
            )}

            {/* Back to Library Button */}
            {uploadState === 'success' && (
              <Link href="/library" className="block">
                <Button fullWidth variant="secondary" size="lg">
                  Volver a la biblioteca
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
