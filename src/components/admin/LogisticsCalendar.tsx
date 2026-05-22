'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Repeat, 
    Truck, 
    Clock, 
    User, 
    Settings2, 
    Info, 
    Grab, 
    Loader2, 
    Save, 
    ShieldCheck,
    CheckCircle2,
    X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AppUser, RefillRequest } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Popover,
    PopoverContent,
    PopoverTrigger 
} from '@/components/ui/popover';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// Sub-component for individual client entries to manage their own Popover state
function ClientRefillEntry({ 
    user, 
    onDragStart, 
    onSave 
}: { 
    user: AppUser, 
    onDragStart: (e: React.DragEvent) => void,
    onSave: (userId: string, day: string, time: string) => Promise<void>
}) {
    const [localDay, setLocalDay] = useState(user.customPlanDetails?.deliveryDay || 'Monday');
    const [localTime, setLocalTime] = useState(user.customPlanDetails?.deliveryTime || '09:00');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleInternalSave = async () => {
        setIsUpdating(true);
        await onSave(user.id, localDay, localTime);
        setIsUpdating(false);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button 
                    draggable
                    onDragStart={onDragStart}
                    className="w-full text-left p-1.5 rounded-xl bg-blue-50 border border-blue-100 text-[9px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1.5 hover:bg-white transition-all shadow-sm group/btn cursor-grab active:cursor-grabbing"
                >
                    <Grab className="h-2.5 w-2.5 shrink-0 opacity-40 group-hover/btn:opacity-100" />
                    <span className="truncate flex-1">{user.businessName}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                        <Clock className="h-2.5 w-2.5 text-blue-300" />
                        <span className="text-[7px]">{user.customPlanDetails?.deliveryTime || '09:00'}</span>
                    </div>
                </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-64 p-0 rounded-2xl shadow-3xl border-slate-100 bg-white overflow-hidden z-50">
                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjust Cycle</p>
                    <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-900"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Day</Label>
                        <Select value={localDay} onValueChange={setLocalDay}>
                            <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200 font-bold text-xs shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                                {WEEKDAYS.map(day => (
                                    <SelectItem key={day} value={day} className="font-bold text-xs py-2 rounded-lg">{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Dispatch Window</Label>
                        <div className="relative">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                            <Input 
                                type="time" 
                                value={localTime}
                                onChange={(e) => setLocalTime(e.target.value)}
                                className="h-9 rounded-xl bg-white border-slate-200 font-bold text-xs pl-8 shadow-sm"
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleInternalSave} 
                        disabled={isUpdating}
                        size="sm"
                        className="w-full rounded-xl h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 gap-2"
                    >
                        {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Schedule
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function LogisticsCalendar({ users, refillRequests }: { users: AppUser[], refillRequests: RefillRequest[] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const firestore = useFirestore();
    const { toast } = useToast();

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });
    }, [currentMonth]);

    const handleDragStart = (e: React.DragEvent, user: AppUser) => {
        e.dataTransfer.setData('userId', user.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetDay: string) => {
        e.preventDefault();
        const userId = e.dataTransfer.getData('userId');
        const user = users.find(u => u.id === userId);

        if (!user || !firestore || user.customPlanDetails?.deliveryDay === targetDay) return;

        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, {
                'customPlanDetails.deliveryDay': targetDay
            });
            toast({ 
                title: 'Schedule Synchronized', 
                description: `${user.businessName} has been moved to ${targetDay}.` 
            });
        } catch (error) {
            console.error("Drag update failed:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleSaveSchedule = async (userId: string, day: string, time: string) => {
        if (!firestore) return;
        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, {
                'customPlanDetails.deliveryDay': day,
                'customPlanDetails.deliveryTime': time
            });
            toast({ 
                title: 'Cycle Adjusted', 
                description: `Client logistics window updated successfully.` 
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-2 text-slate-900">
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
                <div className="grid grid-cols-7 divide-x divide-y border-b relative">
                    {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[140px] bg-slate-50/10" />
                    ))}
                    
                    {days.map(day => {
                        const dayName = format(day, 'EEEE');
                        const autoRefills = users.filter(u => 
                            u.customPlanDetails?.autoRefillEnabled === true && 
                            u.customPlanDetails?.deliveryDay === dayName &&
                            u.subscriptionStatus === 'activated'
                        );

                        const manualRequests = refillRequests.filter(req => {
                            const reqDate = toSafeDate(req.requestedDate);
                            return reqDate && isSameDay(reqDate, day);
                        });

                        const isToday = isSameDay(day, new Date());

                        return (
                            <div 
                                key={day.toISOString()} 
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, dayName)}
                                className={cn(
                                    "min-h-[160px] p-2 space-y-2 group transition-all duration-300 relative",
                                    isToday ? "bg-blue-50/40" : "bg-white hover:bg-slate-50/80"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={cn(
                                        "text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-lg transition-all",
                                        isToday ? "bg-primary text-white shadow-lg" : "text-slate-300 group-hover:text-slate-900"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    {(autoRefills.length > 0 || manualRequests.length > 0) && (
                                        <Badge variant="ghost" className="h-4 px-1.5 bg-slate-100 text-slate-400 text-[8px] font-black border-none">
                                            {autoRefills.length + manualRequests.length}
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="space-y-1.5">
                                    {autoRefills.map(u => (
                                        <ClientRefillEntry 
                                            key={u.id} 
                                            user={u} 
                                            onDragStart={(e) => handleDragStart(e, u)}
                                            onSave={handleSaveSchedule}
                                        />
                                    ))}
                                    {manualRequests.map(req => (
                                        <div 
                                            key={req.id} 
                                            className="w-full p-1.5 rounded-xl bg-amber-50 border border-amber-100 text-[9px] font-bold text-amber-700 uppercase tracking-tighter flex items-center gap-1.5 shadow-sm border-dashed"
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
                <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-8 ml-2">
                    <Info className="h-3 w-3 text-slate-300" />
                    <span className="text-[9px] font-bold italic text-slate-400 tracking-tight">Drag entries to re-schedule, or click to adjust precise time windows.</span>
                </div>
            </CardFooter>
        </Card>
    );
}
