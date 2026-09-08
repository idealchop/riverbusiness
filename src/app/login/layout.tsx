import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in to ${SITE_NAME}. ${SITE_DESCRIPTION}`,
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: `Sign in | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
