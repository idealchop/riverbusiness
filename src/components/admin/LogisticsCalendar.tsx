'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Repeat, Truck, Clock, User, Settings2, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AppUser, RefillRequest } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'string') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
    }
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    return null;
};

export function LogisticsCalendar({ users, refillRequests }: { users: AppUser[], refillRequests: RefillRequest[] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });
    }, [currentMonth]);

    const handleAdjustSchedule = async (day: string) => {
        if (!selectedUserForEdit || !firestore) return;
        setIsUpdating(true);
        try {
            const userRef = doc(firestore, 'users', selectedUserForEdit.id);
            await updateDoc(userRef, {
                'customPlanDetails.deliveryDay': day
            });
            toast({ title: 'Schedule Updated', description: `${selectedUserForEdit.businessName} is now set for every ${day}.` });
            setSelectedUserForEdit(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        Logistics Command Calendar
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                        Monitoring network fulfillment cycles and priority dispatches.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-[11px] font-black uppercase tracking-[0.1em] px-4 w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b bg-slate-50/30">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="py-3 text-center border-r last:border-r-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">{day.substring(0, 3)}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y border-b">
                    {/* Empty cells for padding before the 1st of the month */}
                    {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/10" />
                    ))}
                    
                    {days.map(day => {
                        const dayName = format(day, 'EEEE');
                        
                        // Automated Refills: recurring weekly based on deliveryDay
                        const autoRefills = users.filter(u => 
                            u.customPlanDetails?.autoRefillEnabled === true && 
                            u.customPlanDetails?.deliveryDay === dayName &&
                            u.subscriptionStatus === 'activated'
                        );

                        // One-time Refill Requests: specifically scheduled for this date
                        const manualRequests = refillRequests.filter(req => {
                            const reqDate = toSafeDate(req.requestedDate);
                            return reqDate && isSameDay(reqDate, day);
                        });

                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={day.toISOString()} className={cn(
                                "min-h-[140px] p-2 space-y-2 group transition-all duration-300",
                                isToday ? "bg-blue-50/40" : "bg-white hover:bg-slate-50"
                            )}>
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-lg transition-all",
                                        isToday ? "bg-primary text-white shadow-lg" : "text-slate-300 group-hover:text-slate-900"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    {(autoRefills.length > 0 || manualRequests.length > 0) && (
                                        <Badge variant="ghost" className="h-4 px-1.5 bg-slate-100 text-slate-400 text-[8px] font-black">
                                            {autoRefills.length + manualRequests.length}
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="space-y-1">
                                    {autoRefills.map(u => (
                                        <button 
                                            key={u.id} 
                                            onClick={() => setSelectedUserForEdit(u)}
                                            className="w-full text-left p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[9px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1.5 hover:bg-white transition-all shadow-sm group/btn"
                                        >
                                            <Repeat className="h-2.5 w-2.5 shrink-0" />
                                            <span className="truncate flex-1">{u.businessName}</span>
                                            <Settings2 className="h-2.5 w-2.5 opacity-0 group-hover/btn:opacity-100 ml-auto transition-opacity" />
                                        </button>
                                    ))}
                                    {manualRequests.map(req => (
                                        <div 
                                            key={req.id} 
                                            className="w-full p-1.5 rounded-lg bg-amber-50 border border-amber-100 text-[9px] font-bold text-amber-700 uppercase tracking-tighter flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Truck className="h-2.5 w-2.5 shrink-0" />
                                            <span className="truncate">{req.businessName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-4 border-t flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Automated Cycle</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority Request</span>
                </div>
                <div className="flex items-center gap-2 border-l pl-8 ml-2">
                    <Info className="h-3 w-3 text-slate-300" />
                    <span className="text-[10px] font-bold italic text-slate-300 tracking-tight">Click an automated entry to adjust its schedule.</span>
                </div>
            </CardFooter>

            <Dialog open={!!selectedUserForEdit} onOpenChange={(open) => !open && setSelectedUserForEdit(null)}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-3xl bg-white p-8">
                    <DialogHeader className="mb-6">
                        <div className="p-3 rounded-2xl bg-blue-50 text-primary w-fit mb-4">
                            <Repeat className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">Adjust Cycle</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Change the recurring delivery day for <strong className="text-slate-900">{selectedUserForEdit?.businessName}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">New Target Delivery Day</Label>
                            <Select 
                                value={selectedUserForEdit?.customPlanDetails?.deliveryDay} 
                                onValueChange={handleAdjustSchedule}
                                disabled={isUpdating}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                                    {WEEKDAYS.map(day => (
                                        <SelectItem key={day} value={day} className="font-bold text-xs py-2.5 rounded-lg">{day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-blue-900 leading-relaxed uppercase tracking-tight">
                                Authorizing this change will instantly update the client's automated replenishment protocol and synchronize driver dispatches.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="pt-8 gap-3">
                        <Button variant="ghost" onClick={() => setSelectedUserForEdit(null)} className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest text-slate-400">Cancel</Button>
                        {isUpdating && <Button disabled className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Syncing</Button>}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}