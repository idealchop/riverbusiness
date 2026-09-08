import { getJsonLd } from '@/lib/seo';

export function SeoJsonLd() {
  const jsonLd = getJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
