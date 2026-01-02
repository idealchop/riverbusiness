
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Delivery } from '@/lib/types';
import { format, subDays, startOfMonth, getWeekOfMonth, endOfMonth, getYear, getMonth, startOfYear, endOfYear } from 'date-fns';
import { History } from 'lucide-react';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface ConsumptionAnalyticsProps {
  deliveries: Delivery[] | null;
  onHistoryClick: () => void;
}

export function ConsumptionAnalytics({ deliveries, onHistoryClick }: ConsumptionAnalyticsProps) {
  const [analyticsFilter, setAnalyticsFilter] = useState<'weekly' | 'monthly' | 'yearly' | '2025'>('weekly');

  const consumptionChartData = useMemo(() => {
    const sourceDeliveries = deliveries || [];
    
    if (analyticsFilter === 'weekly') {
      const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
      return last7Days.map((date, index) => {
        const deliveriesOnDay = sourceDeliveries.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
        const totalContainers = deliveriesOnDay.reduce((sum, d) => sum + d.volumeContainers, 0);
        return {
          name: `${format(date, 'EEE').charAt(0)}-${index}`, // Ensure unique name
          displayName: format(date, 'EEE').charAt(0),
          value: containerToLiter(totalContainers)
        };
      });
    } else if (analyticsFilter === 'monthly') {
      const now = new Date();
      const firstDay = startOfMonth(now);
      const lastDay = endOfMonth(now);
      const weeksInMonth = getWeekOfMonth(lastDay);

      const weeklyData = Array.from({ length: weeksInMonth }, (_, i) => ({
        name: `Week ${i + 1}`,
        displayName: `W${i + 1}`,
        value: 0
      }));

      sourceDeliveries.forEach(d => {
        const deliveryDate = new Date(d.date);
        if (deliveryDate >= firstDay && deliveryDate <= lastDay) {
          const weekOfMonth = getWeekOfMonth(deliveryDate) -1;
          if(weeklyData[weekOfMonth]) {
            weeklyData[weekOfMonth].value += containerToLiter(d.volumeContainers);
          }
        }
      });
      return weeklyData;
    } else if (analyticsFilter === '2025') {
        const year = 2025;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);

        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(year, i), 'MMM'),
            displayName: format(new Date(year, i), 'MMM'),
            value: 0
        }));

        sourceDeliveries.forEach(d => {
            const deliveryDate = new Date(d.date);
            if (deliveryDate >= yearStart && deliveryDate <= yearEnd) {
                const month = getMonth(deliveryDate);
                monthlyData[month].value += containerToLiter(d.volumeContainers);
            }
        });
        return monthlyData;
    } else { // yearly
        const now = new Date();
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);
        const year = getYear(now);

        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(year, i), 'MMM'),
            displayName: format(new Date(year, i), 'MMM'),
            value: 0
        }));

        sourceDeliveries.forEach(d => {
            const deliveryDate = new Date(d.date);
            if (deliveryDate >= yearStart && deliveryDate <= yearEnd) {
                const month = getMonth(deliveryDate);
                monthlyData[month].value += containerToLiter(d.volumeContainers);
            }
        });
        return monthlyData;
    }
  }, [deliveries, analyticsFilter]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle>Consumption Analytics</CardTitle>
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
              formatter={(value: number) => [`${value.toLocaleString()} Liters`, 'Consumption']}
            />
            <Bar dataKey="value" radius={[16, 16, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
