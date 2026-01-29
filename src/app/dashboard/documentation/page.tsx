'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FullScreenLoader } from '@/components/ui/loader';

export default function OldDocumentationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/documentation');
  }, [router]);

  return <FullScreenLoader text="Redirecting..." />;
}
