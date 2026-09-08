
import { Metadata } from 'next';
import VaultClient from './VaultClient';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'PS Vault',
  robots: privatePageRobots,
};

export default function PSVaultPage() {
  return <VaultClient />;
}
