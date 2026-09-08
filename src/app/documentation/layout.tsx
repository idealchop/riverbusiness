import type { Metadata } from 'next';
import DocumentationLayoutClient from './DocumentationLayoutClient';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Resources',
  description: `Guides for ${SITE_NAME}: refill operations, billing, compliance, account security, and how to use the platform.`,
  alternates: {
    canonical: '/documentation',
  },
};

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocumentationLayoutClient>{children}</DocumentationLayoutClient>;
}
