'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { readLastScreen } from '@/lib/screen-cache';
import { CustomerHomeSkeleton } from '@/components/river/customer-screens';

export default function OpenAppPage() {
  const router = useRouter();
  useEffect(() => {
    const last = readLastScreen();
    router.replace(last || '/dashboard');
  }, [router]);
  return (
    <div className="rb-app mx-auto h-dvh max-w-[460px] bg-[#F5F5F7] px-4 pt-6">
      <CustomerHomeSkeleton />
    </div>
  );
}
