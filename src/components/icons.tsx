import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M12 2L7 7c-1.5 1.5-1.5 4.5 0 6s4.5 1.5 6 0l5-5c1.5-1.5 1.5-4.5 0-6s-4.5-1.5-6 0z" />
      <path d="M12 22s-7-4-7-9c0-4.4 3.6-8 8-8s8 3.6 8 8c0 5-7 9-7 9z" fill="currentColor" opacity="0.2" />
      <path d="M12 12v10" />
      <path d="M12 2L7 7" />
    </svg>
  );
}
