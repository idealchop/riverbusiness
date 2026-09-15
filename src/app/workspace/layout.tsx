
import { Metadata } from 'next';
import WorkspaceLayoutClient from './WorkspaceLayoutClient';
import { inAppTitle, privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: inAppTitle('Collaboration'),
  robots: privatePageRobots,
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>;
}
