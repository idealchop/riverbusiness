'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { AdminAccountSettings } from '@/components/river/admin-settings';

export default function AdminSettingsPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

  return (
    <div className="rb-app min-h-full bg-[#F5F5F7]">
      <AdminAccountSettings
        adminUser={adminUser}
        onLogout={() => {
          if (!auth) return;
          signOut(auth).then(() => router.push('/login'));
        }}
      />
    </div>
  );
}
