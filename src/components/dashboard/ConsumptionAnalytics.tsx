'use client';

import React, { useMemo, useState } from 'react';
import { Delivery, AppUser } from '@/lib/types';
import { getWeekOfMonth, endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface ChartPoint {
  name: string;
  displayName: string;
  value: number;
  containers: number;
  branchBreakdown: Record<string, { liters: number; containers: number }>;
}

interface ConsumptionAnalyticsProps {
  deliveries: Delivery[] | null;
  onHistoryClick: () => void;
  isParent?: boolean;
  branches?: AppUser[] | null;
}

export function ConsumptionAnalytics({ deliveries, onHistoryClick, isParent = false, branches = [] }: ConsumptionAnalyticsProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const branchIdToNameMap = useMemo(() => {
    if (!branches) return {};
    return branches.reduce((acc, branch) => {
        acc[branch.id] = branch.businessName;
        return acc;
    }, {} as Record<string, string>);
  }, [branches]);

  const consumptionChartData = useMemo(() => {
    const sourceDeliveries = deliveries || [];
    const now = new Date();
    const cycleStart = startOfMonth(now);
    const cycleEnd = endOfMonth(now);
    const filteredDeliveries = sourceDeliveries.filter((delivery) => {
      const deliveryDate = new Date(delivery.date);
      return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });

    const weeksInMonth = getWeekOfMonth(endOfMonth(now));
    const weeklyData: ChartPoint[] = Array.from({ length: weeksInMonth }, (_, index) => ({
      name: `Week ${index + 1}`,
      displayName: `W${index + 1}`,
      value: 0,
      containers: 0,
      branchBreakdown: {},
    }));

    filteredDeliveries.forEach((delivery) => {
      const weekOfMonth = getWeekOfMonth(new Date(delivery.date)) - 1;
      const bucket = weeklyData[weekOfMonth];
      if (!bucket) return;
      const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers);
      bucket.value += liters;
      bucket.containers += delivery.volumeContainers;
      if (isParent) {
        const branchName = branchIdToNameMap[delivery.userId] || 'Branch';
        if (!bucket.branchBreakdown[branchName]) bucket.branchBreakdown[branchName] = { liters: 0, containers: 0 };
        bucket.branchBreakdown[branchName].liters += liters;
        bucket.branchBreakdown[branchName].containers += delivery.volumeContainers;
      }
    });

    return weeklyData;
  }, [deliveries, isParent, branchIdToNameMap]);

  const max = Math.max(...consumptionChartData.map((point) => point.value), 0);
  const empty = max <= 0;
  const active = selected !== null ? consumptionChartData[selected] : null;

  return (
    <section className="rounded-[24px] bg-white px-[18px] py-5 shadow-[0_1px_2px_rgba(16,16,24,0.04),0_10px_28px_-10px_rgba(16,16,24,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[#8A8A94]">Consumption</p>
          <p className="mt-1.5 text-[20px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#1A2C49]">This month</p>
        </div>
        <button
          type="button"
          onClick={onHistoryClick}
          className="inline-flex h-9 items-center rounded-xl bg-white px-3.5 text-[13.5px] font-bold text-[#0A0A0A] shadow-[inset_0_0_0_1.5px_#E4E4E7]"
        >
          History
        </button>
      </div>

      <div className="mt-3 flex h-[120px] items-end gap-2.5 px-1 pt-2" role="img" aria-label="Consumption this month">
        {consumptionChartData.map((point, index) => {
          const height = empty ? 8 : Math.max(8, (point.value / max) * 100);
          const on = selected === index;
          return (
            <button
              key={point.displayName}
              type="button"
              className="flex h-full flex-1 items-end"
              aria-label={`${point.name}, ${Math.round(point.value)} liters`}
              aria-pressed={on}
              onClick={() => setSelected(on ? null : index)}
            >
              <span
                className={cn('block w-full rounded-t-[6px] rounded-b-[2px]', point.value > 0 ? 'bg-[#1A2C49]' : 'bg-[#EEF2F7]', on && 'outline outline-2 outline-offset-2 outline-[#1A2C49]/30')}
                style={{ height: `${height}%`, minHeight: 6 }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#B4B4BC]">
        {consumptionChartData.map((point) => (
          <span key={point.displayName} className="flex-1 text-center">{point.displayName}</span>
        ))}
      </div>

      {active ? (
        <div className="mt-2">
          <p className="text-[13px] font-semibold text-[#8A8A94]">
            {active.name} · {active.value.toLocaleString('en-PH', { maximumFractionDigits: 0 })} L
            {active.containers > 0 ? ` · ${active.containers.toLocaleString('en-PH')} containers` : ''}
          </p>
          {isParent && Object.keys(active.branchBreakdown).length > 0 ? (
            <ul className="mt-1 space-y-1">
              {Object.entries(active.branchBreakdown).map(([branchName, branchData]) => (
                <li key={branchName} className="flex justify-between text-[13px] font-semibold text-[#8A8A94]">
                  <span className="truncate pr-3">{branchName}</span>
                  <span className="shrink-0 text-[#1A2C49]">{branchData.liters.toLocaleString('en-PH', { maximumFractionDigits: 0 })} L</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : empty ? (
        <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">No deliveries recorded this month.</p>
      ) : null}
    </section>
  );
}
