import type { Metadata } from 'next';

export const SITE_URL = 'https://app.riverph.com';
export const MARKETING_URL = 'https://riverph.com';
export const SITE_NAME = 'River Business';
export const SITE_TAGLINE =
  'AI-powered operations platform for modern businesses';
export const SITE_DESCRIPTION =
  'River Business is an AI-powered operations platform for modern businesses. Run water refill operations, workforce and HR, files, and a collaboration workspace with documents, canvas boards, and sheets.';

export const LOGO_PATH = '/brand/river-icon.png';
export const LOGO_WHITE_PATH = '/brand/river-icon-white.png';
export const LOGO_ABSOLUTE_URL = `${SITE_URL}${LOGO_PATH}`;

export const SEO_KEYWORDS = [
  'River Business',
  'RiverPH',
  'AI-powered operations platform',
  'business operations software',
  'workforce management',
  'HR software Philippines',
  'water refill business software',
  'collaboration workspace',
  'documents canvas sheets',
  'secure file sharing',
  'Philippines SaaS',
];

export const privatePageRobots: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export const privatePageMetadata: Metadata = {
  robots: privatePageRobots,
};

export function getJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${MARKETING_URL}/#organization`,
        name: 'RiverPH',
        url: MARKETING_URL,
        logo: {
          '@type': 'ImageObject',
          url: LOGO_ABSOLUTE_URL,
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: SITE_DESCRIPTION,
        image: LOGO_ABSOLUTE_URL,
        publisher: { '@id': `${MARKETING_URL}/#organization` },
        offers: {
          '@type': 'Offer',
          url: SITE_URL,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${MARKETING_URL}/#organization` },
        inLanguage: 'en-PH',
      },
    ],
  };
}
