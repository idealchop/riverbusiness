import type { Metadata } from 'next';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shared page',
  robots: privatePageRobots,
};

export default function PublicShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
