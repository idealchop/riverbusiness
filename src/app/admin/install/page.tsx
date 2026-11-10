'use client';

import { AdminInstallScreen } from '@/components/river/install-panel';
import { useRouter } from 'next/navigation';

export default function AdminInstallPage() {
  const router = useRouter();
  return (
    <div className="rb-app mx-auto min-h-dvh max-w-[460px] bg-[#F5F5F7]">
      <div className="flex min-h-11 items-center gap-1 px-4 pt-2">
        <button type="button" aria-label="Back" onClick={() => router.push('/admin/settings')} className="grid h-9 w-9 place-items-center text-[22px]">‹</button>
        <b className="text-[17px] font-extrabold">Install app</b>
      </div>
      <div className="px-4">
        <AdminInstallScreen />
      </div>
    </div>
  );
}
