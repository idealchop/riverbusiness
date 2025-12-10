
'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LifeBuoy, Droplet, Truck, MessageSquare, Waves, Droplets, History, Star, Send, ArrowUp, ArrowDown, ArrowRight, CheckCircle, Clock, Info, PackageCheck, Package, Lightbulb, Gift, ExternalLink, MapPin, FileText, Eye, Download, Calendar as CalendarIcon, Edit, ShieldCheck, FileHeart, Shield, Save, Wrench, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Delivery, WaterStation, AppUser, ComplianceReport, SanitationVisit, ConsumptionHistory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, subDays, startOfMonth, getWeekOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const containerToLiter = (containers: number) => (containers || 0) * 19.5;

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


const perks = [
    { 
        brand: "Fitness Gym", 
        image: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPartners%2FNewBreed.png?alt=media&token=51a87e73-21f0-448c-9596-cc4a7016ad27",
        subtitle: "6 locations currently and continuously growing",
        discounts: [
            { title: "50% membership discounts" },
            { title: "1 monthly free session (free)" },
            { title: "1 Structured Class in the office", description: "physical activity for better engagement and productivity" }
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

export default function DashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    
    const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: user, isLoading: isUserLoading } = useDoc<AppUser>(userDocRef);

    const [greeting, setGreeting] = useState('');
    
    const [isDeliveryHistoryOpen, setIsDeliveryHistoryOpen] = useState(false);
    const [isConsumptionHistoryOpen, setIsConsumptionHistoryOpen] = useState(false);
    const [dailyTip, setDailyTip] = useState<{title: string, description: string} | null>(null);
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
    const [deliveryDateRange, setDeliveryDateRange] = React.useState<DateRange | undefined>()
    
    const [isUpdateScheduleOpen, setIsUpdateScheduleOpen] = useState(false);
    const [isScheduleOneTimeDeliveryOpen, setIsScheduleOneTimeDeliveryOpen] = useState(false);
    const [oneTimeDeliveryDate, setOneTimeDeliveryDate] = useState<Date | undefined>();
    const [oneTimeDeliveryContainers, setOneTimeDeliveryContainers] = useState<number>(1);
    const [newDeliveryDay, setNewDeliveryDay] = useState<string>('');
    const [newDeliveryTime, setNewDeliveryTime] = useState<string>('');
    const [analyticsFilter, setAnalyticsFilter] = useState<'weekly' | 'monthly'>('weekly');
    const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);
    const [isSaveLitersDialogOpen, setIsSaveLitersDialogOpen] = useState(false);

    const deliveriesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users', user.id, 'deliveries') : null, [firestore, user]);
    const { data: deliveries, isLoading: areDeliveriesLoading } = useCollection<Delivery>(deliveriesQuery);

    const stationDocRef = useMemoFirebase(() => (firestore && user?.assignedWaterStationId) ? doc(firestore, 'waterStations', user.assignedWaterStationId) : null, [firestore, user]);
    const { data: waterStation } = useDoc<WaterStation>(stationDocRef);

    const complianceReportsQuery = useMemoFirebase(() => 
        (firestore && user?.assignedWaterStationId) 
        ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports') 
        : null, 
        [firestore, user?.assignedWaterStationId]
    );
    const { data: complianceReports, isLoading: complianceLoading } = useCollection<ComplianceReport>(complianceReportsQuery);

    const sanitationVisitsQuery = useMemoFirebase(() => 
        (firestore && user?.assignedWaterStationId) 
        ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'sanitationVisits') 
        : null, 
        [firestore, user?.assignedWaterStationId]
    );
    const { data: sanitationVisits, isLoading: sanitationLoading } = useCollection<SanitationVisit>(sanitationVisitsQuery);

    const consumptionDetails = useMemo(() => {
        if (!user || !user.plan || !user.createdAt) {
            return {
                monthlyPlanLiters: 0,
                bonusLiters: 0,
                rolloverLiters: 0,
                totalLitersForMonth: 0,
                consumedLitersThisMonth: 0,
                currentBalance: user?.totalConsumptionLiters || 0,
                consumedPercentage: 0,
                remainingPercentage: 0,
            };
        }

        const monthlyPlanLiters = user.customPlanDetails?.litersPerMonth || 0;
        const bonusLiters = user.customPlanDetails?.bonusLiters || 0;
        const currentBalance = user.totalConsumptionLiters;
        
        const now = new Date();
        const createdAt = typeof (user.createdAt as any)?.toDate === 'function' 
            ? (user.createdAt as any).toDate() 
            : new Date(user.createdAt as string);
        
        if (isNaN(createdAt.getTime())) {
            return {
                monthlyPlanLiters, bonusLiters, rolloverLiters: 0, totalLitersForMonth: monthlyPlanLiters + bonusLiters, consumedLitersThisMonth: 0, currentBalance, consumedPercentage: 0, remainingPercentage: 100
            };
        }

        const cycleDay = createdAt.getDate();
        let cycleStart = new Date(now.getFullYear(), now.getMonth(), cycleDay);
        if (now < cycleStart) {
            cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, cycleDay);
        }
        let cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, cycleDay -1);
        cycleEnd.setHours(23, 59, 59, 999);


        const deliveriesThisCycle = (deliveries || []).filter(d => 
            isWithinInterval(new Date(d.date), { start: cycleStart, end: cycleEnd })
        );
        const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);

        const totalMonthlyAllocation = monthlyPlanLiters + bonusLiters;
        const rolloverLiters = Math.max(0, currentBalance + consumedLitersThisMonth - totalMonthlyAllocation);
        const totalLitersForMonth = totalMonthlyAllocation + rolloverLiters;
        
        const consumedPercentage = totalLitersForMonth > 0 ? (consumedLitersThisMonth / totalLitersForMonth) * 100 : 0;
        const remainingPercentage = totalLitersForMonth > 0 ? (currentBalance / totalLitersForMonth) * 100 : 0;

        return {
            monthlyPlanLiters,
            bonusLiters,
            rolloverLiters,
            totalLitersForMonth,
            consumedLitersThisMonth,
            currentBalance,
            consumedPercentage,
            remainingPercentage
        };

    }, [user, deliveries]);

    useEffect(() => {
        const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const tipIndex = dayOfYear % tips.length;
        setDailyTip(tips[tipIndex]);
    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    useEffect(() => {
        if (user?.customPlanDetails) {
            setNewDeliveryDay(user.customPlanDetails.deliveryDay || '');
            setNewDeliveryTime(user.customPlanDetails.deliveryTime || '');
        }
    }, [user?.customPlanDetails]);

    const consumptionChartData = React.useMemo(() => {
      const sourceDeliveries = deliveries || [];
      
      if (analyticsFilter === 'weekly') {
          const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
          return last7Days.map(date => {
              const deliveriesOnDay = sourceDeliveries.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
              const totalContainers = deliveriesOnDay.reduce((sum, d) => sum + d.volumeContainers, 0);
              return {
                  name: format(date, 'EEE').charAt(0),
                  value: containerToLiter(totalContainers)
              };
          });
      } else { // monthly
          const now = new Date();
          const firstDay = startOfMonth(now);
          const lastDay = endOfMonth(now);
          const weeksInMonth = getWeekOfMonth(lastDay);

          const weeklyData = Array.from({ length: weeksInMonth }, (_, i) => ({
              name: `Week ${i + 1}`,
              value: 0
          }));

          sourceDeliveries.forEach(d => {
              const deliveryDate = new Date(d.date);
              if (deliveryDate >= firstDay && deliveryDate <= lastDay) {
                  const weekOfMonth = getWeekOfMonth(deliveryDate) -1;
                  if(weeklyData[weekOfMonth]) {
                      weeklyData[weekOfMonth].value += containerToLiter(d.volumeContainers);
                  }
              }
          });
          return weeklyData;
      }
    }, [deliveries, analyticsFilter]);
    
    const nextRefillDay = user?.customPlanDetails?.deliveryDay || 'Not set';
    const weeklyContainers = user?.customPlanDetails?.gallonQuantity || 0;
    const estimatedWeeklyLiters = containerToLiter(weeklyContainers);
    
    const autoRefill = user?.customPlanDetails?.autoRefillEnabled ?? true;

    const getStatusInfo = (status: Delivery['status'] | undefined) => {
        if (!status) return { variant: 'outline', icon: null, label: 'No Deliveries' };
        switch (status) {
            case 'Delivered': return { variant: 'default', icon: PackageCheck, label: 'Delivered' };
            case 'In Transit': return { variant: 'secondary', icon: Truck, label: 'In Transit' };
            case 'Pending': return { variant: 'outline', icon: Package, label: 'Pending' };
            default: return { variant: 'outline', icon: null, label: 'No Deliveries' };
        }
    };
    
    const filteredDeliveries = (deliveries || []).filter(delivery => {
        if (!deliveryDateRange?.from) return true;
        const fromDate = deliveryDateRange.from;
        const toDate = deliveryDateRange.to || fromDate;
        const deliveryDate = new Date(delivery.date);
        return deliveryDate >= fromDate && deliveryDate <= toDate;
    });

    const handleDownloadDeliveries = () => {
        const headers = ["ID", "Date", "Volume (Liters)", "Containers", "Status", "Proof of Delivery URL"];
        const csvRows = [headers.join(',')];

        filteredDeliveries.forEach(delivery => {
            const liters = containerToLiter(delivery.volumeContainers);
            const row = [
                delivery.id,
                format(new Date(delivery.date), 'PP'),
                liters.toFixed(2),
                delivery.volumeContainers,
                delivery.status,
                delivery.proofOfDeliveryUrl || "N/A"
            ].join(',');
            csvRows.push(row);
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `delivery-history-${user?.name?.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Download Started", description: "Your delivery history CSV is downloading." });
    };

    const handleAutoRefillToggle = (checked: boolean) => {
        if (!userDocRef) return;

        updateDocumentNonBlocking(userDocRef, {
            'customPlanDetails.autoRefillEnabled': checked,
        });

        if (checked) {
            toast({
                title: "Auto-Refill Enabled",
                description: "Your next delivery will be scheduled automatically when your balance is low.",
            });
        } else {
            toast({
                title: "Auto-Refill Disabled",
                description: "Please remember to schedule your deliveries manually.",
            });
        }
    };
    
    const handleScheduleUpdate = () => {
        if (!userDocRef || !newDeliveryDay || !newDeliveryTime) {
            toast({ variant: "destructive", title: "Update Failed", description: "Please select a valid day and time." });
            return;
        }

        updateDocumentNonBlocking(userDocRef, {
            'customPlanDetails.deliveryDay': newDeliveryDay,
            'customPlanDetails.deliveryTime': newDeliveryTime,
        });

        toast({ title: "Schedule Updated", description: "Your delivery schedule has been updated successfully." });
        setIsUpdateScheduleOpen(false);
    };

    const handleScheduleOneTimeDelivery = () => {
        if (!authUser || !firestore || !oneTimeDeliveryDate || oneTimeDeliveryContainers <= 0) {
            toast({ variant: "destructive", title: "Scheduling Failed", description: "Please select a date and enter a valid container quantity." });
            return;
        }

        const trackingNumber = `MANUAL-${Date.now()}`;
        const deliveryRef = doc(firestore, 'users', authUser.uid, 'deliveries', trackingNumber);

        const newDelivery: Delivery = {
            id: trackingNumber,
            userId: authUser.uid,
            date: oneTimeDeliveryDate.toISOString(),
            volumeContainers: oneTimeDeliveryContainers,
            status: 'Pending',
        };

        setDocumentNonBlocking(deliveryRef, newDelivery);

        toast({ title: "Delivery Scheduled", description: `A delivery of ${oneTimeDeliveryContainers} containers has been scheduled for ${format(oneTimeDeliveryDate, 'PPP')}.` });
        setIsScheduleOneTimeDeliveryOpen(false);
        setOneTimeDeliveryDate(undefined);
        setOneTimeDeliveryContainers(1);
    };

    const handleSaveLiters = () => {
        // Here you would typically have backend logic to handle this.
        // For now, we'll just show a toast notification as a placeholder.
        toast({
            title: "Liters Saved!",
            description: `${consumptionDetails.currentBalance.toLocaleString()} liters will be added to your next month's balance.`,
        });
        setIsSaveLitersDialogOpen(false);
    };
    
    if (isUserLoading || areDeliveriesLoading) {
      return <div>Loading dashboard...</div>
    }

    return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">{greeting}, {user?.businessName}. Here is an overview of your water consumption.</p>
            </div>
             <Dialog open={isComplianceDialogOpen} onOpenChange={setIsComplianceDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-auto h-auto px-4 py-2" onClick={() => setIsComplianceDialogOpen(true)}>
                        <ShieldCheck className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Water Quality &amp; Sanitation</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Water Quality & Sanitation</DialogTitle>
                        <DialogDescription>
                            Compliance reports and sanitation visits for {waterStation?.name || 'your assigned station'}.
                        </DialogDescription>
                    </DialogHeader>
                     <Tabs defaultValue="compliance" className="flex flex-col gap-4 pt-4">
                        <TabsList className="grid w-full grid-cols-2 md:w-96 mx-auto">
                            <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
                            <TabsTrigger value="sanitation">Sanitation Visits</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="compliance">
                            <Card>
                            <CardHeader>
                                <CardTitle>Water Quality Compliance</CardTitle>
                                <CardDescription>View all historical compliance reports and their status for {waterStation?.name || 'your assigned station'}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Report Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Attachment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complianceLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">Loading reports...</TableCell>
                                        </TableRow>
                                    ) : complianceReports?.map((report) => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-medium">{report.name}</TableCell>
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
                                    {(!complianceReports || complianceReports.length === 0) && !complianceLoading && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No upcoming reports scheduled.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                </Table>
                            </CardContent>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="sanitation">
                            <Card>
                            <CardHeader>
                                <CardTitle>Sanitation Visits</CardTitle>
                                <CardDescription>Manage scheduling and records of sanitation visits for {waterStation?.name || 'your assigned station'}.</CardDescription>
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
                                    {sanitationLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center">Loading visits...</TableCell>
                                        </TableRow>
                                    ) : sanitationVisits?.map((visit) => (
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
                                            <span className="text-muted-foreground text-sm">Upcoming</span>
                                        )}
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                    {(!sanitationVisits || sanitationVisits.length === 0) && !sanitationLoading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No upcoming visits scheduled.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                </Table>
                            </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
        
        <Dialog open={isDeliveryHistoryOpen} onOpenChange={setIsDeliveryHistoryOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Delivery History for {user?.name}</DialogTitle>
                    <DialogDescription>
                        A log of all past deliveries for this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 py-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn( "w-[300px] justify-start text-left font-normal", !deliveryDateRange && "text-muted-foreground" )}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDateRange?.from ? ( deliveryDateRange.to ? ( <> {format(deliveryDateRange.from, "LLL dd, y")} - {format(deliveryDateRange.to, "LLL dd, y")} </> ) : ( format(deliveryDateRange.from, "LLL dd, y") ) ) : ( <span>Pick a date range</span> )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={deliveryDateRange?.from} selected={deliveryDateRange} onSelect={setDeliveryDateRange} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleDownloadDeliveries} disabled={filteredDeliveries.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                </div>
                 <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ref ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Liters / Containers</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Attachment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeliveries.map(delivery => {
                                const statusInfo = getStatusInfo(delivery.status);
                                const liters = containerToLiter(delivery.volumeContainers || 0);
                                const containers = delivery.volumeContainers || 0;
                                return (
                                <TableRow key={delivery.id}>
                                    <TableCell>{delivery.id}</TableCell>
                                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                                    <TableCell>{liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L / {containers} containers</TableCell>
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
                                            <Badge variant="secondary">Upcoming</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                             {(deliveries || []).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No delivery history found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isConsumptionHistoryOpen} onOpenChange={setIsConsumptionHistoryOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Consumption History</DialogTitle>
                    <DialogDescription>
                        A log of your water consumption from deliveries.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Liters / Containers</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(deliveries || []).map(delivery => {
                                const liters = containerToLiter(delivery.volumeContainers || 0);
                                const containers = delivery.volumeContainers || 0;
                                return (
                                <TableRow key={delivery.id}>
                                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                                    <TableCell className="text-right">{liters.toLocaleString(undefined, {maximumFractionDigits: 0})}L / {containers} containers</TableCell>
                                </TableRow>
                                );
                            })}
                            {(deliveries || []).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center">No consumption data available.</TableCell>
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

        <Dialog open={isUpdateScheduleOpen} onOpenChange={setIsUpdateScheduleOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Delivery Schedule</DialogTitle>
                    <DialogDescription>
                        Select your preferred day and time for your recurring delivery.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid gap-2">
                        <Label>Delivery Day</Label>
                        <Select onValueChange={setNewDeliveryDay} defaultValue={newDeliveryDay}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a day..." />
                            </SelectTrigger>
                            <SelectContent>
                                {daysOfWeek.map(day => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="deliveryTime">Delivery Time</Label>
                        <Input id="deliveryTime" type="time" value={newDeliveryTime} onChange={(e) => setNewDeliveryTime(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleScheduleUpdate}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

         <Dialog open={isScheduleOneTimeDeliveryOpen} onOpenChange={setIsScheduleOneTimeDeliveryOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Schedule a One-Time Delivery</DialogTitle>
                    <DialogDescription>
                        Select a date and quantity for your delivery.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={oneTimeDeliveryDate}
                            onSelect={setOneTimeDeliveryDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="oneTimeContainers">Number of Containers</Label>
                        <Input 
                            id="oneTimeContainers" 
                            type="number" 
                            value={oneTimeDeliveryContainers} 
                            onChange={(e) => setOneTimeDeliveryContainers(Number(e.target.value))} 
                            min="1"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleScheduleOneTimeDelivery} disabled={!oneTimeDeliveryDate}>Confirm Delivery</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isSaveLitersDialogOpen} onOpenChange={setIsSaveLitersDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save Remaining Liters</DialogTitle>
                    <DialogDescription>
                        Carry over your unused water credits to the next month.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">You are about to save:</p>
                        <p className="text-2xl font-bold">{consumptionDetails.currentBalance.toLocaleString()} Liters</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            This amount will be cleared from your current balance and added to your purchased liters for next month, {format(new Date(), 'MMMM')}.
                        </p>
                    </div>
                     <div className="p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded-r-lg">
                        <h4 className="font-semibold text-sm mb-1">Did you know?</h4>
                        <p className="text-xs">
                            If your total saved liters equal or exceed your monthly purchased liters, your next month's bill will be free. It's our way of rewarding you for saving water!
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveLiters}>Confirm &amp; Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Total for this Month
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-3xl font-bold mb-2">{consumptionDetails.totalLitersForMonth.toLocaleString()} L</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between"><span>Monthly Plan:</span> <span>{consumptionDetails.monthlyPlanLiters.toLocaleString()} L</span></div>
                        <div className="flex justify-between"><span>Bonus Liters:</span> <span>{consumptionDetails.bonusLiters.toLocaleString()} L</span></div>
                        <div className="flex justify-between"><span>Rollover:</span> <span>{consumptionDetails.rolloverLiters.toLocaleString()} L</span></div>
                    </div>
                </CardContent>
                <CardFooter className="pt-0">
                    <Progress value={100} className="h-2"/>
                </CardFooter>
            </Card>
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Consumed This Month
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                    <p className="text-3xl font-bold">{consumptionDetails.consumedLitersThisMonth.toLocaleString()} L</p>
                    <Progress value={consumptionDetails.consumedPercentage} className="h-2"/>
                </CardContent>
                <CardFooter>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setIsConsumptionHistoryOpen(true)}>
                        View History
                    </Button>
                </CardFooter>
            </Card>
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Current Balance
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                    <p className="text-3xl font-bold">{consumptionDetails.currentBalance.toLocaleString()} L</p>
                    <Progress value={consumptionDetails.remainingPercentage} className="h-2" />
                </CardContent>
                <CardFooter>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setIsSaveLitersDialogOpen(true)}>
                        Save Liters
                    </Button>
                </CardFooter>
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
                        <Switch id="auto-refill" checked={autoRefill} onCheckedChange={handleAutoRefillToggle} />
                    </div>
                     <p className="text-xs text-muted-foreground">
                        {autoRefill ? "System will auto-schedule based on your recurring schedule." : "Your deliveries are paused. Schedule a delivery manually."}
                    </p>
                    <div className="border-t pt-3 space-y-2">
                        {autoRefill ? (
                             <>
                                <div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3"/>Next Refill Schedule</p>
                                    <p className="font-semibold text-sm">Next {nextRefillDay}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/>Est. Water for Delivery</p>
                                    <p className="font-semibold text-sm">{estimatedWeeklyLiters.toLocaleString()} Liters</p>
                                </div>
                                <Button variant="outline" size="sm" className="w-full" onClick={() => setIsUpdateScheduleOpen(true)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Update Schedule
                                </Button>
                             </>
                        ) : (
                            <Button variant="default" size="sm" className="w-full" onClick={() => setIsScheduleOneTimeDeliveryOpen(true)}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                Schedule Delivery
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle>Consumption Analytics</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={analyticsFilter} onValueChange={(value) => setAnalyticsFilter(value as 'weekly' | 'monthly')}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Filter..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">This Week</SelectItem>
                                <SelectItem value="monthly">This Month</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setIsDeliveryHistoryOpen(true)} variant="outline" className="w-full sm:w-auto">
                            <History className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">History</span>
                        </Button>
                    </div>
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
                                formatter={(value: number, name: string) => [`${value.toLocaleString()} Liters`, 'Consumption']}
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
                                        <Image src={perk.image} alt={perk.brand} fill style={{ objectFit: 'cover' }} />
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
                                                    <div>
                                                        <span className="font-medium">{discount.title}</span>
                                                        {discount.description && <p className="text-xs text-muted-foreground">{discount.description}</p>}
                                                    </div>
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

    
