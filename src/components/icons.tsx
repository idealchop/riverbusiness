import type { SVGProps } from "react";
import Image from 'next/image';

export function Logo(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <div className={`relative ${props.className || ''}`}>
      <Image
        src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-logo.png?alt=media&token=acd98ddc-59df-485e-93aa-d70424ff6ad8"
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
        src="https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-logo-black.png?alt=media&token=14b9f3ef-02e2-4167-8a8c-5fb97d8217c0"
        alt="River Business Logo"
        fill
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}
