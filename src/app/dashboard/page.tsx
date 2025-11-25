'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { consumptionData, deliveries, sanitationVisits } from '@/lib/data';
import Link from 'next/link';
import { ArrowRight, Bot, Calendar, ChevronRight, Droplet, Truck, TrendingUp, User } from 'lucide-react';
import { Chatbot } from '@/components/chatbot';

const gallonToLiter = (gallons: number) => gallons * 3.78541;

const chartData = consumptionData.map(d => ({
  ...d,
  consumptionLiters: parseFloat(gallonToLiter(d.consumptionGallons).toFixed(2))
}));

const chartConfig = {
  gallons: {
    label: "Gallons",
    color: "hsl(var(--chart-1))",
  },
  liters: {
    label: "Liters",
    color: "hsl(var(--chart-2))",
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const gallons = payload.find((p: any) => p.dataKey === 'consumptionGallons');
    const liters = payload.find((p: any) => p.dataKey === 'consumptionLiters');

    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="text-sm font-semibold">{date}</p>
        <div className="mt-2 space-y-1 text-sm">
          {gallons && (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gallons.color }} />
              <p className="text-muted-foreground">{gallons.name}:</p>
              <p className="font-medium">{gallons.value.toLocaleString()}</p>
            </div>
          )}
          {liters && (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: liters.color }} />
              <p className="text-muted-foreground">{liters.name}:</p>
              <p className="font-medium">{liters.value.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};


export default function DashboardPage() {
  const latestConsumption = consumptionData[consumptionData.length - 1];
  const recentDeliveries = deliveries.slice(0, 3);
  const upcomingVisits = sanitationVisits.filter(v => v.status === 'Scheduled').slice(0, 3);
  
  return (
    <div className="grid gap-6 md:grid-cols-5">
      {/* Main Content Column */}
      <div className="md:col-span-3 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Water Consumption
            </CardTitle>
            <CardDescription>
              Your water usage for the last 14 days, shown in gallons and liters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart accessibilityLayer data={chartData} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short'})}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}`}
                  
                />
                 <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: "3 3" }} content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="fillGallons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-gallons)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-gallons)" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="fillLiters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-liters)" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="var(--color-liters)" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  yAxisId="left"
                  dataKey="consumptionGallons"
                  type="natural"
                  fill="url(#fillGallons)"
                  stroke="var(--color-gallons)"
                  strokeWidth={2}
                  name="Gallons"
                  dot={false}
                />
                 <Area
                  yAxisId="right"
                  dataKey="consumptionLiters"
                  type="natural"
                  fill="url(#fillLiters)"
                  stroke="var(--color-liters)"
                  strokeWidth={2}
                  name="Liters"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
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
                  <TableRow key={d.id} className="group hover:bg-muted/50">
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
      </div>

      {/* Right Sidebar Column */}
      <div className="md:col-span-2 grid gap-6 content-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-primary"/>
              Today's Consumption
            </CardTitle>
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
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Sanitation Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
             <ul className="space-y-2">
              {upcomingVisits.length > 0 ? upcomingVisits.map(v => (
                <li key={v.id} className="group flex items-center justify-between rounded-md p-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{new Date(v.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                      <p className="text-sm text-muted-foreground">with {v.assignedTo}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </li>
              )) : <p className="text-muted-foreground text-sm p-2">No upcoming visits.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
