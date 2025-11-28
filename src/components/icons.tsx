import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      {...props}
    >
      <rect width="256" height="256" fill="none" />
      <path
        d="M89.3,160l-58-58a8,8,0,0,1,0-11.3l58-58a8,8,0,0,1,11.3,0l58,58a8,8,0,0,1,0,11.3l-58,58A8,8,0,0,1,89.3,160Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M194.7,160l-58-58a8,8,0,0,1,0-11.3l58-58a8,8,0,0,1,11.3,0l58,58a8,8,0,0,1,0,11.3l-58,58A8,8,0,0,1,194.7,160Z"
        opacity="0.2"
        fill="currentColor"
      />
      <path
        d="M89.3,224l-58-58a8,8,0,0,1,0-11.3l58-58a8,8,0,0,1,11.3,0l58,58a8,8,0,0,1,0,11.3l-58,58A8,8,0,0,1,89.3,224Z"
        opacity="0.2"
        fill="currentColor"
      />
    </svg>
  );
}
