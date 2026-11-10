'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RbButton, Wordmark } from '@/components/river/ui';
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

type Mode = 'phone' | 'code' | 'email';

const RECAPTCHA_ID = 'login-recaptcha';

export default function LoginPage() {
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
    if (emailAddress === 'admin@riverph.com') {
      router.push('/admin');
      return;
    }
    const profileSnap = await getDoc(doc(firestore, 'users', uid));
    if (profileSnap.exists()) {
      const profile = { id: uid, ...profileSnap.data() } as AppUser;
      if (phoneNumber && !profile.phoneE164) {
        await updateDoc(doc(firestore, 'users', uid), { phoneE164: phoneNumber }).catch(() => undefined);
      }
      router.push(profile.role === 'Admin' ? '/admin' : getHomePath(profile));
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

  return (
    <main className="rb-app flex min-h-dvh justify-center bg-[#F5F5F7] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Wordmark className="h-8" />
        <h1 className="mt-8 text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em]">
          {mode === 'code' ? 'Enter the code' : 'Sign in'}
        </h1>
        <p className="mt-2 text-[15px] font-semibold text-[#8A8A94]">
          {mode === 'phone' && 'We’ll text a 6-digit code to your mobile number.'}
          {mode === 'code' && `Code sent to +63 ${formatNationalPhone(national)}.`}
          {mode === 'email' && 'Use the email and password on your account.'}
        </p>

        {mode === 'phone' ? (
          <form onSubmit={textCode} className="mt-6 flex flex-col gap-3">
            <label htmlFor="phone" className="text-[13px] font-bold">Mobile number</label>
            <div className="flex h-14 items-center gap-2 rounded-[16px] bg-[#F4F4F6] px-3.5">
              <span className="text-[16px] font-bold">+63</span>
              <input
                id="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="917 123 4567"
                value={national}
                onChange={(event) => { setNational(formatNationalPhone(event.target.value)); setError(''); }}
                className="h-full w-full bg-transparent text-[16px] font-semibold outline-none placeholder:text-[#B4B4BC]"
              />
            </div>
            <RbButton size="lg" full disabled={!e164 || busy} onClick={() => textCode()}>
              {busy ? 'Sending…' : 'Text me a code'}
            </RbButton>
            <button type="button" className="min-h-11 text-[14px] font-bold text-[#8A8A94] underline underline-offset-[3px]" onClick={() => { setError(''); setMode('email'); }}>
              Use email instead
            </button>
          </form>
        ) : null}

        {mode === 'code' ? (
          <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-3">
            <label htmlFor="sms-code" className="text-[13px] font-bold">SMS code</label>
            <input
              id="sms-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              className="h-14 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-center text-[16px] font-semibold tracking-[0.3em] outline-none"
            />
            <RbButton size="lg" full disabled={code.length !== 6 || busy} onClick={() => verifyCode()}>
              {busy ? 'Checking…' : 'Verify and continue'}
            </RbButton>
            <button
              type="button"
              disabled={resendIn > 0 || busy}
              onClick={() => textCode()}
              className="min-h-11 text-[14px] font-bold text-[#8A8A94] underline underline-offset-[3px] disabled:no-underline disabled:opacity-70"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
            <button type="button" className="min-h-11 text-[14px] font-bold text-[#8A8A94]" onClick={() => { setError(''); setMode('phone'); }}>
              Use a different number
            </button>
          </form>
        ) : null}

        {mode === 'email' ? (
          <form onSubmit={emailSignIn} className="mt-6 flex flex-col gap-3">
            <label htmlFor="email" className="text-[13px] font-bold">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none"
            />
            <div className="flex items-center justify-between">
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
              className="h-14 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-[16px] font-semibold outline-none"
            />
            <button type="button" className="self-start text-[13px] font-bold text-[#8A8A94]" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
            <RbButton size="lg" full disabled={busy || !email || !password} onClick={() => emailSignIn()}>
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

        {error ? <p role="alert" className="mt-4 text-[14px] font-semibold text-[#C2410C]">{error}</p> : null}

        <div id={RECAPTCHA_ID} className="sr-only" aria-hidden />
        <p className="mt-6 text-center text-[11px] font-medium leading-snug text-[#8A8A94]">
          Protected by reCAPTCHA. Google <a className="underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy</a> and <a className="underline" href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms</a> apply.
        </p>

        {resetOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/45 sm:items-center" role="dialog" aria-modal="true">
            <div className="w-full max-w-[420px] rounded-t-[28px] bg-white p-5 sm:rounded-[28px]">
              <h2 className="text-[20px] font-extrabold">Reset password</h2>
              <p className="mt-2 text-[14px] font-semibold text-[#8A8A94]">We’ll email a reset link to the address above.</p>
              <RbButton size="lg" full className="mt-4" disabled={busy} onClick={resetPassword}>Send reset link</RbButton>
              <button type="button" className="mt-2 min-h-11 w-full text-[14px] font-bold text-[#8A8A94]" onClick={() => setResetOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
