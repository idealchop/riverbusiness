import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'River',
    description: SITE_DESCRIPTION,
    start_url: '/login',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0F172A',
    icons: [
      {
        src: '/brand/river-icon.png',
        sizes: '1920x1920',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
