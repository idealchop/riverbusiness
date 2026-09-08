import type { Metadata } from 'next';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  robots: privatePageRobots,
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
