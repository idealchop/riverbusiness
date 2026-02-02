
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Delivery, AppUser } from '@/lib/types';
import { format, subDays, getWeekOfMonth, endOfMonth, getYear, getMonth, startOfYear, endOfYear, isWithinInterval, startOfMonth } from 'date-fns';
import { History, Users } from 'lucide-react';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label, isParent }: { active?: boolean, payload?: any[], label?: string, isParent?: boolean }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalLiters = data.value || 0;
        const totalContainers = data.containers || 0;
        const branchBreakdown = data.branchBreakdown || {};

        const tooltipLabel = data.name;

        return (
            <div className="p-2 text-xs bg-background border rounded-lg shadow-lg min-w-[150px]">
                <p className="font-bold mb-1">{tooltipLabel}</p>
                <p className="text-sm text-primary font-semibold">{`${totalLiters.toLocaleString(undefined, {maximumFractionDigits: 0})} L`} <span className="text-muted-foreground font-normal">/ {`${totalContainers.toLocaleString()} Containers`}</span></p>
                {isParent && Object.keys(branchBreakdown).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-bold mb-1">Breakdown by Branch:</p>
                        <ul className="space-y-0.5">
                            {Object.entries(branchBreakdown).map(([branchName, branchData]: [string, any]) => (
                                <li key={branchName} className="flex justify-between items-center">
                                    <span>{branchName}:</span>
                                    <span className="font-medium">{branchData.liters.toLocaleString(undefined, {maximumFractionDigits: 0})} L</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }
    return null;
};


interface ConsumptionAnalyticsProps {
  deliveries: Delivery[] | null;
  onHistoryClick: () => void;
  isParent?: boolean;
  branches?: AppUser[] | null;
}

export function ConsumptionAnalytics({ deliveries, onHistoryClick, isParent = false, branches = [] }: ConsumptionAnalyticsProps) {
  const [analyticsFilter, setAnalyticsFilter] = useState<'weekly' | 'monthly' | 'yearly' | '2025'>('monthly');

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
    let cycleStart: Date;
    let cycleEnd: Date;
    
    switch (analyticsFilter) {
      case 'weekly':
        cycleStart = subDays(now, 6);
        cycleEnd = now;
        break;
      case 'monthly':
        cycleStart = startOfMonth(now);
        cycleEnd = endOfMonth(now);
        break;
      case 'yearly':
        cycleStart = startOfYear(now);
        cycleEnd = endOfYear(now);
        break;
      case '2025':
        cycleStart = new Date(2025, 0, 1);
        cycleEnd = new Date(2025, 11, 31);
        break;
      default:
        cycleStart = startOfMonth(now);
        cycleEnd = endOfMonth(now);
    }
    
    const filteredDeliveries = sourceDeliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });

    if (analyticsFilter === 'weekly') {
      const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
      return last7Days.map((date) => {
          const deliveriesOnDay = filteredDeliveries.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
          const totalLiters = deliveriesOnDay.reduce((sum, d) => sum + (d.liters || 0), 0);
          const totalContainers = deliveriesOnDay.reduce((sum, d) => sum + d.volumeContainers, 0);
          const branchBreakdown: { [key: string]: { liters: number; containers: number } } = {};
          if (isParent) {
            deliveriesOnDay.forEach(d => {
              const branchName = branchIdToNameMap[d.userId] || `Unknown (${d.userId.substring(0,5)})`;
              if (!branchBreakdown[branchName]) branchBreakdown[branchName] = { liters: 0, containers: 0 };
              branchBreakdown[branchName].liters += (d.liters || 0);
              branchBreakdown[branchName].containers += d.volumeContainers;
            });
          }
          return {
              name: format(date, 'MMM d'),
              displayName: format(date, 'EEE').charAt(0),
              value: totalLiters,
              containers: totalContainers,
              branchBreakdown,
          };
      });
    } else if (analyticsFilter === 'monthly') {
        const weeksInMonth = getWeekOfMonth(endOfMonth(now));

        const weeklyData = Array.from({ length: weeksInMonth }, (_, i) => ({
          name: `Week ${i + 1}`,
          displayName: `W${i + 1}`,
          value: 0,
          containers: 0,
          branchBreakdown: {} as { [key: string]: { liters: number; containers: number } },
        }));

        filteredDeliveries.forEach(d => {
          const deliveryDate = new Date(d.date);
          const weekOfMonth = getWeekOfMonth(deliveryDate) -1;
          if(weeklyData[weekOfMonth]) {
              const liters = d.liters || 0;
              weeklyData[weekOfMonth].value += liters;
              weeklyData[weekOfMonth].containers += d.volumeContainers;
              if (isParent) {
                const branchName = branchIdToNameMap[d.userId] || `Unknown (${d.userId.substring(0,5)})`;
                if (!weeklyData[weekOfMonth].branchBreakdown[branchName]) {
                  weeklyData[weekOfMonth].branchBreakdown[branchName] = { liters: 0, containers: 0 };
                }
                weeklyData[weekOfMonth].branchBreakdown[branchName].liters += liters;
                weeklyData[weekOfMonth].branchBreakdown[branchName].containers += d.volumeContainers;
              }
          }
        });
        return weeklyData;
    } else { // yearly or 2025
        const year = analyticsFilter === '2025' ? 2025 : getYear(now);
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(year, i), 'MMMM'),
            displayName: format(new Date(year, i), 'MMM'),
            value: 0,
            containers: 0,
            branchBreakdown: {} as { [key: string]: { liters: number; containers: number } },
        }));

        filteredDeliveries.forEach(d => {
            const deliveryDate = new Date(d.date);
            const month = getMonth(deliveryDate);
            const liters = d.liters || 0;
            monthlyData[month].value += liters;
            monthlyData[month].containers += d.volumeContainers;
            if (isParent) {
              const branchName = branchIdToNameMap[d.userId] || `Unknown (${d.userId.substring(0,5)})`;
              if (!monthlyData[month].branchBreakdown[branchName]) {
                monthlyData[month].branchBreakdown[branchName] = { liters: 0, containers: 0 };
              }
              monthlyData[month].branchBreakdown[branchName].liters += liters;
              monthlyData[month].branchBreakdown[branchName].containers += d.volumeContainers;
            }
        });
        return monthlyData;
    }
  }, [deliveries, analyticsFilter, isParent, branchIdToNameMap]);

  const cardTitle = isParent ? 'Branch Consumption' : 'Consumption Analytics';
  const cardDescription = isParent ? 'Monitor total water usage across all your branches over time.' : 'A look at your water usage over time.';

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            {isParent ? <Users className="h-5 w-5 text-primary" /> : null}
            {cardTitle}
          </CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={analyticsFilter} onValueChange={(value) => setAnalyticsFilter(value as 'weekly' | 'monthly' | 'yearly' | '2025')}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onHistoryClick} variant="outline" className="w-full sm:w-auto">
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="displayName" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${(value as number).toLocaleString()}`}
                />
                <Tooltip
                    cursor={{ fill: 'hsla(var(--accent))' }}
                    content={<CustomTooltip isParent={isParent} />}
                />
                <Bar dataKey="value" radius={[16, 16, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
