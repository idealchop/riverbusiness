'use client'

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData } from '@/lib/data';
import { TrendingDown, LifeBuoy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const gallonToLiter = (gallons: number) => gallons * 3.78541;

export default function DashboardPage() {
  const totalGallonsPurchased = deliveries
    .filter(delivery => delivery.status === 'Delivered')
    .reduce((total, delivery) => total + delivery.volumeGallons, 0);
  const totalLitersPurchased = gallonToLiter(totalGallonsPurchased);

  const totalGallonsConsumed = consumptionData.reduce((total, record) => total + record.consumptionGallons, 0);
  const totalLitersConsumed = gallonToLiter(totalGallonsConsumed);

  const litersLeft = totalLitersPurchased - totalLitersConsumed;
  const consumptionPercentage = (totalLitersPurchased > 0) ? (totalLitersConsumed / totalLitersPurchased) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-5.5-4-3.5 2.5-5.5 4-3 3.5-3 5.5a7 7 0 0 0 7 7z"></path><path d="M12 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"></path></svg>
              Total Water Purchased
            </CardTitle>
            <CardDescription>The total volume of water you have acquired.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex items-baseline gap-4">
                  <p className="text-4xl font-bold tracking-tight">{totalLitersPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-muted-foreground">Liters</p>
              </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-primary"/>
              Consumption Overview
            </CardTitle>
            <CardDescription>Your water usage versus your total supply.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                  <p className="text-sm font-medium">Consumed</p>
                  <p className="text-sm">{totalLitersConsumed.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</p>
              </div>
              <div className="flex justify-between text-muted-foreground mb-2">
                  <p className="text-sm">Remaining</p>
                  <p className="text-sm">{litersLeft.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</p>
              </div>
              <Progress value={consumptionPercentage} />
              <p className="text-right text-sm text-muted-foreground mt-2">{consumptionPercentage.toFixed(1)}% of total supply used</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="absolute bottom-6 right-6">
        <Button asChild variant="outline">
            <Link href="/dashboard/support">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Support
            </Link>
        </Button>
      </div>
    </div>
  );
}
