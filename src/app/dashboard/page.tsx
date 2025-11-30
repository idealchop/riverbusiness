
'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveries, consumptionData, appUsers as initialAppUsers, complianceReports, sanitationVisits, waterStations } from '@/lib/data';
import { LifeBuoy, Droplet, Truck, MessageSquare, Waves, Droplets, History, Star, Send, ArrowUp, ArrowDown, ArrowRight, CheckCircle, Clock, Calendar, Info, PackageCheck, Package, Lightbulb, Gift, ExternalLink, MapPin, FileText, Eye } from 'lucide-react';
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
import type { Feedback, AppUser, Delivery, WaterStation } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const gallonToLiter = (gallons: number) => gallons * 19;

const perks = [
    { 
        brand: "Fitness Gym", 
        image: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPartners%2FNewBreed.png?alt=media&token=51a87e73-21f0-448c-9596-cc4a7016ad27",
        subtitle: "6 locations currently and continuously growing",
        discounts: [
            "20% membership discounts",
            "1 monthly free session"
        ],
        websiteUrl: "https://www.newbreed.com",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=New+Breed+Fitness"
    },
];

const tips = [
    { title: "Give Your Bottle a Sniff Test", description: "Before you leave home, check your bottle for cleanliness. If it smells sour or 'off,' it needs a proper wash. That smell means germs are in the bottle, not the water!" },
    { title: "Empty Out Old Water", description: "Don't mix old, potentially contaminated water with your fresh refill. Always pour out any standing water from the day before to start fresh." },
    { title: "Check the Cap and Spout", description: "Inspect the threads and spout for any residue. The part that touches your mouth should always be clean to protect the fresh water." },
    { title: "Look for the Clean Signs", description: "At the refill station, check if the area is dry and tidy. A well-maintained station is a good sign of safe practices." },
    { title: "Stop the Touch", description: "Prevent cross-contamination by making sure the refilling nozzle never touches the inside of your bottle. Hold your container carefully beneath it." },
    { title: "Pick the Right Temperature", description: "If the station offers chilled water, choose it! People naturally drink more when water is cold and refreshing." },
    { title: "Weekly Soap and Water Wash", description: "Once a week, use dish soap and a bottle brush to scrub the inside walls, bottom, and especially the neck and threads where germs hide." },
    { title: "The Sanitizing Soak", description: "For a deep clean, fill your bottle with a mix of equal parts white vinegar and water and let it sit for 30 minutes. Rinse thoroughly afterward." },
    { title: "⭐ Hydration Tip", description: "Keep your refilled bottle visible on your desk or near you throughout the day. If you see it, you'll remember to drink it!" }
];

export default function DashboardPage({ userName: initialUserName }: { userName?: string }) {
    const [greeting, setGreeting] = useState('');
    const [userName, setUserName] = useState(initialUserName || 'Juan dela Cruz');
    const [totalLitersPurchased, setTotalLitersPurchased] = useState(0);
    const [remainingLiters, setRemainingLiters] = useState(0);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = useState(false);
    const [dailyTip, setDailyTip] = useState<{title: string, description: string} | null>(null);
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

    useEffect(() => {
        const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const tipIndex = dayOfYear % tips.length;
        setDailyTip(tips[tipIndex]);
    }, []);

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
        let nextRefillDate = new Date();
        nextRefillDate.setDate(nextRefillDate.getDate() + 15);
        let estDeliveryLiters = 5000;

        if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            if (onboardingData.customPlanDetails) {
                totalPurchased = onboardingData.customPlanDetails.litersPerMonth || totalPurchased;
                estDeliveryLiters = onboardingData.customPlanDetails.litersPerMonth || estDeliveryLiters;
                // You could add logic here to set nextRefillDate based on deliveryFrequency, etc.
            }
        }
        
        setTotalLitersPurchased(totalPurchased);
        
        const user = initialAppUsers.find(u => u.id === 'USR-001');
        if (user) {
            setCurrentUser(user);
            setRemainingLiters(Math.max(0, totalPurchased - user.totalConsumptionLiters));
        }

    }, []);


    const consumptionChartData = consumptionData.slice(-7).map(d => ({ name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0), value: gallonToLiter(d.consumptionGallons) }));
    
    const consumedLiters = currentUser ? currentUser.totalConsumptionLiters : 0;
    const upcomingDeliveries = deliveries.filter(d => d.status === 'Pending' || d.status === 'In Transit').length;

    const userDeliveries = currentUser ? deliveries.filter(d => d.userId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

    const getStatusInfo = (status: Delivery['status'] | undefined) => {
        if (!status) return { variant: 'outline', icon: null, label: 'No Deliveries' };
        switch (status) {
            case 'Delivered':
                return { variant: 'default', icon: PackageCheck, label: 'Delivered' };
            case 'In Transit':
                return { variant: 'secondary', icon: Truck, label: 'In Transit' };
            case 'Pending':
                return { variant: 'outline', icon: Package, label: 'Pending' };
            default:
                return { variant: 'outline', icon: null, label: 'No Deliveries' };
        }
    };

    return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">{greeting}, {userName}. Here is an overview of your water consumption.</p>
            </div>
            <div className="flex items-center gap-2">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <FileText className="h-4 w-4 mr-2" />
                            Compliance Reports
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Quality Assurance</DialogTitle>
                            <DialogDescription>
                                Review water quality compliance and sanitation visit records.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Tabs defaultValue="compliance" className="flex flex-col gap-4">
                              <TabsList className="grid w-full grid-cols-2 md:w-96">
                                <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
                                <TabsTrigger value="sanitation">Sanitation</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="compliance">
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Water Quality Compliance</CardTitle>
                                    <CardDescription>View all historical compliance reports and their status.</CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Report ID</TableHead>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead className="text-right">Attachment</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {complianceReports.map((report) => (
                                          <TableRow key={report.id}>
                                            <TableCell className="font-medium">{report.id}</TableCell>
                                            <TableCell>{new Date(report.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                            <TableCell>
                                              <Badge variant={report.status === 'Compliant' ? 'default' : 'destructive'}
                                               className={
                                                report.status === 'Compliant' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                : report.status === 'Non-compliant' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                              }>
                                                {report.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Button variant="outline" size="sm" asChild>
                                                <a href={report.reportUrl} target="_blank" rel="noopener noreferrer">
                                                  <Eye className="mr-2 h-4 w-4" />
                                                  View
                                                </a>
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                              
                              <TabsContent value="sanitation">
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Sanitation Visits</CardTitle>
                                    <CardDescription>Manage scheduling and records of sanitation visits.</CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Visit ID</TableHead>
                                          <TableHead>Scheduled Date</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Assigned To</TableHead>
                                          <TableHead className="text-right">Report</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sanitationVisits.map((visit) => (
                                          <TableRow key={visit.id}>
                                            <TableCell className="font-medium">{visit.id}</TableCell>
                                            <TableCell>{new Date(visit.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                                            <TableCell>
                                              <Badge variant={visit.status === 'Completed' ? 'default' : visit.status === 'Scheduled' ? 'secondary' : 'outline'}
                                              className={
                                                visit.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                : visit.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'
                                              }>
                                                {visit.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>{visit.assignedTo}</TableCell>
                                            <TableCell className="text-right">
                                              {visit.reportUrl ? (
                                                <Button variant="outline" size="sm" asChild>
                                                  <a href={visit.reportUrl} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    View Report
                                                  </a>
                                                </Button>
                                              ) : (
                                                <span className="text-muted-foreground text-sm">N/A</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                            </Tabs>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <Dialog open={isDeliveryHistoryOpen} onOpenChange={setIsDeliveryHistoryOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Delivery History for {userName}</DialogTitle>
                    <DialogDescription>
                        A log of all past deliveries for this user.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ref ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Liters / Gallons</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Proof of Delivery</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {userDeliveries.map(delivery => {
                                const statusInfo = getStatusInfo(delivery.status);
                                const liters = delivery.volumeGallons * 3.785;
                                return (
                                <TableRow key={delivery.id}>
                                    <TableCell>{delivery.id}</TableCell>
                                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                                    <TableCell>{liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L / {delivery.volumeGallons}gal</TableCell>
                                    <TableCell>
                                         <Badge variant={statusInfo.variant} className={cn(
                                            statusInfo.variant === 'default' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                                            statusInfo.variant === 'secondary' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                                            statusInfo.variant === 'outline' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                        )}>
                                            {statusInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {delivery.proofOfDeliveryUrl ? (
                                            <Button variant="link" size="sm" onClick={() => setSelectedProofUrl(delivery.proofOfDeliveryUrl || null)}>
                                                View
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">Not available</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                             {userDeliveries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No delivery history found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
        
        <Dialog open={!!selectedProofUrl} onOpenChange={(open) => !open && setSelectedProofUrl(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Proof of Delivery</DialogTitle>
                </DialogHeader>
                {selectedProofUrl && (
                    <div className="py-4 flex justify-center">
                        <Image src={selectedProofUrl} alt="Proof of delivery" width={400} height={600} className="rounded-md object-contain" />
                    </div>
                )}
            </DialogContent>
        </Dialog>


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
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Auto Refill
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="auto-refill" className="font-bold text-base">Auto Refill Activated</Label>
                        <Switch id="auto-refill" defaultChecked />
                    </div>
                     <p className="text-xs text-muted-foreground">
                        System will auto-schedule if balance is low.
                    </p>
                    <div className="border-t pt-3 space-y-2">
                         <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>Next Refill Schedule</p>
                            <p className="font-semibold text-sm">August 15, 2024</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/>Est. Water for Delivery</p>
                            <p className="font-semibold text-sm">5,000 Liters</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Consumption Analytics</CardTitle>
                     <Button onClick={() => setIsDeliveryHistoryOpen(true)}>
                        <Truck className="h-4 w-4 mr-2" />
                        Delivery History
                    </Button>
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
                            <Bar dataKey="value" radius={[16, 16, 0, 0]} fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <div className="space-y-6">
                <Dialog>
                    <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:border-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-primary"/>
                                    Perks with Us
                                </CardTitle>
                                <CardDescription>Exclusive discounts from our partner brands.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-medium text-center text-primary">View all perks</p>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Exclusive Partner Perks</DialogTitle>
                            <DialogDescription>
                                As a River Business client, you get access to these special offers.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-6">
                            {perks.map((perk, index) => (
                                <Card key={index} className="overflow-hidden">
                                    <div className="relative h-40 w-full">
                                        <Image src={perk.image} alt={perk.brand} layout="fill" objectFit="cover" />
                                    </div>
                                    <CardHeader>
                                        <CardTitle>{perk.brand}</CardTitle>
                                        <CardDescription>{perk.subtitle}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <ul className="text-sm space-y-2">
                                            {perk.discounts.map((discount, i) => (
                                                <li key={i} className="flex items-start">
                                                    <CheckCircle className="h-4 w-4 mr-2 mt-1 shrink-0 text-green-500" />
                                                    <span>{discount}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex gap-2 pt-2">
                                             <Button asChild className="flex-1">
                                                <a href={perk.websiteUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Visit Website
                                                </a>
                                            </Button>
                                            <Button asChild variant="outline" className="flex-1">
                                                <a href={perk.mapUrl} target="_blank" rel="noopener noreferrer">
                                                    <MapPin className="mr-2 h-4 w-4" />
                                                   Find Nearby
                                                </a>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                             <Card className="text-center p-6 bg-accent/50 border-dashed">
                                <CardContent className="p-0">
                                    <p className="font-semibold">More perks are coming soon!</p>
                                    <p className="text-sm text-muted-foreground mt-1">We're always working on new partnerships for you.</p>
                                </CardContent>
                            </Card>
                        </div>
                        <DialogFooter className="text-xs text-muted-foreground text-center sm:text-center pt-4 border-t">
                            <p>All employees of your company are entitled to these perks.</p>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Lightbulb className="h-5 w-5 text-yellow-400" /> Tip of the Day
                        </CardTitle>
                         <CardDescription>A daily tip to keep your water safe and refreshing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                       {dailyTip && (
                           <>
                               <h4 className="font-semibold">{dailyTip.title}</h4>
                               <p className="text-sm text-muted-foreground">{dailyTip.description}</p>
                           </>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
    );

}

    


    