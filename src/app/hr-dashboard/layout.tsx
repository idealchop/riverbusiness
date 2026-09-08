
import { Metadata } from 'next';
import HRLayoutClient from './HRLayoutClient';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Team Hub',
  robots: privatePageRobots,
};

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return <HRLayoutClient>{children}</HRLayoutClient>;
}
