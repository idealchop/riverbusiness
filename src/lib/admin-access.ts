/**
 * Live admin is only admin@riverph.com.
 * On the dev App Hosting backend (NEXT_PUBLIC_APP_ENV=dev), ADMIN_EMAILS
 * (comma-separated) may add test accounts. That list is ignored unless the
 * deployment is dev, so setting it on live does not widen access.
 */
export const LIVE_ADMIN_EMAIL = 'admin@riverph.com';

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function devAdminAllowlist(): string[] {
  if ((process.env.NEXT_PUBLIC_APP_ENV || '').trim().toLowerCase() !== 'dev') return [];
  return parseAdminEmails(process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS);
}

export function isWaterAdminEmail(email: string | null | undefined, extra: readonly string[] = []): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === LIVE_ADMIN_EMAIL) return true;
  if ((process.env.NEXT_PUBLIC_APP_ENV || '').trim().toLowerCase() !== 'dev') return false;
  const list = extra.length > 0 ? extra : parseAdminEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS);
  return list.some((item) => item === normalized);
}
