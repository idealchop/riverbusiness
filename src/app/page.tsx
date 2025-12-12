
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function RootPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user status is resolved
    }

    if (user) {
      if (user.email === 'admin@riverph.com') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // Render a loading state or nothing while the redirect is happening
  return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
}
