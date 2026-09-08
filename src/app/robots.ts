import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/documentation'],
        disallow: [
          '/dashboard',
          '/workspace',
          '/admin',
          '/hr-dashboard',
          '/files',
          '/onboarding',
          '/customers',
          '/public/',
          '/claim-account',
          '/verify-email',
          '/reset-password',
          '/sanitation-report',
          '/business-insurance',
          '/solar-upgrades',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
