const SCREEN_KEY = 'rb-last-screen';

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function readLastScreen(): string | null {
  if (!canUseStorage()) return null;
  try {
    const value = localStorage.getItem(SCREEN_KEY);
    if (!value) return null;
    if (value.startsWith('/dashboard') || value.startsWith('/admin')) return value;
    return null;
  } catch {
    return null;
  }
}

export function writeLastScreen(path: string) {
  if (!canUseStorage()) return;
  if (!path.startsWith('/dashboard') && !path.startsWith('/admin')) return;
  try {
    localStorage.setItem(SCREEN_KEY, path);
  } catch {
    /* private mode */
  }
}

function revive(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(revive);
  const record = value as Record<string, unknown>;
  if (typeof record.seconds === 'number' && typeof record.nanoseconds === 'number' && Object.keys(record).length <= 3) {
    return new Date(record.seconds * 1000).toISOString();
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) next[key] = revive(child);
  return next;
}

export function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return revive(JSON.parse(raw)) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  try {
    const raw = JSON.stringify(value, (_key, child) => {
      if (child && typeof child === 'object' && typeof (child as { toDate?: () => Date }).toDate === 'function') {
        const date = (child as { toDate: () => Date }).toDate();
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      }
      return child;
    });
    if (raw.length > 450_000) return;
    localStorage.setItem(key, raw);
  } catch {
    /* quota */
  }
}
