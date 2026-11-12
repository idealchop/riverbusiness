'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RiverMark } from '@/components/river/ui';
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

  const labelClass = 'text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1';
  const fieldClass = 'h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-base font-bold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-300 focus:bg-white focus-visible:ring-2 focus-visible:ring-primary/20';
  const submitClass = 'w-full h-14 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] rounded-2xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60';

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-background font-sans lg:flex-row">
      <div className="relative flex min-h-[400px] w-full flex-col justify-between overflow-hidden bg-[#1A2C49] p-8 pb-48 text-white sm:p-12 md:p-20 lg:min-h-screen lg:w-[65%]">
        <div className="absolute inset-0 z-0">
          <div className="absolute left-[-8%] top-[-12%] h-[60%] w-[60%] rounded-full bg-[#3D5A80] blur-[100px]" />
          <div className="absolute bottom-[-16%] right-[-10%] h-[55%] w-[55%] rounded-full bg-[#0E1A2E] blur-[110px]" />
          <div className="absolute left-[18%] top-[38%] h-[36%] w-[36%] rounded-full bg-[#4C6E96]/40 blur-[90px]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="relative z-10 space-y-12">
          <div className="mb-16">
            <RiverMark tone="white" className="h-16" />
          </div>
          <div className="max-w-xl space-y-6">
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
              AI-powered operations for modern teams.
            </h1>
            <p className="max-w-xl text-lg font-bold leading-relaxed text-slate-400 sm:text-xl">
              Run water refill operations, workforce and HR, files, and a collaboration workspace with documents, canvas, and sheets.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-slate-50 p-4 sm:p-12 md:p-20 lg:bg-white">
        <div className="relative z-20 -mt-32 w-full space-y-12 rounded-[3rem] bg-white p-10 shadow-2xl lg:mt-0 lg:rounded-none lg:p-0 lg:shadow-none">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight text-slate-900">
              {mode === 'code' ? 'Enter the code' : 'Sign in'}
            </h2>
            <p className="text-lg font-bold text-slate-500">
              {mode === 'phone' && 'We’ll text a code to your mobile number.'}
              {mode === 'code' && `Sent to +63 ${formatNationalPhone(national)}.`}
              {mode === 'email' && 'Use the email and password on your account.'}
            </p>
          </div>

          {mode === 'phone' ? (
            <form onSubmit={textCode} className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="phone" className={labelClass}>Mobile number</label>
                <div className="flex h-14 items-center rounded-2xl border border-slate-200 bg-slate-50 px-5 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="pr-3 text-base font-bold text-slate-900">+63</span>
                  <span className="mr-3 h-5 w-px bg-slate-200" aria-hidden />
                  <input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="917 123 4567"
                    value={national}
                    onChange={(event) => { setNational(formatNationalPhone(event.target.value)); setError(''); }}
                    className="h-full w-full bg-transparent text-base font-bold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-300"
                  />
                </div>
              </div>
              <button type="submit" className={submitClass} disabled={busy}>
                {busy ? 'Sending…' : 'Text me a code'}
              </button>
            </form>
          ) : null}

          {mode === 'code' ? (
            <form onSubmit={verifyCode} className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="sms-code" className={labelClass}>SMS code</label>
                <div className="relative">
                  <div className="flex gap-2" aria-hidden>
                    {Array.from({ length: 6 }, (_, index) => (
                      <span key={index} className="grid h-14 flex-1 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-[20px] font-black tabular-nums">
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
              <button type="submit" className={submitClass} disabled={busy}>
                {busy ? 'Checking…' : 'Continue'}
              </button>
              <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                <button type="button" disabled={resendIn > 0 || busy} onClick={() => textCode()} className="font-black text-primary hover:underline disabled:text-slate-400 disabled:no-underline">
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
                <span className="mx-2">·</span>
                <button type="button" onClick={() => { setError(''); setMode('phone'); }} className="font-black text-primary hover:underline">
                  Different number
                </button>
              </p>
            </form>
          ) : null}

          {mode === 'email' ? (
            <form onSubmit={emailSignIn} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className={labelClass}>Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label htmlFor="password" className={labelClass}>Password</label>
                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline" onClick={() => setResetOpen(true)}>
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={fieldClass}
                  />
                  <button type="button" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Hide password' : 'Show password'}
                  </button>
                </div>
              </div>
              <button type="submit" className={submitClass} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : null}

          {error ? <p role="alert" className="text-sm font-bold text-destructive">{error}</p> : null}

          <div className="space-y-3 pt-4 text-center">
            {mode === 'phone' ? (
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                <button type="button" className="font-black text-primary hover:underline" onClick={() => { setError(''); setMode('email'); }}>
                  Use email instead
                </button>
              </p>
            ) : null}
            {mode === 'email' ? (
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                <button type="button" className="font-black text-primary hover:underline" onClick={() => { setError(''); setMode('phone'); }}>
                  Use phone instead
                </button>
              </p>
            ) : null}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              New here?{' '}
              <Link href="/signup" className="font-black text-primary hover:underline underline-offset-4">Sign up</Link>
            </p>
            <p className="text-xs font-bold leading-relaxed text-slate-400">
              By continuing you agree to our{' '}
              <a className="font-black text-primary hover:underline underline-offset-4" href="https://riverph.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
              {' '}and{' '}
              <a className="font-black text-primary hover:underline underline-offset-4" href="https://riverph.com/terms" target="_blank" rel="noreferrer">Terms</a>.
            </p>
          </div>
        </div>
      </div>

      <div id={RECAPTCHA_ID} className="sr-only" aria-hidden />

      {resetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/45 px-4 pb-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Reset password</h2>
            <p className="mt-2 text-base font-bold text-slate-500">We’ll email a reset link to the address above.</p>
            <button type="button" className={`${submitClass} mt-6`} disabled={busy} onClick={resetPassword}>Send reset link</button>
            <button type="button" className="mt-3 min-h-11 w-full text-xs font-black uppercase tracking-widest text-slate-400" onClick={() => setResetOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
