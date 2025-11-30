import type { SVGProps } from "react";
import Image from 'next/image';

export function Logo(props: SVGProps<SVGSVGElement> & { width?: number; height?: number }) {
  return (
    <div style={{ width: '100%', height: 'auto', position: 'relative' }} className={props.className}>
        <Image
        src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c"
        alt="River Business Logo"
        width={props.width || 0}
        height={props.height || 0}
        sizes="100vw"
        style={{ width: '100%', height: 'auto' }}
        unoptimized
        />
    </div>
  );
}
