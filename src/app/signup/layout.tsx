import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Create account',
  description: `Create a ${SITE_NAME} account to run operations, HR, files, and collaboration in one place. ${SITE_DESCRIPTION}`,
  alternates: {
    canonical: '/signup',
  },
  openGraph: {
    title: `Create account | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: '/signup',
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
