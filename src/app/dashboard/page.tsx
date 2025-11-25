'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { consumptionData, deliveries, sanitationVisits } from '@/lib/data';
import Link from 'next/link';
import { ArrowRight, Bot, Calendar, Truck } from 'lucide-react';
import { Chatbot } from '@/components/chatbot';

const gallonToLiter = (gallons: number) => gallons * 3.78541;

const chartConfig = {
  gallons: {
    label: "Gallons",
    color: "hsl(var(--chart-1))",
  },
};

export default function DashboardPage() {
  const latestConsumption = consumptionData[consumptionData.length - 1];
  const recentDeliveries = deliveries.slice(0, 3);
  const upcomingVisits = sanitationVisits.filter(v => v.status === 'Scheduled').slice(0, 3);
  
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Water Consumption</CardTitle>
          <CardDescription>
            Your water usage for the last 14 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart accessibilityLayer data={consumptionData} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short'})}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="consumptionGallons"
                type="natural"
                fill="var(--color-gallons)"
                fillOpacity={0.4}
                stroke="var(--color-gallons)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Today's Consumption</CardTitle>
                <CardDescription>{new Date(latestConsumption.date).toDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-4">
                    <p className="text-4xl font-bold tracking-tight">{latestConsumption.consumptionGallons}</p>
                    <p className="text-muted-foreground">Gallons</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{gallonToLiter(latestConsumption.consumptionGallons).toFixed(2)} Liters</p>
            </CardContent>
        </Card>

        <Chatbot />
      </div>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Recent Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Volume (Gal)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDeliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.id}</TableCell>
                  <TableCell>{d.date}</TableCell>
                  <TableCell>{d.volumeGallons}</TableCell>
                  <TableCell><Badge variant={d.status === 'Delivered' ? 'default' : d.status === 'In Transit' ? 'secondary' : 'outline'} className={d.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sanitation Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
           <ul className="space-y-4">
            {upcomingVisits.length > 0 ? upcomingVisits.map(v => (
              <li key={v.id} className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{new Date(v.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm text-muted-foreground">Assigned to: {v.assignedTo}</p>
                </div>
              </li>
            )) : <p className="text-muted-foreground text-sm">No upcoming visits.</p>}
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}
