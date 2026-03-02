'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHub = pathname === '/documentation';

  return (
    <main className="min-h-screen bg-muted/30 pb-20">
      {/* Shared Header for Documentation */}
      <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-5xl h-16 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            {!isHub && (
              <Button asChild variant="ghost" size="sm" className="rounded-full h-8 px-2 pr-3">
                <Link href="/documentation">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Hub
                </Link>
              </Button>
            )}
            <Link href="/documentation" className="font-bold text-lg hover:text-primary transition-colors">
              Resources
            </Link>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 sm:px-8 pt-8">
        {children}
      </div>
    </main>
  );
}
