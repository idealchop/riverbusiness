'use client';

import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RbButton } from '@/components/river/ui';
import {
  confirmPhoneCode,
  formatNationalPhone,
  phoneAuthMessage,
  startPhoneLink,
  toE164Ph,
} from '@/lib/phone-auth';

const RECAPTCHA_ID = 'settings-recaptcha';

/** Links a PH mobile onto the signed-in account so later phone sign-in uses the same user doc. */
export function LinkPhoneControl({ linked, contactNumber }: { linked?: string; contactNumber?: string }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [national, setNational] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const e164 = toE164Ph(national);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  if (linked) {
    return (
      <div className="py-2">
        <p className="text-[12px] font-semibold text-[#8A8A94]">Phone</p>
        <p className="mt-0.5 text-[15px] font-bold">{linked}</p>
      </div>
    );
  }

  async function send() {
    if (!auth || !e164) {
      setError('Enter a 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await startPhoneLink(auth, e164, RECAPTCHA_ID);
      setResendIn(60);
      setStep('code');
    } catch (cause) {
      setError(phoneAuthMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!auth?.currentUser || !firestore || !e164 || code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      await confirmPhoneCode(code);
      await updateDoc(doc(firestore, 'users', auth.currentUser.uid), {
        phoneE164: e164,
        ...(contactNumber ? {} : { contactNumber: e164 }),
      });
      toast({ title: 'Phone linked', description: 'You can sign in with this number next time.' });
      setOpen(false);
    } catch (cause) {
      setError(phoneAuthMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="flex min-h-11 w-full items-center text-left text-[15.5px] font-extrabold" onClick={() => { setOpen(true); setStep('number'); setError(''); }}>
        Add phone number
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#0A0A0A]/45" aria-label="Dismiss" onClick={() => setOpen(false)} />
          <div className="relative z-[1] w-full max-w-[440px] rounded-t-[28px] bg-white px-5 pb-6 pt-5 sm:rounded-[28px]">
            <h2 className="text-[20px] font-extrabold">{step === 'number' ? 'Add your mobile number' : 'Enter the code'}</h2>
            <p className="mt-2 text-[14px] font-semibold text-[#8A8A94]">This links the number to the account you are signed in with.</p>
            {step === 'number' ? (
              <>
                <div className="mt-4 flex h-14 items-center gap-2 rounded-[16px] bg-[#F4F4F6] px-3.5">
                  <span className="text-[16px] font-bold">+63</span>
                  <input inputMode="numeric" autoComplete="tel-national" value={national} onChange={(event) => setNational(formatNationalPhone(event.target.value))} className="h-full w-full bg-transparent text-[16px] font-semibold outline-none" />
                </div>
                <RbButton size="lg" full className="mt-4" disabled={!e164 || busy} onClick={send}>{busy ? 'Sending…' : 'Text me a code'}</RbButton>
              </>
            ) : (
              <>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-4 h-14 w-full rounded-[16px] bg-[#F4F4F6] px-3.5 text-center text-[16px] font-semibold tracking-[0.3em] outline-none" />
                <RbButton size="lg" full className="mt-4" disabled={code.length !== 6 || busy} onClick={confirm}>{busy ? 'Linking…' : 'Link phone'}</RbButton>
                <button type="button" disabled={resendIn > 0 || busy} onClick={send} className="mt-2 min-h-11 w-full text-[14px] font-bold text-[#8A8A94] underline underline-offset-[3px] disabled:no-underline">
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
              </>
            )}
            {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-[#C2410C]">{error}</p> : null}
            <div id={RECAPTCHA_ID} className="sr-only" />
          </div>
        </div>
      ) : null}
    </>
  );
}
