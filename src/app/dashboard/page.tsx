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


    const last7DaysConsumption = consumptionData.slice(-7);
    const averageGallons = last7DaysConsumption.reduce((total, record) => total + record.consumptionGallons, 0) / last7DaysConsumption.length;
    const averageLiters = gallonToLiter(averageGallons);

    const lastDelivery = deliveries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastDeliveryLiters = lastDelivery ? gallonToLiter(lastDelivery.volumeGallons) : 0;
    
    const consumptionChartData = last7DaysConsumption.map(d => ({ date: d.date, value: gallonToLiter(d.consumptionGallons) }));
    const deliveryChartData = deliveries.filter(d=>d.status === 'Delivered').slice(0,7).map(d => ({ date: d.date, value: gallonToLiter(d.volumeGallons) })).reverse();

    return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{greeting}, {userName}!</h1>
            <Button className="bg-primary/90 hover:bg-primary" aria-label="Feedback">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>Feedback</span>
            </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 items-stretch">
            <Card className="flex flex-col relative">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Droplet className="h-6 w-6 text-primary" />
                        Average Daily Usage
                    </CardTitle>
                    <CardDescription>Your water usage over the last 7 days.</CardDescription>
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
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-primary/90 hover:bg-primary">Water Station</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                            <WaterStationsPage />
                        </DialogContent>
                    </Dialog>
                </div>
            </Card>
        
            <Card className="flex flex-col relative">
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
                <div className="absolute bottom-4 right-4 flex gap-2">
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
            </Card>
        </div>
    </div>
    );
}
