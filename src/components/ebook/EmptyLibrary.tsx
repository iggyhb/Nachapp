'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function EmptyLibrary(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[50vh]">
      <div className="text-gray-400 dark:text-gray-600 mb-4">
        <BookOpen className="w-16 h-16" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Tu biblioteca está vacía
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm">
        Sube tu primer ebook para comenzar a leer
      </p>
      <Link href="/library/upload">
        <Button variant="primary" size="md">
          Subir ebook
        </Button>
      </Link>
    </div>
  );
}
