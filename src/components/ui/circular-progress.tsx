
'use client';
import * as React from 'react';

interface CircularProgressProps {
  value: number;
  className?: string;
  strokeWidth?: number;
  size?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  className,
  strokeWidth = 4,
  size = 40,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <circle
        className="text-transparent"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="text-white"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          transition: 'stroke-dashoffset 0.35s',
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
        }}
      />
    </svg>
  );
};
