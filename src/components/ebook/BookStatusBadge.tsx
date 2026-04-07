'use client';

import { READING_STATUS_LABELS, READING_STATUS_COLORS } from '@/lib/ebook-utils';

interface BookStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function BookStatusBadge({
  status,
  size = 'sm',
}: BookStatusBadgeProps): React.ReactElement {
  const label = READING_STATUS_LABELS[status] || status;
  const colorClass = READING_STATUS_COLORS[status] || READING_STATUS_COLORS.not_started;

  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span className={`inline-block ${sizeClass} rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
