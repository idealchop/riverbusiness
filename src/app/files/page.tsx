
import { Metadata } from 'next';
import FilesClient from './FilesClient';
import { inAppTitle, privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: inAppTitle('Files'),
  robots: privatePageRobots,
};

export default function FilesPage() {
  return <FilesClient />;
}
