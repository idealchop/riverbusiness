
import { Metadata } from 'next';
import FilesClient from './FilesClient';

export const metadata: Metadata = {
  title: 'Files',
};

export default function FilesPage() {
  return <FilesClient />;
}
