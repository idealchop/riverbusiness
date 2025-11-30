
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QualityPage() {
  const router = useRouter();

  useEffect(() => {
    // This is a temporary solution to make the sidebar link work
    // and correctly show the feedback tab on the main admin page.
    router.replace('/dashboard');
  }, [router]);

  return null;
}
