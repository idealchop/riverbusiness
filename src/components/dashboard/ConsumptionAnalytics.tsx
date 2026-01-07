
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Delivery, AppUser } from '@/lib/types';
import { format, subDays, startOfMonth, getWeekOfMonth, endOfMonth, getYear, getMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { History, Users } from 'lucide-react';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface ConsumptionAnalyticsProps {
  deliveries: Delivery[] | null;
  onHistoryClick: () => void;
  isParent?: boolean;
  branches?: AppUser[] | null;
}

export function ConsumptionAnalytics({ deliveries, onHistoryClick, isParent = false, branches = [] }: ConsumptionAnalyticsProps) {
  const [analyticsFilter, setAnalyticsFilter] = useState<'weekly' | 'monthly' | 'yearly' | '2025'>('monthly');

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

    if (isParent) {
      const branchConsumption: { [key: string]: { name: string; value: number } } = {};
      const branchIdToName = (branches || []).reduce((acc, branch) => {
        acc[branch.id] = branch.businessName;
        return acc;
      }, {} as Record<string, string>);

      // Initialize all branches with 0 consumption
      Object.keys(branchIdToName).forEach(branchId => {
        branchConsumption[branchId] = { name: branchIdToName[branchId], value: 0 };
      });

      filteredDeliveries.forEach(delivery => {
        // delivery.userId is the ID of the branch that received the delivery
        if (delivery.userId && branchConsumption[delivery.userId]) {
          branchConsumption[delivery.userId].value += containerToLiter(delivery.volumeContainers);
        }
      });

      return Object.values(branchConsumption).map(b => ({ ...b, displayName: b.name.substring(0, 10) }));

    } else {
       if (analyticsFilter === 'weekly') {
        const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
        return last7Days.map((date, index) => {
            const deliveriesOnDay = filteredDeliveries.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
            const totalLiters = deliveriesOnDay.reduce((sum, d) => sum + containerToLiter(d.volumeContainers), 0);
            return {
                name: `${format(date, 'EEE')}-${index}`,
                displayName: format(date, 'EEE').charAt(0),
                value: totalLiters
            };
        });
      } else if (analyticsFilter === 'monthly') {
          const firstDay = startOfMonth(now);
          const weeksInMonth = getWeekOfMonth(endOfMonth(now));

          const weeklyData = Array.from({ length: weeksInMonth }, (_, i) => ({
            name: `Week ${i + 1}`,
            displayName: `W${i + 1}`,
            value: 0
          }));

          filteredDeliveries.forEach(d => {
            const deliveryDate = new Date(d.date);
            const weekOfMonth = getWeekOfMonth(deliveryDate) -1;
            if(weeklyData[weekOfMonth]) {
                weeklyData[weekOfMonth].value += containerToLiter(d.volumeContainers);
            }
          });
          return weeklyData;
      } else { // yearly or 2025
          const year = analyticsFilter === '2025' ? 2025 : getYear(now);
          const monthlyData = Array.from({ length: 12 }, (_, i) => ({
              name: format(new Date(year, i), 'MMM'),
              displayName: format(new Date(year, i), 'MMM'),
              value: 0
          }));

          filteredDeliveries.forEach(d => {
              const deliveryDate = new Date(d.date);
              const month = getMonth(deliveryDate);
              monthlyData[month].value += containerToLiter(d.volumeContainers);
          });
          return monthlyData;
      }
    }
  }, [deliveries, analyticsFilter, isParent, branches]);

  const cardTitle = isParent ? 'Branch Consumption' : 'Consumption Analytics';
  const cardDescription = isParent ? 'Monitor water usage across all your branches.' : 'A look at your water usage over time.';

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
            <XAxis 
              dataKey="displayName" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
            <Tooltip
              cursor={{ fill: 'hsla(var(--accent))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name, props) => [`${value.toLocaleString()} Liters`, isParent ? props.payload.name : 'Consumption']}
            />
            <Bar dataKey="value" radius={[16, 16, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
