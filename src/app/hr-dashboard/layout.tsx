
import { Metadata } from 'next';
import HRLayoutClient from './HRLayoutClient';
import { inAppTitle, privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: inAppTitle('Team Hub'),
  robots: privatePageRobots,
};

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return <HRLayoutClient>{children}</HRLayoutClient>;
}
