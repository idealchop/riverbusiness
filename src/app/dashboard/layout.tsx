
import { Metadata } from 'next';
import DashboardLayoutClient from './DashboardLayoutClient';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Water Refill',
  robots: privatePageRobots,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
