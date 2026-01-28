'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Delivery, AppUser } from '@/lib/types';
import { format, getYear, getMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { Calendar, Droplets, TrendingUp, TrendingDown } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
};


interface ConsumptionHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deliveries: Delivery[] | null;
  user: AppUser | null;
}

export function YearlyConsumptionDialog({ isOpen, onOpenChange, deliveries, user }: ConsumptionHistoryDialogProps) {

  const yearlyData = useMemo(() => {
    if (!deliveries) return { chartData: [], total: 0, average: 0, highest: null, lowest: null };

    const now = new Date();
    const currentYear = getYear(now);
    const cycleStart = startOfYear(now);
    const cycleEnd = endOfYear(now);

    const filteredDeliveries = deliveries.filter(d => {
        const deliveryDate = toSafeDate(d.date);
        return deliveryDate ? isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd }) : false;
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        name: format(new Date(currentYear, i), 'MMM'),
        Liters: 0,
        Containers: 0,
    }));

    filteredDeliveries.forEach(d => {
        const deliveryDate = toSafeDate(d.date);
        if (deliveryDate) {
            const month = getMonth(deliveryDate);
            monthlyData[month].Liters += containerToLiter(d.volumeContainers);
            monthlyData[month].Containers += d.volumeContainers;
        }
    });

    const total = monthlyData.reduce((sum, data) => sum + data.Liters, 0);
    const monthsWithConsumption = monthlyData.filter(m => m.Liters > 0);
    const average = monthsWithConsumption.length > 0 ? total / monthsWithConsumption.length : 0;
    
    const highest = monthsWithConsumption.reduce((max, month) => month.Liters > (max?.Liters || 0) ? month : max, null as {name: string, Liters: number} | null);
    const lowest = monthsWithConsumption.reduce((min, month) => month.Liters < (min?.Liters || Infinity) ? month : min, null as {name: string, Liters: number} | null);


    return { chartData: monthlyData, total, average, highest, lowest };
  }, [deliveries]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consumption History</DialogTitle>
          <DialogDescription>
            An overview of {user?.businessName}'s monthly water consumption.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="name" 
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
                            tickFormatter={(value) => `${((value as number) / 1000).toFixed(0)}k`} 
                        />
                        <Tooltip
                            cursor={{ fill: 'hsla(var(--accent))' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value: number, name, props) => {
                                const containers = props.payload.Containers || 0;
                                return [`${value.toLocaleString()} Liters / ${containers.toLocaleString()} containers`, 'Consumption'];
                            }}
                        />
                        <Bar dataKey="Liters" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                    <Droplets className="h-6 w-6 mx-auto text-primary mb-2"/>
                    <p className="text-xl font-bold">{yearlyData.total.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    <p className="text-xs text-muted-foreground">Total Liters</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <Calendar className="h-6 w-6 mx-auto text-primary mb-2"/>
                    <p className="text-xl font-bold">{yearlyData.average.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    <p className="text-xs text-muted-foreground">Monthly Average</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <TrendingUp className="h-6 w-6 mx-auto text-green-500 mb-2"/>
                    <p className="text-xl font-bold">{yearlyData.highest?.Liters.toLocaleString(undefined, {maximumFractionDigits: 0}) || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Peak Month ({yearlyData.highest?.name})</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <TrendingDown className="h-6 w-6 mx-auto text-red-500 mb-2"/>
                    <p className="text-xl font-bold">{yearlyData.lowest?.Liters.toLocaleString(undefined, {maximumFractionDigits: 0}) || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Lowest Month ({yearlyData.lowest?.name})</p>
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
