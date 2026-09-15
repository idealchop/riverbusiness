import type { Metadata } from 'next';
import { inAppTitle, privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: inAppTitle('Shared page'),
  robots: privatePageRobots,
};

export default function PublicShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
