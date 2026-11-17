'use client';

const card = 'rounded-[24px] bg-white shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]';

export function DashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-[#E4E4E7] lg:col-span-12" />
      <div className={`${card} h-[132px] animate-pulse bg-[#EEF2F7] lg:col-span-7`} />
      <div className="flex flex-col gap-3 lg:col-span-7">
        <div className={`${card} h-[148px] animate-pulse`} />
        <div className="grid grid-cols-2 gap-3">
          <div className={`${card} h-[104px] animate-pulse`} />
          <div className={`${card} h-[104px] animate-pulse`} />
        </div>
        <div className={`${card} h-[88px] animate-pulse`} />
      </div>
      <div className="flex flex-col gap-3 lg:col-span-5">
        <div className={`${card} h-[220px] animate-pulse`} />
        <div className={`${card} h-[76px] animate-pulse`} />
      </div>
    </div>
  );
}
