'use client';

interface DashboardHeaderProps {
  userName?: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <h1 className="text-[22px] font-bold leading-[1.15] tracking-[-0.03em] text-[#0A0A0A]">
      {userName || 'Your station'}
    </h1>
  );
}
