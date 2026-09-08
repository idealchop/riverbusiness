import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const paths = [
    { path: '/login', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/signup', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/documentation', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/documentation/payments', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/documentation/refills', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/documentation/compliance', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/documentation/account', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/documentation/security', changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
