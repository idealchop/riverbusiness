
import { Metadata } from 'next';
import VaultClient from './VaultClient';

export const metadata: Metadata = {
  title: 'PS Vault',
};

export default function PSVaultPage() {
  return <VaultClient />;
}
