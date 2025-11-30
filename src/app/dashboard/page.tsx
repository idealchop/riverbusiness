
'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData, appUsers as initialAppUsers } from '@/lib/data';
import { LifeBuoy, Droplet, Truck, MessageSquare, Waves, Droplets, History, Star, Send, ArrowUp, ArrowDown, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WaterStationsPage from './water-stations/page';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import SupportPage from './support/page';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import DeliveriesPage from './deliveries/page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Feedback, AppUser } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


const gallonToLiter = (gallons: number) => gallons * 19;

const goals = [
    { text: "Reduce daily usage by 10%", done: true },
    { text: "Fix leaking faucet in kitchen", done: true },
    { text: "Install low-flow showerhead", done: false },
    { text: "Only run full loads of laundry", done: false },
];

const tips = [
    { title: "Take Shorter Showers", description: "Each minute you cut from your shower time can save up to 2.5 gallons of water." },
    { title: "Turn Off the Tap", description: "Don't let water run while brushing your teeth or washing your hands. You can save up to 4 gallons per minute." },
];

export default function DashboardPage({ userName: initialUserName }: { userName?: string }) {
    const [greeting, setGreeting] = useState('');
    const [userName, setUserName] = useState(initialUserName || 'Juan dela Cruz');
    const [totalLitersPurchased, setTotalLitersPurchased] = useState(0);
    const [remainingLiters, setRemainingLiters] = useState(0);
    const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

    useEffect(() => {
        if (initialUserName) {
            setUserName(initialUserName);
        }
    }, [initialUserName]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good morning');
        } else if (hour < 18) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }

        const onboardingDataString = localStorage.getItem('onboardingData');
        let totalPurchased = 5000; // Fallback value

        if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            if (onboardingData.customPlanDetails && onboardingData.customPlanDetails.litersPerMonth) {
                totalPurchased = onboardingData.customPlanDetails.litersPerMonth;
            }
        }
        
        setTotalLitersPurchased(totalPurchased);
        
        const user = initialAppUsers.find(u => u.id === 'USR-001');
        if (user) {
            setCurrentUser(user);
            setRemainingLiters(Math.max(0, totalPurchased - user.totalConsumptionLiters));
        }

    }, []);

    const handleFeedbackSubmit = () => {
        if (feedbackMessage.trim() === '' || feedbackRating === 0) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Feedback',
                description: 'Please provide a message and a rating.'
            });
            return;
        }

        const newFeedback: Feedback = {
            id: `FB-${Date.now()}`,
            userId: currentUser?.id || 'USR-001',
            userName: userName,
            timestamp: new Date().toISOString(),
            feedback: feedbackMessage,
            rating: feedbackRating,
            read: false,
        };

        const existingFeedback = JSON.parse(localStorage.getItem('feedbackLogs') || '[]');
        localStorage.setItem('feedbackLogs', JSON.stringify([...existingFeedback, newFeedback]));

        toast({
            title: 'Feedback Submitted!',
            description: 'Thank you for your valuable input.',
        });

        setIsFeedbackDialogOpen(false);
        setFeedbackMessage('');
        setFeedbackRating(0);
        setHoverRating(0);
    };

    const consumptionChartData = consumptionData.slice(-7).map(d => ({ name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0), value: gallonToLiter(d.consumptionGallons) }));
    
    const consumedLiters = currentUser ? currentUser.totalConsumptionLiters : 0;
    const upcomingDeliveries = deliveries.filter(d => d.status === 'Pending' || d.status === 'In Transit').length;

    return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Plan, prioritize, and accomplish your tasks with ease.</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline">
                    <History className="h-4 w-4 mr-2" />
                    History
                </Button>
                <Button>
                    <Droplet className="h-4 w-4 mr-2" />
                    Water Station
                </Button>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Total Purchased
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{totalLitersPurchased.toLocaleString()}</p>
                    <div className="flex items-center text-xs text-green-600 mt-1">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>5% from last month</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Consumed Liters
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{consumedLiters.toLocaleString()}</p>
                     <div className="flex items-center text-xs text-red-600 mt-1">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        <span>2% from last month</span>
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-primary-foreground/80">
                        Remaining Liters
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{remainingLiters.toLocaleString()}</p>
                     <div className="flex items-center text-xs text-primary-foreground/80 mt-1">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        <span>10% from last month</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Upcoming Deliveries
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{upcomingDeliveries}</p>
                    <p className="text-xs text-muted-foreground mt-1">On Discuss</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Consumption Analytics</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={consumptionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                cursor={{ fill: 'hsla(var(--accent))' }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                                labelStyle={{color: 'hsl(var(--foreground))'}}
                            />
                            <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {goals.map((goal, index) => (
                                <li key={index} className="flex items-center gap-3 text-sm">
                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", goal.done ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        {goal.done && <CheckCircle className="h-4 w-4" />}
                                    </div>
                                    <span className={cn(goal.done && "line-through text-muted-foreground")}>{goal.text}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Water Saving Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {tips.map((tip, index) => (
                           <div key={index}>
                               <h4 className="font-semibold">{tip.title}</h4>
                               <p className="text-sm text-muted-foreground">{tip.description}</p>
                           </div>
                       ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
    );
}
