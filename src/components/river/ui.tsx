'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const wordmarkSrc = new URL('../../assets/brand/river-logo-navy.svg', import.meta.url).href;
const markSrc = new URL('../../assets/brand/river-mark-navy.svg', import.meta.url).href;
const markWhiteSrc = new URL('../../assets/brand/river-mark-white.svg', import.meta.url).href;

export function Wordmark({ className }: { className?: string }) {
  return (
    // Bundled so the wordmark does not depend on public/ being copied into the App Hosting image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={wordmarkSrc} alt="River" className={cn('h-8 w-auto max-w-[148px] object-contain', className)} />
  );
}

export function RiverMark({ className, tone = 'navy' }: { className?: string; tone?: 'navy' | 'white' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={tone === 'white' ? markWhiteSrc : markSrc} alt="River" className={cn('h-12 w-auto object-contain', className)} />
  );
}

export function IconButton({
  label,
  children,
  className,
  dot,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; dot?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn('relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0A0A0A]', className)}
      {...props}
    >
      {children}
      {dot ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#F5F5F7] bg-[#DC2626]" /> : null}
    </button>
  );
}

export function RbButton({
  children,
  variant = 'primary',
  size = 'md',
  full,
  className,
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
  href?: string;
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap',
    size === 'lg' && 'h-14 px-6 text-[16px] rounded-full',
    size === 'md' && 'h-[46px] px-5 text-[15px] rounded-[14px]',
    size === 'sm' && 'h-9 px-3.5 text-[13.5px] rounded-xl',
    variant === 'primary' && 'bg-[#1A2C49] text-white shadow-[0_10px_20px_-10px_rgba(26,44,73,0.55),inset_0_1px_0_rgba(255,255,255,0.16)] disabled:bg-[#1A2C49]/45 disabled:shadow-none disabled:opacity-100',
    variant === 'secondary' && 'bg-white text-[#0A0A0A] shadow-[inset_0_0_0_1.5px_#E4E4E7]',
    variant === 'quiet' && 'bg-transparent text-[#8A8A94] underline underline-offset-[3px] shadow-none h-11 px-2 text-[14px]',
    full && 'w-full',
    variant !== 'primary' && 'disabled:opacity-60',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export function RbCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[24px] bg-white px-[18px] py-5 shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]', className)}>
      {children}
    </section>
  );
}

export function Skel({ className }: { className?: string }) {
  return <span className={cn('rb-skel block', className)} aria-hidden />;
}

export function ProgressTrack({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Requested', 'Accepted', 'On the way'] as const;
  return (
    <div className="relative mt-5 flex items-start justify-between" aria-label="Request status">
      <span className="absolute left-[18%] right-[18%] top-2 h-0.5 bg-[#D0D3DA]" />
      {labels.map((label, index) => {
        const on = index < step;
        return (
          <div key={label} className="relative z-[1] flex-1 text-center">
            <i className={cn('mx-auto mb-2 block h-[18px] w-[18px] rounded-full shadow-[0_0_0_4px_#EEF2F7]', on ? 'bg-[#1A2C49]' : 'bg-[#D0D3DA]')} />
            <span className={cn('block text-[12px] font-bold tracking-[-0.01em]', on ? 'text-[#0A0A0A]' : 'text-[#8A8A94]')}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
