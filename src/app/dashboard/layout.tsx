
import { Metadata } from 'next';
import DashboardLayoutClient from './DashboardLayoutClient';

export const metadata: Metadata = {
  title: 'Water Refill',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
