'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RbButton, RiverMark } from '@/components/river/ui';
import {
  confirmPhoneCode,
  findProfileByPhone,
  formatNationalPhone,
  phoneAuthMessage,
  sendPhoneCode,
  toE164Ph,
} from '@/lib/phone-auth';
import type { AppUser } from '@/lib/types';
import { getHomePath } from '@/lib/workspace-access';
import { isWaterAdminEmail } from '@/lib/admin-access';

type Mode = 'phone' | 'code' | 'email';

const RECAPTCHA_ID = 'login-recaptcha';

export function LoginForm({ devAdminEmails = [] }: { devAdminEmails?: readonly string[] }) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('phone');
  const [national, setNational] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);

  const e164 = toE164Ph(national);

  useEffect(() => {
    const method = new URLSearchParams(window.location.search).get('method');
    if (method === 'email') setMode('email');
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function continueAfterAuth(uid: string, phoneNumber: string | null, emailAddress: string | null) {
    if (!firestore || !auth) return;
    if (isWaterAdminEmail(emailAddress, devAdminEmails)) {
      router.push('/admin');
      return;
    }
    const profileSnap = await getDoc(doc(firestore, 'users', uid));
    if (profileSnap.exists()) {
      const profile = { id: uid, ...profileSnap.data() } as AppUser;
      if (phoneNumber && !profile.phoneE164) {
        await updateDoc(doc(firestore, 'users', uid), { phoneE164: phoneNumber }).catch(() => undefined);
      }
      router.push(profile.role === 'Admin' || isWaterAdminEmail(emailAddress, devAdminEmails) ? '/admin' : getHomePath(profile));
      return;
    }
    if (phoneNumber) {
      const other = await findProfileByPhone(firestore, phoneNumber);
      if (other && other.id !== uid) {
        await signOut(auth);
        setMode('phone');
        setCode('');
        setError(`${other.businessName || 'This number'} already has an account. Use email to sign in, then link this phone in Settings.`);
        return;
      }
    }
    router.push('/onboarding');
  }

  async function textCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (!auth) {
      setError('Still starting. Try again in a moment.');
      return;
    }
    if (!e164) {
      setError('Enter a 10-digit mobile number, for example 917 123 4567.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendPhoneCode(auth, e164, RECAPTCHA_ID);
      setResendIn(60);
      setMode('code');
      setCode('');
    } catch (cause) {
      setError(phoneAuthMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await confirmPhoneCode(code.trim());
      await continueAfterAuth(result.user.uid, result.user.phoneNumber, result.user.email);
    } catch (cause) {
      setError(phoneAuthMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function emailSignIn(event?: React.FormEvent) {
    event?.preventDefault();
    if (!auth) {
      setError('Still starting. Try again in a moment.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await continueAfterAuth(credential.user.uid, credential.user.phoneNumber, credential.user.email);
    } catch (cause) {
      const authCode = (cause as { code?: string }).code || '';
      if (authCode.includes('invalid-credential') || authCode.includes('wrong-password') || authCode.includes('user-not-found')) {
        setError('The email or password is incorrect.');
      } else if (authCode.includes('too-many-requests')) {
        setError('Too many attempts. Try again later.');
      } else {
        setError(phoneAuthMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!auth || !email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Email sent', description: 'Check your inbox for the reset link.' });
      setResetOpen(false);
    } catch {
      setError('Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = 'h-14 w-full rounded-[16px] bg-[#F7F7F9] px-4 text-[16px] font-semibold text-[#0A0A0A] outline-none placeholder:font-medium placeholder:text-[#B4B4BC] focus-visible:ring-2 focus-visible:ring-[#1A2C49]/20';

  return (
    <main className="rb-app flex h-dvh items-center justify-center overflow-hidden bg-[#F5F5F7] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex max-h-full w-full max-w-[420px] flex-col">
        <section className="min-h-0 overflow-y-auto rounded-[28px] bg-white px-4 py-6 shadow-[0_1px_2px_rgba(16,16,24,0.04),0_18px_40px_-18px_rgba(16,16,24,0.18)]">
          <RiverMark />
          <h1 className="mt-6 text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em]">
            {mode === 'code' ? 'Enter the code' : 'Sign in'}
          </h1>
          <p className="mt-2 text-[15px] font-medium leading-snug text-[#8A8A94]">
            {mode === 'phone' && 'We’ll text a 6-digit code to your mobile number.'}
            {mode === 'code' && `Sent to +63 ${formatNationalPhone(national)}.`}
            {mode === 'email' && 'Use the email and password on your account.'}
          </p>

          {mode === 'phone' ? (
            <form onSubmit={textCode} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-[13px] font-bold">Mobile number</label>
                <div className="flex h-14 items-center rounded-[16px] bg-[#F7F7F9] px-4 focus-within:ring-2 focus-within:ring-[#1A2C49]/20">
                  <span className="pr-3 text-[16px] font-bold text-[#3F3F46]">+63</span>
                  <span className="mr-3 h-5 w-px bg-[#E4E4E7]" aria-hidden />
                  <input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="917 123 4567"
                    value={national}
                    onChange={(event) => { setNational(formatNationalPhone(event.target.value)); setError(''); }}
                    className="h-full w-full bg-transparent text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-[#B4B4BC]"
                  />
                </div>
              </div>
              <RbButton size="lg" full disabled={busy} type="submit">
                {busy ? 'Sending…' : 'Text me a code'}
              </RbButton>
              <button type="button" className="min-h-11 text-[14px] font-bold text-[#8A8A94] underline underline-offset-[3px]" onClick={() => { setError(''); setMode('email'); }}>
                Use email instead
              </button>
            </form>
          ) : null}

          {mode === 'code' ? (
            <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="sms-code" className="text-[13px] font-bold">SMS code</label>
                <div className="relative focus-within:rounded-[14px] focus-within:ring-2 focus-within:ring-[#1A2C49]/20">
                  <div className="flex gap-2" aria-hidden>
                    {Array.from({ length: 6 }, (_, index) => (
                      <span key={index} className="grid h-14 flex-1 place-items-center rounded-[14px] bg-[#F7F7F9] text-[20px] font-extrabold tabular-nums">
                        {code[index] || ''}
                      </span>
                    ))}
                  </div>
                  <input
                    id="sms-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                  />
                </div>
              </div>
              <RbButton size="lg" full disabled={busy} type="submit">
                {busy ? 'Checking…' : 'Continue'}
              </RbButton>
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={() => textCode()}
                className="min-h-11 text-[14px] font-bold text-[#8A8A94] underline underline-offset-[3px] disabled:no-underline disabled:opacity-60"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
              <button type="button" className="-mt-2 min-h-11 text-[14px] font-bold text-[#8A8A94]" onClick={() => { setError(''); setMode('phone'); }}>
                Use a different number
              </button>
            </form>
          ) : null}

          {mode === 'email' ? (
            <form onSubmit={emailSignIn} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-[13px] font-bold">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex min-h-11 items-center justify-between">
                  <label htmlFor="password" className="text-[13px] font-bold">Password</label>
                  <button type="button" className="min-h-11 text-[13px] font-bold text-[#8A8A94] underline underline-offset-[3px]" onClick={() => setResetOpen(true)}>
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                />
                <button type="button" className="min-h-11 self-start text-[13px] font-bold text-[#8A8A94]" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>
              <RbButton size="lg" full disabled={busy} type="submit">
                {busy ? 'Signing in…' : 'Sign in'}
              </RbButton>
              <button type="button" className="min-h-11 text-[14px] font-bold text-[#8A8A94] underline underline-offset-[3px]" onClick={() => { setError(''); setMode('phone'); }}>
                Use phone instead
              </button>
              <p className="text-center text-[13px] font-semibold text-[#8A8A94]">
                New business? <Link href="/signup" className="font-bold text-[#0A0A0A] underline underline-offset-[3px]">Sign up</Link>
              </p>
            </form>
          ) : null}

          {error ? <p role="alert" className="mt-4 text-[14px] font-semibold leading-snug text-[#C2410C]">{error}</p> : null}
        </section>

        <p className="shrink-0 px-2 pt-4 text-center text-[12px] font-semibold leading-[1.45] text-[#8A8A94]">
          By continuing you agree to our{' '}
          <a className="underline underline-offset-[3px]" href="https://riverph.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
          {' '}and{' '}
          <a className="underline underline-offset-[3px]" href="https://riverph.com/terms" target="_blank" rel="noreferrer">Terms</a>.
        </p>
        <div id={RECAPTCHA_ID} className="sr-only" aria-hidden />

        {resetOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/45 px-4 pb-4 sm:items-center" role="dialog" aria-modal="true">
            <div className="w-full max-w-[420px] rounded-[28px] bg-white p-4">
              <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Reset password</h2>
              <p className="mt-2 text-[14px] font-semibold leading-snug text-[#8A8A94]">We’ll email a reset link to the address above.</p>
              <RbButton size="lg" full className="mt-4" disabled={busy} onClick={resetPassword}>Send reset link</RbButton>
              <button type="button" className="mt-2 min-h-11 w-full text-[14px] font-bold text-[#8A8A94]" onClick={() => setResetOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
