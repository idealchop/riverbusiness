'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, Home, MessageCircle, Receipt, Settings, Truck } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { useCustomerWater } from '@/components/river/customer-provider';
import { IconButton, ProgressTrack, RbButton, RbCard, Skel, Wordmark } from '@/components/river/ui';
import { formatNumber, formatPeso } from '@/lib/format-money';
import { autoRefillLabel, formatSentAt, refillStep, toDate } from '@/lib/refill-display';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import type { Payment } from '@/lib/types';
import { AppLauncher } from '@/components/dashboard/layout/AppLauncher';
import { LinkPhoneControl } from '@/components/river/link-phone';
import { cn } from '@/lib/utils';

function initials(name?: string) {
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  return letter || '?';
}

export function CustomerHomeSkeleton() {
  return (
    <div className="pt-4">
      <Skel className="mb-5 h-7 w-[220px] rounded-lg" />
      <Skel className="mb-2 h-14 w-full rounded-[16px]" />
      <Skel className="mx-auto mb-5 h-3 w-40 rounded-md" />
      <div className="grid grid-cols-2 gap-3">
        <RbCard><Skel className="h-2.5 w-2/3" /><Skel className="mt-2.5 h-6 w-1/2" /></RbCard>
        <RbCard><Skel className="h-2.5 w-2/3" /><Skel className="mt-2.5 h-6 w-3/5" /></RbCard>
      </div>
      <Skel className="my-4 h-[88px] w-full rounded-[24px]" />
      <Skel className="h-[88px] w-full rounded-[24px]" />
    </div>
  );
}

export function CustomerHome() {
  const { user, activeRefill, estimatedAmount, usedLiters, loading, sendingRefill, setSendingRefill, parentBalance } = useCustomerWater();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [autoOn, setAutoOn] = useState(true);

  useEffect(() => {
    setAutoOn(user?.customPlanDetails?.autoRefillEnabled ?? true);
  }, [user?.customPlanDetails?.autoRefillEnabled]);

  if (loading || !user) return <CustomerHomeSkeleton />;

  const planName = user.plan?.name || 'No plan yet';

  async function toggleAuto() {
    if (!firestore || !user) return;
    if (!user.plan || user.subscriptionStatus !== 'activated') {
      window.dispatchEvent(new CustomEvent('open-subscription-onboarding'));
      return;
    }
    const next = !autoOn;
    setAutoOn(next);
    try {
      await updateDoc(doc(firestore, 'users', user.id), { 'customPlanDetails.autoRefillEnabled': next });
    } catch {
      setAutoOn(!next);
      toast({ variant: 'destructive', title: 'Could not update auto-refill' });
    }
  }

  function requestAsap() {
    setSendingRefill(true);
    window.dispatchEvent(new CustomEvent('request-asap-refill'));
  }

  return (
    <div className="pt-4">
      <h1 className="mb-5 text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em]">{user.businessName || 'Your business'}</h1>
      {activeRefill ? (
        <section className="rounded-[24px] bg-[#EEF2F7] px-5 pb-4 pt-5">
          <h2 className="text-[21px] font-extrabold leading-[1.2] tracking-[-0.025em]">Station notified</h2>
          <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">{formatSentAt(activeRefill.requestedAt)}</p>
          <ProgressTrack step={refillStep(activeRefill.status)} />
        </section>
      ) : (
        <div className="flex flex-col gap-1">
          <RbButton size="lg" full disabled={sendingRefill} onClick={requestAsap}>
            {sendingRefill ? 'Sending…' : 'Request refill'}
          </RbButton>
          <RbButton variant="quiet" full onClick={() => window.dispatchEvent(new CustomEvent('open-request-refill'))}>
            Choose date & quantity
          </RbButton>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <RbCard>
          <p className="text-[13px] font-semibold text-[#8A8A94]">Used this month</p>
          <p className="mt-1.5 text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em] tabular-nums">{formatNumber(usedLiters)} L</p>
        </RbCard>
        <RbCard>
          <p className="text-[13px] font-semibold text-[#8A8A94]">Estimated bill</p>
          <p className="mt-1.5 text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em] tabular-nums">{formatPeso(estimatedAmount)}</p>
        </RbCard>
      </div>

      <RbCard className="mt-4">
        <p className="text-[12px] font-semibold text-[#8A8A94]">Plan</p>
        <b className="mt-1.5 block text-[19px] font-extrabold tracking-[-0.02em]">{planName}</b>
      </RbCard>

      <RbCard className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-[#8A8A94]">Auto-refill</p>
            <b className="mt-1.5 block text-[19px] font-extrabold tracking-[-0.02em]">{autoRefillLabel({ ...user, customPlanDetails: { ...user.customPlanDetails, autoRefillEnabled: autoOn } })}</b>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoOn}
            aria-label="Auto-refill"
            onClick={toggleAuto}
            className={cn('relative h-7 w-11 shrink-0 rounded-full', autoOn ? 'bg-[#1A2C49]' : 'bg-[#E4E4E7]')}
          >
            <span className={cn('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white', autoOn ? 'right-[3px]' : 'left-[3px]')} />
          </button>
        </div>
      </RbCard>

      {user.accountType === 'Parent' && parentBalance !== null ? (
        <RbCard className="mt-3">
          <p className="text-[12px] font-semibold text-[#8A8A94]">Wallet balance</p>
          <b className="mt-1.5 block text-[19px] font-extrabold tracking-[-0.02em] tabular-nums">{formatPeso(parentBalance)}</b>
          <div className="mt-3 flex gap-2">
            <RbButton size="sm" variant="secondary" className="flex-1" onClick={() => window.dispatchEvent(new CustomEvent('open-branches-dialog'))}>Branches</RbButton>
            <RbButton size="sm" variant="secondary" className="flex-1" onClick={() => window.dispatchEvent(new CustomEvent('open-save-liters'))}>Save liters</RbButton>
          </div>
        </RbCard>
      ) : null}
    </div>
  );
}

function deliveryWhen(value: unknown) {
  const date = toDate(value);
  if (!date) return 'Date pending';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
}

export function CustomerDeliveries() {
  const { deliveries, loading, user } = useCustomerWater();
  if (loading || !user) return <CustomerHomeSkeleton />;
  const rows = deliveries || [];
  return (
    <div className="mt-2 flex flex-col gap-4">
      {rows.length === 0 ? <RbCard><p className="text-[15px] font-semibold text-[#8A8A94]">No deliveries yet</p></RbCard> : null}
      {rows.map((delivery) => (
        <RbCard key={delivery.id}>
          <p className="text-[12px] font-semibold text-[#8A8A94]">{delivery.status === 'Delivered' ? 'Delivered' : delivery.status === 'In Transit' ? 'In transit' : delivery.status}</p>
          <b className="mt-1.5 block text-[19px] font-extrabold tracking-[-0.02em]">{deliveryWhen(delivery.date)}</b>
          <p className="mt-1.5 text-[13px] font-semibold text-[#8A8A94]">{formatNumber(delivery.volumeContainers || 0)} containers</p>
          {delivery.proofOfDeliveryUrl ? (
            <RbButton size="sm" variant="secondary" className="mt-4" onClick={() => window.dispatchEvent(new CustomEvent('view-delivery-proof', { detail: { url: delivery.proofOfDeliveryUrl } }))}>
              View proof
            </RbButton>
          ) : null}
        </RbCard>
      ))}
    </div>
  );
}

function periodLabel(payment: Payment) {
  const description = payment.description || '';
  const cleaned = description.replace(/^Bill for /i, '');
  if (cleaned && cleaned !== description) return cleaned;
  const date = toDate(payment.date);
  if (!date) return description || 'Invoice';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function carryLine(payment: Payment) {
  const amount = payment.carryOverAmount || payment.unbilledAmount || 0;
  if (!(amount > 0)) return null;
  return `Includes ${formatPeso(amount)} carry-over`;
}

export function CustomerBilling() {
  const { payments, user, loading } = useCustomerWater();
  const { toast } = useToast();
  if (loading || !user) return <CustomerHomeSkeleton />;
  const rows = payments || [];

  async function viewInvoice(payment: Payment) {
    try {
      await generateInvoicePDF({ user: user!, invoice: payment });
    } catch {
      toast({ variant: 'destructive', title: 'Could not open the invoice' });
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-4">
      {rows.length === 0 ? <RbCard><p className="text-[15px] font-semibold text-[#8A8A94]">No invoices yet</p></RbCard> : null}
      {rows.map((payment) => {
        const payable = payment.status === 'Upcoming' || payment.status === 'Overdue' || payment.status === 'Pending Review';
        const carry = carryLine(payment);
        return (
          <RbCard key={payment.id}>
            <p className="text-[12px] font-semibold text-[#8A8A94]">{periodLabel(payment)}</p>
            <b className="mt-2 block text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em] tabular-nums">{formatPeso(payment.amount)}</b>
            {carry ? <p className="mt-2 text-[13px] font-semibold text-[#8A8A94]">{carry}</p> : null}
            {payable ? (
              <RbButton size="lg" full className="mt-4" onClick={() => window.dispatchEvent(new CustomEvent('open-payment-dialog', { detail: { invoiceId: payment.id } }))}>
                Pay now
              </RbButton>
            ) : payment.status === 'Paid' || payment.status === 'Covered by Parent Account' ? (
              <RbButton size="sm" variant="secondary" className="mt-4" onClick={() => viewInvoice(payment)}>View invoice</RbButton>
            ) : null}
          </RbCard>
        );
      })}
    </div>
  );
}

function FieldSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-[#0A0A0A]/45" aria-label="Dismiss" onClick={onClose} />
      <div className="relative z-[1] w-full max-w-[440px] rounded-t-[28px] bg-white px-5 pb-6 pt-5 text-left sm:rounded-[28px]">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F4F6] text-[18px] font-bold">×</button>
        <h2 className="pr-10 text-[20px] font-extrabold tracking-[-0.02em]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function CustomerSettings() {
  const { user, loading } = useCustomerWater();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<null | 'password' | 'email'>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nextEmail, setNextEmail] = useState('');

  if (loading || !user) return <CustomerHomeSkeleton />;

  async function savePassword() {
    if (!auth?.currentUser?.email) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password must be at least 6 characters' });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      toast({ title: 'Password updated' });
      setSheet(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast({ variant: 'destructive', title: 'Password update failed' });
    }
  }

  async function saveEmail() {
    const emailToSet = nextEmail.trim();
    if (!firestore || !auth?.currentUser || !emailToSet || !emailToSet.includes('@')) {
      toast({ variant: 'destructive', title: 'Enter a valid email' });
      return;
    }
    try {
      await updateDoc(doc(firestore, 'users', auth.currentUser.uid), { email: emailToSet });
      toast({ title: 'Update requested', description: `Your login email is being updated to ${emailToSet}.` });
      setSheet(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-4">
      <RbCard className="p-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[22px] bg-[#1A2C49] text-[26px] font-extrabold text-white">{initials(user.businessName)}</div>
          <div className="min-w-0">
            <h2 className="text-[18px] font-extrabold leading-tight tracking-[-0.02em]">{user.businessName}</h2>
            <p className="mt-0.5 text-[13px] font-semibold text-[#8A8A94]">{user.name}</p>
          </div>
        </div>
      </RbCard>

      <RbCard>
        <b className="block text-[16px] font-extrabold">Your details</b>
        <div className="py-2"><p className="text-[12px] font-semibold text-[#8A8A94]">Full name</p><p className="mt-0.5 text-[15px] font-bold">{user.name}</p></div>
        <div className="py-2"><p className="text-[12px] font-semibold text-[#8A8A94]">Login email</p><p className="mt-0.5 break-all text-[15px] font-bold">{user.email}</p></div>
        <div className="py-2"><p className="text-[12px] font-semibold text-[#8A8A94]">Address</p><p className="mt-0.5 text-[15px] font-bold">{user.address || '—'}</p></div>
        <LinkPhoneControl linked={user.phoneE164 || undefined} contactNumber={user.contactNumber} />
      </RbCard>

      <RbCard className="pb-2">
        <b className="block text-[16px] font-extrabold">Setup</b>
        <button type="button" className="flex min-h-14 w-full items-center gap-3 py-2 text-left" onClick={() => setSheet('password')}>
          <span className="flex-1 text-[15.5px] font-extrabold">Update password</span>
          <ChevronRight className="text-[#B4B4BC]" size={20} />
        </button>
        <button type="button" className="flex min-h-14 w-full items-center gap-3 py-2 text-left" onClick={() => setSheet('email')}>
          <span className="flex-1 text-[15.5px] font-extrabold">Update login email</span>
          <ChevronRight className="text-[#B4B4BC]" size={20} />
        </button>
        <Link href="/dashboard/install" className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
          <span className="flex-1 text-[15.5px] font-extrabold">Install app</span>
          <ChevronRight className="text-[#B4B4BC]" size={20} />
        </Link>
        <div className="flex min-h-14 items-center">
          <AppLauncher />
          <span className="text-[15.5px] font-extrabold">Your apps</span>
        </div>
      </RbCard>

      <button type="button" onClick={() => { if (auth) signOut(auth).then(() => router.push('/login')); }} className="flex min-h-16 w-full items-center rounded-[24px] bg-white px-4 text-left shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]">
        <b className="text-[15.5px] font-extrabold">Sign out</b>
      </button>

      {sheet === 'password' ? (
        <FieldSheet title="Update password" onClose={() => setSheet(null)}>
          <label className="mt-4 block text-[13px] font-bold">Current password</label>
          <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
          <label className="mt-3 block text-[13px] font-bold">New password</label>
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
          <label className="mt-3 block text-[13px] font-bold">Confirm password</label>
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
          <RbButton size="lg" full className="mt-4" onClick={savePassword}>Save password</RbButton>
        </FieldSheet>
      ) : null}
      {sheet === 'email' ? (
        <FieldSheet title="Update login email" onClose={() => setSheet(null)}>
          <label className="mt-4 block text-[13px] font-bold">New email</label>
          <input value={nextEmail} onChange={(event) => setNextEmail(event.target.value)} type="email" autoComplete="email" inputMode="email" className="mt-1.5 h-12 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none" />
          <RbButton size="lg" full className="mt-4" onClick={saveEmail}>Save email</RbButton>
        </FieldSheet>
      ) : null}
    </div>
  );
}

const TABS = [
  { href: '/dashboard', label: 'Home', icon: Home, match: (path: string) => path === '/dashboard' },
  { href: '/dashboard/deliveries', label: 'Deliveries', icon: Truck, match: (path: string) => path.startsWith('/dashboard/deliveries') },
  { href: '/dashboard/billing', label: 'Billing', icon: Receipt, match: (path: string) => path.startsWith('/dashboard/billing') },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, match: (path: string) => path.startsWith('/dashboard/settings') },
];

export function CustomerTabBar() {
  const pathname = usePathname() || '/dashboard';
  return (
    <nav aria-label="Main" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[18px]">
      <div className="pointer-events-auto flex h-[66px] w-full max-w-[428px] items-center justify-between rounded-[24px] bg-white px-2.5 shadow-[0_12px_30px_-10px_rgba(16,16,24,0.22),0_0_0_1px_rgba(16,16,24,0.03)]">
        {TABS.map((tab) => {
          const on = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={cn('inline-flex h-[46px] min-w-[46px] items-center justify-center gap-2 rounded-[16px] px-3 text-[#B4B4BC]', on && 'bg-[#1A2C49] px-[18px] text-white')} aria-current={on ? 'page' : undefined}>
              <Icon size={20} strokeWidth={1.85} />
              {on ? <span className="text-[14px] font-bold">{tab.label}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CustomerHeader({
  onOpenChat,
  chatDot,
  notification,
}: {
  onOpenChat: () => void;
  chatDot?: boolean;
  notification: React.ReactNode;
}) {
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  const home = pathname === '/dashboard';
  const title = pathname.startsWith('/dashboard/deliveries')
    ? 'Deliveries'
    : pathname.startsWith('/dashboard/billing')
      ? 'Billing'
      : pathname.startsWith('/dashboard/settings')
        ? 'Settings'
        : pathname.startsWith('/dashboard/install')
          ? 'Install app'
          : '';

  if (pathname.startsWith('/dashboard/install')) {
    return (
      <header className="flex min-h-11 shrink-0 items-center gap-0.5 px-4 pt-1.5">
        <button type="button" aria-label="Back" onClick={() => router.push('/dashboard/settings')} className="grid h-9 w-9 place-items-center text-[22px] font-medium">‹</button>
        <b className="text-[17px] font-extrabold tracking-[-0.01em]">{title}</b>
      </header>
    );
  }

  if (!home) {
    return (
      <header className="flex min-h-11 shrink-0 items-center px-4 pt-1.5">
        <b className="text-[17px] font-extrabold tracking-[-0.01em]">{title}</b>
      </header>
    );
  }

  return (
    <header className="flex shrink-0 items-center gap-2.5 px-4 pb-1 pt-2">
      <div className="min-w-0 flex-1">
        <Wordmark />
      </div>
      <IconButton label="Live support" onClick={onOpenChat} dot={chatDot}>
        <MessageCircle size={20} strokeWidth={1.85} />
      </IconButton>
      {notification}
    </header>
  );
}

export function useRestoreCustomerScreen() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const last = window.sessionStorage.getItem('rb-restored');
    if (last === '1') return;
    window.sessionStorage.setItem('rb-restored', '1');
    const saved = window.localStorage.getItem('rb-last-screen');
    if (pathname === '/dashboard' && saved && saved.startsWith('/dashboard/') && saved !== '/dashboard') {
      router.replace(saved);
    }
  }, [pathname, router]);
}
