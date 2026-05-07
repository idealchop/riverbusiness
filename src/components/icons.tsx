import type { SVGProps } from "react";
import Image from 'next/image';

export function Logo(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <div className={`relative ${props.className || ''}`}>
      <Image
        src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-white-v2.png?alt=media&token=6c25e9e2-9375-4f03-a0ab-e32cd98b8b49"
        alt="River Business Logo"
        fill
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

export function LogoBlack(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <div className={`relative ${props.className || ''}`}>
      <Image
        src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-black-v2.png?alt=media&token=d4f3245a-e8bb-4f64-86b2-6282c4beb453"
        alt="River Business Logo"
        fill
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}
