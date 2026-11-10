/**
 * Phone sign-in and existing River Business profiles.
 *
 * Firebase Phone Auth creates or resumes an Auth user whose uid is the phone
 * account. The business profile is still `users/{uid}` — the same document
 * email/password accounts use.
 *
 * A phone number is attached to an existing email account only when that
 * signed-in user links it (`linkWithPhoneNumber` from Settings). Linking keeps
 * one uid, so deliveries, billing, and the client id stay on the original doc.
 * We then store `users/{uid}.phoneE164` (`+63…`) and, if contact number was
 * empty, `contactNumber`.
 *
 * Signing in with a phone that was never linked does not open someone else's
 * profile, even when `contactNumber` matches. The person is signed out and
 * asked to use email, then link the phone. A phone with no profile at all
 * continues to the existing claim / create-workspace flow.
 *
 * The Phone sign-in provider has to be enabled in Firebase Auth for the live
 * project and for dev. This app does not turn that on.
 */
import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';
import { collection, getDocs, limit, query, where, type Firestore } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

function resetVerifier() {
  try { verifier?.clear(); } catch { /* already cleared */ }
  verifier = null;
}

export function nationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function formatNationalPhone(raw: string): string {
  const digits = nationalDigits(raw);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}

/** +639XXXXXXXXX, or null when the national number is not 10 digits starting with 9. */
export function toE164Ph(raw: string): string | null {
  const digits = nationalDigits(raw);
  if (!/^9\d{9}$/.test(digits)) return null;
  return `+63${digits}`;
}

export function phoneLookupKeys(e164: string): string[] {
  const national = e164.replace(/^\+63/, '');
  return Array.from(new Set([e164, national, `0${national}`, `63${national}`]));
}

export async function sendPhoneCode(auth: Auth, e164: string, containerId: string) {
  resetVerifier();
  verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    'expired-callback': resetVerifier,
  });
  try {
    confirmation = await signInWithPhoneNumber(auth, e164, verifier);
  } catch (error) {
    resetVerifier();
    throw error;
  }
}

export async function confirmPhoneCode(code: string) {
  if (!confirmation) throw new Error('Your code expired. Request a new one.');
  const result = await confirmation.confirm(code);
  confirmation = null;
  return result;
}

export async function startPhoneLink(auth: Auth, e164: string, containerId: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in first.');
  resetVerifier();
  verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    'expired-callback': resetVerifier,
  });
  try {
    confirmation = await linkWithPhoneNumber(current, e164, verifier);
  } catch (error) {
    resetVerifier();
    throw error;
  }
}

export async function findProfileByPhone(firestore: Firestore, e164: string): Promise<AppUser | null> {
  const keys = phoneLookupKeys(e164);
  const fields = ['phoneE164', 'contactNumber'] as const;
  for (const field of fields) {
    for (const key of keys) {
      const snap = await getDocs(query(collection(firestore, 'users'), where(field, '==', key), limit(1)));
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return { id: docSnap.id, ...(docSnap.data() as Omit<AppUser, 'id'>) };
      }
    }
  }
  return null;
}

export function phoneAuthMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('invalid-verification-code')) return 'That code is not right. Check it and try again.';
  if (code.includes('code-expired')) return 'That code expired. Request a new one.';
  if (code.includes('invalid-phone-number')) return 'Enter a valid PH mobile number.';
  if (code.includes('too-many-requests')) return 'Too many tries. Wait a few minutes and try again.';
  if (code.includes('operation-not-allowed')) return 'Phone sign-in is not turned on for this project yet.';
  if (code.includes('captcha') || code.includes('invalid-app-credential')) return 'Could not confirm this browser. Reload and try again.';
  if (code.includes('credential-already-in-use') || code.includes('account-exists')) return 'That number is already used by another sign-in.';
  if (code.includes('billing-not') || code.includes('quota')) return 'Text codes are not available right now. Use email instead.';
  return (error as Error)?.message || 'Something went wrong. Try again.';
}
