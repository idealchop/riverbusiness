
import { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Admin Command Center',
  robots: privatePageRobots,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
