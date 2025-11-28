'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData } from '@/lib/data';
import { LifeBuoy, Droplet, Truck, MessageSquare, Waves, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WaterStationsPage from './water-stations/page';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SupportPage from './support/page';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';


const gallonToLiter = (gallons: number) => gallons * 3.78541;

export default function DashboardPage() {
    const [greeting, setGreeting] = useState('');
    const [userName, setUserName] = useState('Juan dela Cruz');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good morning');
        } else if (hour < 18) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }
    }, []);


    const deliveredPurchases = deliveries.filter(d => d.status === 'Delivered');
    const totalGallonsPurchased = deliveredPurchases.reduce((total, record) => total + record.volumeGallons, 0);
    const totalLitersPurchased = gallonToLiter(totalGallonsPurchased);
    
    const totalGallonsConsumed = consumptionData.reduce((total, record) => total + record.consumptionGallons, 0);
    const totalLitersConsumed = gallonToLiter(totalGallonsConsumed);
    
    const remainingLiters = totalLitersPurchased - totalLitersConsumed;
    
    const consumptionChartData = consumptionData.slice(-7).map(d => ({ date: d.date, value: gallonToLiter(d.consumptionGallons) }));
    const deliveryChartData = deliveries.filter(d=>d.status === 'Delivered').slice(0,7).map(d => ({ date: d.date, value: gallonToLiter(d.volumeGallons) })).reverse();

    return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{greeting}, {userName}!</h1>
            <Button className="bg-primary/90 hover:bg-primary" aria-label="Feedback">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>Feedback</span>
            </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <Card className="flex flex-col overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Waves className="h-6 w-6 text-primary" />
                        Total Liters Purchased
                    </CardTitle>
                    <CardDescription>Total water purchased from all deliveries.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-start justify-between">
                    <div>
                        <p className="text-5xl font-bold tracking-tight">{totalLitersPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl">Liters</span></p>
                    </div>
                    <div className="h-48 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={deliveryChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip 
                                cursor={false}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                                labelStyle={{color: 'hsl(var(--foreground))'}}
                                formatter={(value: number, name, props) => [`${value.toFixed(0)} Liters`, `Delivered on ${new Date(props.payload.date).toLocaleDateString()}`]}
                                labelFormatter={() => ''}
                            />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorDelivery)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="w-full flex justify-end mt-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-primary/90 hover:bg-primary">
                                    <Droplet className="h-4 w-4 mr-2" />
                                    Water Station
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                                <WaterStationsPage />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        
            <Card className="flex flex-col overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Droplets className="h-6 w-6 text-primary"/>
                        Remaining Liters
                    </CardTitle>
                    <CardDescription>Estimated remaining water based on consumption.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-start justify-between">
                    <div>
                        <p className="text-5xl font-bold tracking-tight">{remainingLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl">Liters</span></p>
                    </div>
                    <div className="h-48 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={consumptionChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip
                                    cursor={false}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)',
                                    }}
                                    labelStyle={{color: 'hsl(var(--foreground))'}}
                                    formatter={(value: number, name, props) => [`${value.toFixed(0)} Liters`, `Usage on ${new Date(props.payload.date).toLocaleDateString()}`]}
                                    labelFormatter={() => ''}
                                />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsage)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="flex justify-end gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-primary/90 hover:bg-primary" aria-label="Support">
                        <LifeBuoy className="h-4 w-4 mr-2" />
                        <span>Support</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] h-[550px]">
                    <DialogHeader>
                    <DialogTitle>Support</DialogTitle>
                    <DialogDescription>
                        Get help with your account and services.
                    </DialogDescription>
                    </DialogHeader>
                    <SupportPage />
                </DialogContent>
            </Dialog>
        </div>
    </div>
    );
}
