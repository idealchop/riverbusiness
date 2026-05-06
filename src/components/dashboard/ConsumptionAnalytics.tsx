
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Delivery, AppUser } from '@/lib/types';
import { format, subDays, getWeekOfMonth, endOfMonth, getYear, getMonth, startOfYear, endOfYear, isWithinInterval, startOfMonth } from 'date-fns';
import { History, Users, Info, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

const CustomTooltip = ({ active, payload, label, isParent }: { active?: boolean, payload?: any[], label?: string, isParent?: boolean }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalLiters = data.value || 0;
        const totalContainers = data.containers || 0;
        const branchBreakdown = data.branchBreakdown || {};

        return (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xl min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{data.name}</p>
                <div className="space-y-1 mb-3">
                    <p className="text-2xl font-black text-slate-900">{totalLiters.toLocaleString(undefined, {maximumFractionDigits: 0})} L</p>
                    <p className="text-xs font-bold text-primary uppercase tracking-tighter">{totalContainers.toLocaleString()} Total Containers</p>
                </div>
                {isParent && Object.keys(branchBreakdown).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                            <Users className="h-3 w-3" /> Branch Activity
                        </p>
                        <ul className="space-y-2">
                            {Object.entries(branchBreakdown).map(([branchName, branchData]: [string, any]) => (
                                <li key={branchName} className="flex justify-between items-center text-xs group">
                                    <span className="text-muted-foreground group-hover:text-slate-900 transition-colors font-medium truncate pr-4">{branchName}</span>
                                    <span className="font-bold text-slate-900 shrink-0">{branchData.liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L</span>
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
        cycleStart = subDays(now, 6); cycleEnd = now; break;
      case 'monthly':
        cycleStart = startOfMonth(now); cycleEnd = endOfMonth(now); break;
      case 'yearly':
        cycleStart = startOfYear(now); cycleEnd = endOfYear(now); break;
      case '2025':
        cycleStart = new Date(2025, 0, 1); cycleEnd = new Date(2025, 11, 31); break;
      default:
        cycleStart = startOfMonth(now); cycleEnd = endOfMonth(now);
    }
    
    const filteredDeliveries = sourceDeliveries.filter(d => {
        const deliveryDate = new Date(d.date);
        return isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd });
    });

    if (analyticsFilter === 'weekly') {
      const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
      return last7Days.map((date) => {
          const deliveriesOnDay = filteredDeliveries.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
          const totalLiters = deliveriesOnDay.reduce((sum, d) => sum + (d.liters ?? containerToLiter(d.volumeContainers)), 0);
          const totalContainers = deliveriesOnDay.reduce((sum, d) => sum + d.volumeContainers, 0);
          const branchBreakdown: { [key: string]: { liters: number; containers: number } } = {};
          if (isParent) {
            deliveriesOnDay.forEach(d => {
              const branchName = branchIdToNameMap[d.userId] || `Unknown Branch`;
              if (!branchBreakdown[branchName]) branchBreakdown[branchName] = { liters: 0, containers: 0 };
              branchBreakdown[branchName].liters += (d.liters ?? containerToLiter(d.volumeContainers));
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
          name: `Week ${i + 1}`, displayName: `W${i + 1}`, value: 0, containers: 0, branchBreakdown: {} as any,
        }));
        filteredDeliveries.forEach(d => {
          const deliveryDate = new Date(d.date);
          const weekOfMonth = getWeekOfMonth(deliveryDate) - 1;
          if(weeklyData[weekOfMonth]) {
              const liters = d.liters ?? containerToLiter(d.volumeContainers);
              weeklyData[weekOfMonth].value += liters;
              weeklyData[weekOfMonth].containers += d.volumeContainers;
              if (isParent) {
                const branchName = branchIdToNameMap[d.userId] || `Branch`;
                if (!weeklyData[weekOfMonth].branchBreakdown[branchName]) weeklyData[weekOfMonth].branchBreakdown[branchName] = { liters: 0, containers: 0 };
                weeklyData[weekOfMonth].branchBreakdown[branchName].liters += liters;
                weeklyData[weekOfMonth].branchBreakdown[branchName].containers += d.volumeContainers;
              }
          }
        });
        return weeklyData;
    } else {
        const year = analyticsFilter === '2025' ? 2025 : getYear(now);
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(year, i), 'MMMM'), displayName: format(new Date(year, i), 'MMM'), value: 0, containers: 0, branchBreakdown: {} as any,
        }));
        filteredDeliveries.forEach(d => {
            const deliveryDate = new Date(d.date);
            const month = getMonth(deliveryDate);
            const liters = d.liters ?? containerToLiter(d.volumeContainers);
            monthlyData[month].value += liters;
            monthlyData[month].containers += d.volumeContainers;
            if (isParent) {
              const branchName = branchIdToNameMap[d.userId] || `Branch`;
              if (!monthlyData[month].branchBreakdown[branchName]) monthlyData[month].branchBreakdown[branchName] = { liters: 0, containers: 0 };
              monthlyData[month].branchBreakdown[branchName].liters += liters;
              monthlyData[month].branchBreakdown[branchName].containers += d.volumeContainers;
            }
        });
        return monthlyData;
    }
  }, [deliveries, analyticsFilter, isParent, branchIdToNameMap]);

  return (
    <Card className="border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 bg-muted/10 border-b border-slate-100">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isParent ? 'Multi-Branch Analytics' : 'Consumption Intelligence'}
          </CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Detailed usage patterns and logistical flow.</CardDescription>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={analyticsFilter} onValueChange={(value) => setAnalyticsFilter(value as any)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs font-bold uppercase tracking-tight bg-white border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="2025">2025 Full</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onHistoryClick} variant="outline" size="sm" className="h-9 font-bold uppercase tracking-widest text-[10px] bg-white border-slate-200">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-80 pt-10">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="displayName" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight={700}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                />
                <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight={700}
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${(value as number).toLocaleString()}`}
                />
                <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={<CustomTooltip isParent={isParent} />}
                />
                <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]} 
                    fill="hsl(var(--primary))" 
                    barSize={isParent ? 32 : 40}
                />
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t border-slate-100 py-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Info className="h-3 w-3" />
            Hover over the bars to see {isParent ? 'branch-specific breakdowns' : 'container volume detail'}.
          </p>
      </CardFooter>
    </Card>
  );
}

