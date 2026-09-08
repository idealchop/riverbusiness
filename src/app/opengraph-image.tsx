import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const logo = await readFile(
    join(process.cwd(), 'public/brand/river-icon-white.png')
  );
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #020617 0%, #0F172A 50%, #0B3A4A 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <img
          src={logoSrc}
          width={220}
          height={220}
          alt=""
          style={{ objectFit: 'contain' }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginTop: 28,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: '#94A3B8',
            marginTop: 16,
            maxWidth: 880,
            textAlign: 'center',
            lineHeight: 1.35,
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size }
  );
}
