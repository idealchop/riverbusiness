'use client';

import { useEffect, useState } from 'react';

let updateReady = false;
const listeners = new Set<(ready: boolean) => void>();

function publish(ready: boolean) {
  updateReady = ready;
  listeners.forEach((listener) => listener(ready));
}

export function applyAppUpdate() {
  let reloaded = false;
  const reload = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };
  navigator.serviceWorker?.addEventListener('controllerchange', reload);
  navigator.serviceWorker?.getRegistration().then((registration) => {
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage('SKIP_WAITING');
      return;
    }
    reload();
  }).catch(reload);
}

export function useAppUpdate() {
  const [ready, setReady] = useState(updateReady);

  useEffect(() => {
    listeners.add(setReady);
    setReady(updateReady);
    return () => {
      listeners.delete(setReady);
    };
  }, []);

  return { updateReady: ready, applyAppUpdate };
}

export function AppUpdateButton({ className = '' }: { className?: string }) {
  const { updateReady, applyAppUpdate: update } = useAppUpdate();
  if (!updateReady) return null;
  return (
    <div className={`pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-3 ${className}`}>
      <button
        type="button"
        onClick={update}
        className="pointer-events-auto inline-flex min-h-11 w-full max-w-[420px] items-center justify-center rounded-full bg-[#1A2C49] px-4 text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(26,44,73,0.8)]"
      >
        Update to see the latest changes
      </button>
    </div>
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting && hadController) publish(true);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) publish(true);
        });
      });
      registration.update().catch(() => undefined);
    }).catch(() => undefined);
  }, []);

  return null;
}
