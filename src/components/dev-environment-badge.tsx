'use client';

import { usePathname } from 'next/navigation';
import { isDevAppEnvironment } from '@/lib/firestore-database';

/** Small fixed badge so the dev App Hosting site is not mistaken for live. */
export function DevEnvironmentBadge() {
  const pathname = usePathname() || '';
  if (!isDevAppEnvironment()) return null;

  const aboveTabBar = pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/install');

  return (
    <div
      className={
        aboveTabBar
          ? 'pointer-events-none fixed bottom-[96px] right-3 z-[200] select-none rounded-full border border-amber-800/20 bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-950 shadow-sm'
          : 'pointer-events-none fixed bottom-3 right-3 z-[200] select-none rounded-full border border-amber-800/20 bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-950 shadow-sm'
      }
      role="status"
    >
      DEV
    </div>
  );
}
