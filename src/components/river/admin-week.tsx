'use client';

import { useMemo, useState } from 'react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import type { AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function WeekDeliveries({ users, onOpenUser }: { users: AppUser[]; onOpenUser: (user: AppUser) => void }) {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(anchor, index)), [anchor]);
  const label = `${format(days[0], 'd')}–${format(days[6], 'd MMM yyyy')}`;

  return (
    <section className="mt-6 rounded-[24px] bg-white p-4 shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)] md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">This week’s deliveries</h2>
        <div className="flex items-center gap-1 text-[13px] font-bold text-[#3F3F46]">
          <button type="button" aria-label="Previous week" className="grid h-11 w-9 place-items-center text-lg" onClick={() => setAnchor((day) => addDays(day, -7))}>‹</button>
          <span className="min-w-[8.5rem] text-center">{label}</span>
          <button type="button" aria-label="Next week" className="grid h-11 w-9 place-items-center text-lg" onClick={() => setAnchor((day) => addDays(day, 7))}>›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayName = format(day, 'EEEE');
          const scheduled = users.filter((user) => user.customPlanDetails?.autoRefillEnabled !== false && user.customPlanDetails?.deliveryDay === dayName && user.subscriptionStatus === 'activated');
          const today = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={cn('min-h-[92px] rounded-[16px] px-1.5 py-2', today ? 'bg-[#EEF2F7]' : 'bg-[#F7F7F9]')}>
              <p className="text-center text-[11px] font-bold uppercase tracking-wide text-[#8A8A94]">{format(day, 'EEE')}</p>
              <p className="text-center text-[16px] font-extrabold">{format(day, 'd')}</p>
              <div className="mt-1 space-y-1">
                {scheduled.slice(0, 2).map((user) => (
                  <button key={user.id} type="button" onClick={() => onOpenUser(user)} className="block w-full truncate rounded-full bg-white px-1.5 py-1 text-left text-[10px] font-bold text-[#1A2C49]">
                    {(user.businessName || '').split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
