'use client';

import Link from 'next/link';
import { BookStatusBadge } from './BookStatusBadge';
import { ProgressBar } from './ProgressBar';
import { formatMimeType } from '@/lib/ebook-utils';

interface BookCardProps {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  readingStatus: string;
  progressPercent: number;
  mimeType: string;
  totalPages?: number;
}

export function BookCard({
  id,
  title,
  author,
  coverUrl,
  readingStatus,
  progressPercent,
  mimeType,
}: BookCardProps): React.ReactElement {
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

  const firstLetter = title.charAt(0).toUpperCase();
  const bgColor = getBackgroundColor(title);
  const textColor = getTextColor(title);

  return (
    <Link href={`/library/${id}`}>
      <div className="h-full rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800 cursor-pointer active:scale-95 transition-transform">
        {/* Cover Image or Placeholder */}
        <div
          className={`aspect-[3/4] ${bgColor} flex items-center justify-center relative overflow-hidden`}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`text-5xl font-bold ${textColor}`}>{firstLetter}</div>
          )}

          {/* Format Badge */}
          <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
            {formatMimeType(mimeType)}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-2">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm">
            {title}
          </h3>

          {/* Author */}
          {author && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
              {author}
            </p>
          )}

          {/* Status Badge */}
          <div className="flex justify-start">
            <BookStatusBadge status={readingStatus} size="sm" />
          </div>

          {/* Progress Bar */}
          {readingStatus !== 'not_started' && (
            <ProgressBar percent={progressPercent} status={readingStatus} showLabel={false} />
          )}
        </div>
      </div>
    </Link>
  );
}
