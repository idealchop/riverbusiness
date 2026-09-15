
import { Metadata } from 'next';
import VaultClient from './VaultClient';
import { inAppTitle, privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: inAppTitle('PS Vault'),
  robots: privatePageRobots,
};

export default function PSVaultPage() {
  return <VaultClient />;
}
