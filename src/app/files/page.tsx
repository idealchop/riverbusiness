
import { Metadata } from 'next';
import FilesClient from './FilesClient';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Files',
  robots: privatePageRobots,
};

export default function FilesPage() {
  return <FilesClient />;
}
