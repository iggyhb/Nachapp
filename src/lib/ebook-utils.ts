export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMimeType(mime: string): string {
  if (mime === 'application/epub+zip') return 'EPUB';
  if (mime === 'application/pdf') return 'PDF';
  return mime;
}

export const READING_STATUS = {
  NOT_STARTED: 'not_started',
  READING: 'reading',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export const READING_STATUS_LABELS: Record<string, string> = {
  not_started: 'Sin empezar',
  reading: 'Leyendo',
  completed: 'Completado',
  abandoned: 'Abandonado',
};

export const READING_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  reading: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  completed: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  abandoned: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
};

export const READING_STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  not_started: { bg: 'gray', text: 'text-gray-700 dark:text-gray-300' },
  reading: { bg: 'blue', text: 'text-blue-700 dark:text-blue-300' },
  completed: { bg: 'green', text: 'text-green-700 dark:text-green-300' },
  abandoned: { bg: 'red', text: 'text-red-700 dark:text-red-300' },
};
