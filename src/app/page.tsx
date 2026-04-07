'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
        });

        if (response.ok) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="animate-spin">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full"></div>
      </div>
    </div>
  );
}
