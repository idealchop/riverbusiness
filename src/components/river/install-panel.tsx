'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Share, Star, X } from 'lucide-react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { RbButton } from '@/components/river/ui';
import { useFirestore, useUser } from '@/firebase';

type Mine = { rating: number; comment: string } | null;

function useOwnFeedback() {
  const { user } = useUser();
  const firestore = useFirestore();
  const uid = user?.uid;
  const [mine, setMine] = useState<Mine>(null);

  useEffect(() => {
    if (!firestore || !uid) return;
    let live = true;
    getDoc(doc(firestore, 'appFeedback', uid))
      .then((snap) => {
        if (!live || !snap.exists()) return;
        const data = snap.data() as { rating?: number; comment?: string };
        setMine({ rating: Number(data.rating) || 0, comment: data.comment || '' });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [firestore, uid]);

  async function submit(rating: number, comment: string) {
    if (!firestore || !uid) throw new Error('Sign in to send feedback.');
    const ref = doc(firestore, 'appFeedback', uid);
    const existing = await getDoc(ref);
    const createdAt = existing.exists() ? existing.data().createdAt : serverTimestamp();
    await setDoc(ref, {
      userId: uid,
      rating,
      comment,
      createdAt,
      updatedAt: serverTimestamp(),
    });
    setMine({ rating, comment });
  }

  return { mine, submit, signedIn: !!uid };
}

export function InstallPanel({
  features,
  openHref,
  productName = 'River Business',
}: {
  features: { art: React.ReactNode; text: string }[];
  openHref: string;
  productName?: string;
}) {
  const pwa = usePwaInstall();
  const [guide, setGuide] = useState<null | 'ios' | 'safari' | 'menu'>(null);
  const [rating, setRating] = useState(false);
  const fb = useOwnFeedback();
  const installed = pwa.installed;
  const iconSrc = new URL('../../assets/brand/icon-512.png', import.meta.url).href;

  async function onInstall() {
    if (pwa.deferred) {
      pwa.deferred.prompt();
      const choice = await pwa.deferred.userChoice;
      pwa.setDeferred(null);
      if (choice.outcome === 'accepted') pwa.setInstalled(true);
      return;
    }
    setGuide(pwa.kind);
  }

  return (
    <div className="flex flex-col items-center px-1 pb-6 pt-6 text-center">
      <div className="flex w-full items-center justify-center rounded-[32px] bg-[#ECECF1] py-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="River Business app icon" width={156} height={156} className="h-[156px] w-[156px] rounded-[36px] object-cover shadow-[0_6px_18px_rgba(0,0,0,0.12)]" />
      </div>
      <h1 className="mt-6 text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">{installed ? 'Installed!' : `Install ${productName}`}</h1>
      {installed ? (
        <p className="mt-2 max-w-[320px] text-[14.5px] font-semibold leading-snug text-[#8A8A94]">Find {productName} on your home screen.</p>
      ) : null}
      {installed ? null : (
        <ul className="mt-4 flex w-full flex-col gap-2.5 text-left">
          {features.map(({ art, text }) => (
            <li key={text} className="flex items-center gap-3 text-[14px] font-semibold">
              <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center">{art}</span>
              <span className="min-w-0">{text}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex w-full flex-col gap-2.5">
        {installed ? (
          <>
            <RbButton href={openHref} size="lg" full>Open app</RbButton>
            <p className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#ECECF1] text-[15px] font-bold" role="status">
              <CheckCircle2 size={18} aria-hidden /> Installed
            </p>
          </>
        ) : pwa.busy ? (
          <RbButton size="lg" full disabled><Loader2 size={18} className="animate-spin" /> Installing…</RbButton>
        ) : (
          <RbButton size="lg" full onClick={() => onInstall()}>Install the app</RbButton>
        )}
      </div>
      <button type="button" onClick={() => setRating(true)} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-bold text-[#8A8A94] underline underline-offset-[3px]">
        <Star size={14} aria-hidden /> {fb.mine ? `You rated ${fb.mine.rating} ★ · Edit` : 'Rate & send feedback'}
      </button>
      {guide ? <InstallHint kind={guide} onClose={() => setGuide(null)} /> : null}
      {rating ? <RateSheet fb={fb} onClose={() => setRating(false)} productName={productName} /> : null}
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'ios' | 'safari' | 'menu'>('menu');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setKind(ios ? (safari ? 'ios' : 'safari') : 'menu');
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    deferred,
    setDeferred,
    installed,
    setInstalled: (value: boolean) => {
      setBusy(false);
      setInstalled(value);
    },
    busy,
    setBusy,
    kind,
  };
}

function RateSheet({
  fb,
  onClose,
  productName,
}: {
  fb: ReturnType<typeof useOwnFeedback>;
  onClose: () => void;
  productName: string;
}) {
  const [stars, setStars] = useState(fb.mine?.rating ?? 0);
  const [comment, setComment] = useState(fb.mine?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!stars) {
      setError('Tap a star to rate.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await fb.submit(stars, comment.trim());
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rate-title">
      <button type="button" className="absolute inset-0 bg-[#0A0A0A]/45" aria-label="Dismiss" onClick={onClose} />
      <div className="relative z-[1] w-full max-w-[440px] rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 text-left sm:rounded-[28px]">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F4F6]"><X size={18} /></button>
        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 size={40} className="mx-auto" />
            <h2 id="rate-title" className="mt-3 text-[20px] font-extrabold tracking-[-0.02em]">Thank you</h2>
            <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">Your feedback helps us make {productName} better.</p>
            <RbButton className="mt-5" size="lg" full onClick={onClose}>Done</RbButton>
          </div>
        ) : !fb.signedIn ? (
          <>
            <h2 id="rate-title" className="pr-10 text-[20px] font-extrabold tracking-[-0.02em]">Rate {productName}</h2>
            <p className="mt-2 text-[14px] font-semibold text-[#8A8A94]">Sign in so this review stays on your account. You can edit it later.</p>
          </>
        ) : (
          <>
            <h2 id="rate-title" className="pr-10 text-[20px] font-extrabold tracking-[-0.02em]">Rate {productName}</h2>
            <p className="mt-2 text-[14px] font-semibold text-[#8A8A94]">Tell us what to improve. You can edit this review later.</p>
            <div role="radiogroup" aria-label="Rating" className="mt-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setStars(n)} className="inline-flex h-11 w-11 items-center justify-center">
                  <Star size={32} strokeWidth={1.75} className={n <= stars ? 'fill-[#0A0A0A] text-[#0A0A0A]' : 'text-[#B4B4BC]'} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell us what to improve (optional)"
              aria-label="Feedback"
              className="mt-4 w-full resize-none rounded-[16px] bg-[#F4F4F6] px-3.5 py-3 text-[16px] font-semibold outline-none placeholder:text-[#8A8A94]"
            />
            {error ? <p className="mt-2 text-[13px] font-semibold" role="alert">{error}</p> : null}
            <RbButton className="mt-4" size="lg" full onClick={() => send()} disabled={busy}>{busy ? 'Sending…' : 'Post'}</RbButton>
          </>
        )}
      </div>
    </div>
  );
}

function InstallHint({ kind, onClose }: { kind: 'ios' | 'safari' | 'menu'; onClose: () => void }) {
  const line = kind === 'ios'
    ? <>Tap <Share size={16} className="mx-0.5 inline align-[-2px]" aria-label="Share" />, then <b>Add to Home Screen</b></>
    : kind === 'safari'
      ? <>Open this page in <b>Safari</b> to install</>
      : <>Open the browser menu, then <b>Install app</b> or <b>Add to Home Screen</b></>;
  return (
    <button type="button" onClick={onClose} aria-label="Close install hint" className="fixed inset-0 z-[80] bg-[#0A0A0A]/55 text-left">
      <span role="status" className="absolute inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
        <span className="rounded-[16px] bg-white px-4 py-3 text-[14.5px] font-semibold text-[#0A0A0A] shadow-[0_10px_28px_-10px_rgba(16,16,24,0.2)]">{line}</span>
        <span aria-hidden className="animate-bounce text-[34px] leading-none text-white">↓</span>
      </span>
    </button>
  );
}

export function CustomerInstallScreen() {
  return (
    <InstallPanel
      openHref="/dashboard"
      features={[
        { art: <DropArt />, text: 'Request a refill and track your deliveries from your phone' },
        { art: <BillArt />, text: 'See your bills and pay statements in one place' },
        { art: <HomeArt />, text: 'Open River Business from your home screen' },
      ]}
    />
  );
}

export function AdminInstallScreen() {
  return (
    <InstallPanel
      openHref="/admin"
      features={[
        { art: <DropArt />, text: 'Track refill requests and deliveries from your phone' },
        { art: <BillArt />, text: 'Review billing ledgers and send statements' },
        { art: <HomeArt />, text: 'Open River Business from your home screen' },
      ]}
    />
  );
}

function DropArt() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <path d="M15 4c0 0-7 8.2-7 13.2A7 7 0 0 0 15 24a7 7 0 0 0 7-6.8C22 12.2 15 4 15 4Z" fill="#1A2C49" />
      <path d="M12.2 16.8c.4-2.2 1.6-3.8 2.8-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function BillArt() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <path d="M8 5h14v20l-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4-2.2-1.4L8 25V5Z" fill="#1A2C49" />
      <path d="M12 11h8M12 15h8M12 19h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function HomeArt() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <path d="M5 14 15 5l10 9v11a1 1 0 0 1-1 1h-6v-7h-6v7H6a1 1 0 0 1-1-1V14Z" fill="#1A2C49" />
    </svg>
  );
}
