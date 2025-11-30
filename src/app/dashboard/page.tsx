
'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData, appUsers as initialAppUsers } from '@/lib/data';
import { LifeBuoy, Droplet, Truck, MessageSquare, Waves, Droplets, History, Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WaterStationsPage from './water-stations/page';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import SupportPage from './support/page';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import DeliveriesPage from './deliveries/page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Feedback, AppUser } from '@/lib/types';


const gallonToLiter = (gallons: number) => gallons * 19;

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
        
        // Assuming the logged-in user is 'Alice Johnson' with ID 'USR-001'
        // In a real app, you'd get this from your auth context
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
            userId: currentUser?.id || 'USR-001', // This would be dynamic in a real app
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


    const consumptionChartData = consumptionData.slice(-7).map(d => ({ date: d.date, value: gallonToLiter(d.consumptionGallons) }));
    const deliveryChartData = deliveries.filter(d=>d.status === 'Delivered').slice(0,7).map(d => ({ date: d.date, value: gallonToLiter(d.volumeGallons) })).reverse();

    return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{greeting}, {userName}!</h1>
            <div className="flex items-center gap-2">
                <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary/90 hover:bg-primary" aria-label="Feedback">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            <span>Feedback</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Share Your Feedback</DialogTitle>
                            <DialogDescription>
                                We value your opinion. Let us know what you think.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="feedback-message">Your Message</Label>
                                <Textarea
                                    id="feedback-message"
                                    placeholder="Tell us about your experience..."
                                    value={feedbackMessage}
                                    onChange={(e) => setFeedbackMessage(e.target.value)}
                                    rows={5}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Your Rating</Label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                'h-6 w-6 cursor-pointer',
                                                (hoverRating >= star || feedbackRating >= star)
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-muted-foreground'
                                            )}
                                            onClick={() => setFeedbackRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="button" onClick={handleFeedbackSubmit}>
                                <Send className="mr-2 h-4 w-4" />
                                Submit Feedback
                            </Button>
                        </DialogFooter>
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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
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
                        <p className="text-5xl font-bold tracking-tight">{remainingLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })}<span className="text-3xl text-muted-foreground">/{totalLitersPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> <span className="text-xl">Liters</span></p>
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
                                    formatter={(value: number, name, props) => [`${value.toFixed(0)} Liters`, `Usage on ${new Date(props.payload.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`]}
                                    labelFormatter={() => ''}
                                />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsage)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full flex justify-between mt-4">
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
                        <Dialog>
                           <DialogTrigger asChild>
                               <Button className="bg-primary/90 hover:bg-primary">
                                   <History className="h-4 w-4 mr-2" />
                                   History
                               </Button>
                           </DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                    <DialogTitle>Delivery Tracking</DialogTitle>
                                    <DialogDescription>Monitor all water deliveries to ensure timely supply.</DialogDescription>
                                </DialogHeader>
                                <DeliveriesPage />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
    );
}

      

    