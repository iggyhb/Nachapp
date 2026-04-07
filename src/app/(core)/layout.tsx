'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
        });

        if (response.ok) {
          setIsAuthorized(true);
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <></>;
  }

  return <AppShell>{children}</AppShell>;
}
