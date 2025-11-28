'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData } from '@/lib/data';
import { Droplet, Package, BarChart, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const gallonToLiter = (gallons: number) => gallons * 3.78541;

export default function DashboardPage() {
  const totalGallonsPurchased = deliveries.reduce((total, delivery) => total + delivery.volumeGallons, 0);
  const totalLitersPurchased = gallonToLiter(totalGallonsPurchased);

  const totalGallonsConsumed = consumptionData.reduce((total, record) => total + record.consumptionGallons, 0);
  const totalLitersConsumed = gallonToLiter(totalGallonsConsumed);

  const litersLeft = totalLitersPurchased - totalLitersConsumed;
  const consumptionPercentage = (totalLitersConsumed / totalLitersPurchased) * 100;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Total Water Purchased
          </CardTitle>
          <CardDescription>The total volume of water you have acquired.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-baseline gap-4">
                <p className="text-4xl font-bold tracking-tight">{totalLitersPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-muted-foreground">Liters</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{totalGallonsPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })} Gallons</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary"/>
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
  );
}
