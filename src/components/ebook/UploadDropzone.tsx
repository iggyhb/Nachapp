'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSizeMB?: number;
  disabled?: boolean;
}

function isAllowedFile(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop();
  return ext === 'epub' || ext === 'pdf' ||
    file.type === 'application/epub+zip' ||
    file.type === 'application/pdf';
}

export function UploadDropzone({
  onFilesSelected,
  maxSizeMB = 50,
  disabled = false,
}: UploadDropzoneProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | File[]): void => {
    setError(null);
    const maxBytes = maxSizeMB * 1024 * 1024;
    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (!isAllowedFile(file)) {
        errors.push(`"${file.name}" no es EPUB ni PDF`);
      } else if (file.size > maxBytes) {
        errors.push(`"${file.name}" supera los ${maxSizeMB}MB`);
      } else {
        valid.push(file);
      }
    });

    if (errors.length > 0) setError(errors.join(' · '));
    if (valid.length > 0) onFilesSelected(valid);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
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
    if (!disabled) processFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.currentTarget.files && e.currentTarget.files.length > 0) {
      processFiles(e.currentTarget.files);
      e.currentTarget.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
            : isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-copy'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,.pdf,application/epub+zip,application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3">
          <Upload className={`w-10 h-10 mx-auto ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {isDragOver ? 'Suelta los archivos aquí' : 'Arrastra uno o varios ebooks'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              o pulsa para seleccionar
            </p>
          </div>
          <p className="text-xs text-gray-500">EPUB o PDF · máximo {maxSizeMB}MB por archivo</p>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
