'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData } from '@/lib/data';
import { LifeBuoy, Droplet, Truck, MessageSquare } from 'lucide-react';
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
    
    let averageLiters = 0;
    if (deliveredPurchases.length > 0) {
        const firstDeliveryDate = new Date(deliveredPurchases[deliveredPurchases.length - 1].date);
        const lastDeliveryDate = new Date(deliveredPurchases[0].date);
        const diffTime = Math.abs(lastDeliveryDate.getTime() - firstDeliveryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include the start day
        averageLiters = gallonToLiter(totalGallonsPurchased / diffDays);
    }
    
    const lastDelivery = deliveries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastDeliveryLiters = lastDelivery ? gallonToLiter(lastDelivery.volumeGallons) : 0;
    
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
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Droplet className="h-6 w-6 text-primary" />
                        Average Daily Usage
                    </CardTitle>
                    <CardDescription>Based on your purchase history.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-start justify-between">
                    <p className="text-5xl font-bold tracking-tight">{averageLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl text-muted-foreground">Liters</span></p>
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
        
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-6 w-6 text-primary"/>
                        Last Delivery
                    </CardTitle>
                    <CardDescription>Water delivered over the last few months.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-start justify-between">
                    <p className="text-5xl font-bold tracking-tight">{lastDeliveryLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl text-muted-foreground">Liters</span></p>
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
                </CardContent>
            </Card>
        </div>
        <div className="flex justify-end gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-primary/90 hover:bg-primary">Water Station</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                    <WaterStationsPage />
                </DialogContent>
            </Dialog>
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
