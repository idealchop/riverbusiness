'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import Link from 'next/link';

export default function DocumentationPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center justify-center h-auto text-center space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-3xl font-bold">Documentation & Resources</h1>
        <p className="text-muted-foreground max-w-md">
          This page is currently under construction. Please check back later for
          helpful guides, FAQs, and resources to make the most of the River
          Business platform.
        </p>
        <Button asChild className="mt-4">
          <Link href="/login">Back to Login</Link>
        </Button>
      </div>
    </main>
  );
}
