
import { Metadata } from 'next';
import WorkspaceLayoutClient from './WorkspaceLayoutClient';

export const metadata: Metadata = {
  title: 'Collaboration',
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>;
}
