import type { SVGProps } from "react";
import Image from 'next/image';
import { LOGO_PATH } from '@/lib/seo';

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={`relative ${className || ''}`}>
      <Image
        src={LOGO_PATH}
        alt="River Business"
        fill
        sizes="96px"
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

export function Logo(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return <BrandMark className={props.className} />;
}

export function LogoBlack(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return <BrandMark className={props.className} />;
}
