'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { formatFileSize, formatMimeType } from '@/lib/ebook-utils';

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  maxSizeMB?: number;
  accept?: string[];
}

export function UploadDropzone({
  onFileSelected,
  selectedFile,
  maxSizeMB = 50,
  accept = ['application/epub+zip', 'application/pdf'],
}: UploadDropzoneProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    if (!accept.includes(file.type)) {
      setError('Solo se aceptan archivos EPUB o PDF');
      return false;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`El archivo es demasiado grande. Máximo ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const handleRemoveFile = (): void => {
    onFileSelected(null as any);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatFileSize(selectedFile.size)} • {formatMimeType(selectedFile.type)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Eliminar archivo"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,.pdf,application/epub+zip,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={isDragOver ? 'text-blue-500' : 'text-gray-400'}>
            <Upload className="w-10 h-10 mx-auto" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Arrastra tu ebook aquí
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              o pulsa para seleccionar
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            EPUB o PDF, máximo {maxSizeMB}MB
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-3 text-center">{error}</p>
      )}
    </div>
  );
}
