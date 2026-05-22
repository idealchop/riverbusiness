
import { Metadata } from 'next';
import HRLayoutClient from './HRLayoutClient';

export const metadata: Metadata = {
  title: 'Team Hub',
};

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return <HRLayoutClient>{children}</HRLayoutClient>;
}
