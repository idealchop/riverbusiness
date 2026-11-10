'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, KeyRound, LogOut, Pencil, Smartphone } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import type { AppUser } from '@/lib/types';
import { RbButton, RbCard } from '@/components/river/ui';

export function AdminAccountSettings({ adminUser, onLogout }: { adminUser: AppUser | null; onLogout: () => void }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDisplayName(adminUser?.supportDisplayName || '');
    setDescription(adminUser?.supportDescription || '');
  }, [adminUser?.supportDisplayName, adminUser?.supportDescription]);

  if (!adminUser) return null;
  const initials = (adminUser.supportDisplayName || adminUser.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  async function saveProfile() {
    if (!auth?.currentUser || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'users', auth.currentUser.uid), {
        supportDisplayName: displayName,
        supportDescription: description,
      });
      toast({ title: 'Changes saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not save your support profile' });
    }
  }

  async function savePassword() {
    if (!auth?.currentUser?.email) return;
    if (nextPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'New passwords do not match' });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, nextPassword);
      toast({ title: 'Password updated' });
      setPasswordOpen(false);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
    } catch {
      toast({ variant: 'destructive', title: 'Password update failed' });
    }
  }

  function onPhoto(file: File | null) {
    if (!file || !auth?.currentUser || !storage || !firestore) return;
    const filePath = `users/${auth.currentUser.uid}/support_profile/photo-${Date.now()}`;
    startTransition(async () => {
      try {
        const downloadURL = await uploadFileWithProgress(storage, auth, filePath, file, {}, () => undefined);
        await updateDoc(doc(firestore, 'users', auth.currentUser!.uid), { supportPhotoURL: downloadURL });
        toast({ title: 'Support photo updated' });
      } catch {
        toast({ variant: 'destructive', title: 'Could not upload your photo' });
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-3 px-4 pb-16 pt-2">
      <div className="mb-2 flex items-center gap-1">
        <button type="button" aria-label="Back" onClick={() => router.push('/admin')} className="grid h-9 w-9 place-items-center text-[22px]">‹</button>
        <div>
          <b className="block text-[17px] font-extrabold">Account settings</b>
          <p className="text-[12px] font-semibold text-[#8A8A94]">Support profile and sign-in</p>
        </div>
      </div>

      <RbCard className="p-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-[22px] bg-[#1A2C49] text-[22px] font-extrabold text-white">
            {adminUser.supportPhotoURL ? <img src={adminUser.supportPhotoURL} alt="" className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-extrabold leading-tight">{adminUser.supportDisplayName || 'River Support'}</h2>
            <p className="text-[13px] font-semibold text-[#8A8A94]">{adminUser.supportDescription || 'Customer support'}</p>
            <p className="truncate text-[13px] font-semibold text-[#8A8A94]">{adminUser.email}</p>
          </div>
          <label className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-[#F4F4F6]" aria-label="Edit support photo">
            <Pencil size={16} />
            <input type="file" accept="image/*" className="sr-only" disabled={pending} onChange={(event) => onPhoto(event.target.files?.[0] || null)} />
          </label>
        </div>
      </RbCard>

      <RbCard>
        <b className="text-[16px] font-extrabold">Support profile</b>
        <label className="mt-3 block text-[13px] font-bold" htmlFor="display-name">Display name</label>
        <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} onBlur={saveProfile} className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
        <label className="mt-3 block text-[13px] font-bold" htmlFor="support-desc">Description</label>
        <input id="support-desc" value={description} onChange={(event) => setDescription(event.target.value)} onBlur={saveProfile} className="mb-1 mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
      </RbCard>

      <RbCard>
        <b className="text-[16px] font-extrabold">Personal account</b>
        <div className="py-2"><p className="text-[12px] font-semibold text-[#8A8A94]">Name</p><p className="mt-0.5 text-[15px] font-bold">{adminUser.name}</p></div>
        <div className="py-2"><p className="text-[12px] font-semibold text-[#8A8A94]">Login email</p><p className="mt-0.5 break-all text-[15px] font-bold">{adminUser.email}</p></div>
      </RbCard>

      <RbCard className="pb-2">
        <b className="text-[16px] font-extrabold">Setup</b>
        <button type="button" className="flex min-h-14 w-full items-center gap-3 text-left" onClick={() => setPasswordOpen(true)}>
          <KeyRound size={18} />
          <span className="min-w-0 flex-1"><b className="block text-[15.5px]">Update password</b><span className="text-[13px] font-medium text-[#8A8A94]">Current, new, and confirm</span></span>
          <ChevronRight className="text-[#B4B4BC]" />
        </button>
        <Link href="/admin/install" className="flex min-h-14 w-full items-center gap-3 text-left">
          <Smartphone size={18} />
          <span className="min-w-0 flex-1"><b className="block text-[15.5px]">Install app</b><span className="text-[13px] font-medium text-[#8A8A94]">Open River Business from your home screen</span></span>
          <ChevronRight className="text-[#B4B4BC]" />
        </Link>
      </RbCard>

      <button type="button" onClick={onLogout} className="flex min-h-16 w-full items-center gap-3 rounded-[24px] bg-white px-4 text-left shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]">
        <LogOut size={18} />
        <span><b className="block text-[15.5px]">Sign out</b><span className="text-[13px] font-medium text-[#8A8A94]">{adminUser.email}</span></span>
      </button>

      {passwordOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#0A0A0A]/45" aria-label="Dismiss" onClick={() => setPasswordOpen(false)} />
          <div className="relative z-[1] w-full max-w-[440px] rounded-t-[28px] bg-white px-5 pb-6 pt-5 sm:rounded-[28px]">
            <button type="button" aria-label="Close" onClick={() => setPasswordOpen(false)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#F4F4F6] text-lg font-bold">×</button>
            <h2 className="text-[20px] font-extrabold">Update password</h2>
            <label className="mt-4 block text-[13px] font-bold">Current password</label>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
            <label className="mt-3 block text-[13px] font-bold">New password</label>
            <input type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} autoComplete="new-password" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
            <label className="mt-3 block text-[13px] font-bold">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
            <RbButton size="lg" full className="mt-4" onClick={savePassword}>Save password</RbButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
