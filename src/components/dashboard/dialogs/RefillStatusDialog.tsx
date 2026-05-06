'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RefillRequest, RefillRequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Send, Settings, Truck, CheckCircle, FileX, Package, Calendar, Info, ChevronRight, History, ArrowLeft, Clock } from 'lucide-react';
import Image from 'next/image';
import { Timestamp, collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { format, formatDistanceToNow } from 'date-fns';

const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
};

/**
 * Calculates the time duration between the initial request and completion.
 */
const getCompletionDuration = (request: RefillRequest) => {
    const start = toSafeDate(request.requestedAt);
    const completionEntry = request.statusHistory?.find(h => h.status === 'Completed');
    const end = completionEntry ? toSafeDate(completionEntry.timestamp) : null;

    if (!start || !end) return null;

    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHrs = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (diffHrs < 24) return `${diffHrs}h ${remainingMins}m`;
    
    const diffDays = Math.floor(diffHrs / 24);
    const remainingHrs = diffHrs % 24;
    return `${diffDays}d ${remainingHrs}h`;
};

interface RefillStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeRefillRequest: RefillRequest | null;
}

const statusConfig: Record<RefillRequestStatus, { 
    label: string; 
    icon: React.ElementType; 
    message: string;
    subtext: string;
    color: string;
    bg: string;
}> = {
    'Requested': { 
        label: 'Request Received', 
        icon: Send, 
        message: "We've received your refill request.",
        subtext: "Our fulfillment team is reviewing your requirements.",
        color: 'text-blue-600',
        bg: 'bg-blue-50'
    },
    'In Production': { 
        label: 'In Production', 
        icon: Settings, 
        message: 'Your water is being prepared.',
        subtext: 'We are sanitizing and filling your containers at the station.',
        color: 'text-amber-600',
        bg: 'bg-amber-50'
    },
    'Out for Delivery': { 
        label: 'Out for Delivery', 
        icon: Truck, 
        message: 'Your fresh water is on its way!',
        subtext: 'The delivery truck has been dispatched to your address.',
        color: 'text-purple-600',
        bg: 'bg-purple-50'
    },
    'Completed': { 
        label: 'Delivery Complete', 
        icon: CheckCircle, 
        message: 'Your water has been delivered.',
        subtext: 'Digital Proof of Delivery (POD) is now available in your logs.',
        color: 'text-green-600',
        bg: 'bg-green-50'
    },
    'Cancelled': { 
        label: 'Request Cancelled', 
        icon: FileX, 
        message: 'This request has been cancelled.',
        subtext: 'Please contact support if this was a mistake.',
        color: 'text-slate-600',
        bg: 'bg-slate-50'
    },
};

const statusOrder: RefillRequestStatus[] = ['Requested', 'In Production', 'Out for Delivery', 'Completed'];

export function RefillStatusDialog({ isOpen, onOpenChange, activeRefillRequest }: RefillStatusDialogProps) {
  const [view, setView] = useState<'tracker' | 'history'>('tracker');
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  // Fetch past refill requests for the History view
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(
        collection(firestore, 'users', authUser.uid, 'refillRequests'),
        where('status', 'in', ['Completed', 'Cancelled'])
    );
  }, [firestore, authUser]);

  const { data: rawHistory, isLoading: isHistoryLoading } = useCollection<RefillRequest>(historyQuery);

  const refillHistory = useMemo(() => {
    if (!rawHistory) return [];
    return [...rawHistory].sort((a, b) => {
        const dateA = toSafeDate(a.requestedAt)?.getTime() || 0;
        const dateB = toSafeDate(b.requestedAt)?.getTime() || 0;
        return dateB - dateA;
    });
  }, [rawHistory]);

  const isWeekendRequest = React.useMemo(() => {
    if (!activeRefillRequest?.requestedAt) return false;
    const requestedAtDate = toSafeDate(activeRefillRequest.requestedAt);
    if (!requestedAtDate) return false;
    const dayOfWeek = requestedAtDate.getDay(); 
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, [activeRefillRequest]);

  const currentStatus = activeRefillRequest?.status || 'Requested';
  const config = statusConfig[currentStatus];
  const Icon = config.icon;
  const brandingImage = "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) setView('tracker');
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden shadow-none rounded-2xl border-none">
        {/* Responsive Branding Header */}
        <div className="relative aspect-video w-full">
           <Image 
              src={brandingImage} 
              alt="Refill Status" 
              fill 
              className="object-cover"
              priority
              data-ai-hint="water refill status"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
           <div className="absolute bottom-6 left-6 flex items-center justify-between right-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">
                    {view === 'history' ? 'Refill History' : 'Refill Tracker'}
                </h2>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">
                    {view === 'history' ? 'Past fulfillment cycles' : 'Real-time Fulfillment Feed'}
                </p>
              </div>
              {view === 'tracker' && activeRefillRequest && (
                  <Badge variant="outline" className="h-5 font-mono text-[9px] bg-white/10 text-white border-white/20 backdrop-blur-sm">
                      REF-{activeRefillRequest.id.substring(0, 8).toUpperCase()}
                  </Badge>
              )}
           </div>
        </div>

        {/* View Switcher Content */}
        {view === 'tracker' ? (
          <>
            {activeRefillRequest ? (
              <div className="p-5 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* Active Status Hero */}
                <div className={cn("rounded-xl p-4 border flex items-center gap-4 transition-all", config.bg, "border-white shadow-none")}>
                    <div className={cn("p-2.5 rounded-full bg-white border border-slate-100", config.color)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className={cn("text-base font-black tracking-tight mb-0.5", config.color)}>{config.label}</h3>
                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{config.subtext}</p>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="relative pl-1">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                    <div className="space-y-6 relative">
                        {statusOrder.map((status, index) => {
                            const currentStatusIndex = statusOrder.indexOf(currentStatus);
                            const isCompleted = index < currentStatusIndex;
                            const isCurrent = index === currentStatusIndex;
                            const StatusIcon = statusConfig[status].icon;

                            return (
                                <div key={status} className={cn(
                                    "flex items-start gap-5 transition-all",
                                    !isCompleted && !isCurrent && "opacity-30 grayscale"
                                )}>
                                    <div className={cn(
                                        "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white transition-all",
                                        isCompleted ? "bg-green-500 text-white" :
                                        isCurrent ? "bg-blue-600 text-white scale-110 ring-4 ring-blue-50" :
                                        "bg-slate-200 text-slate-400"
                                    )}>
                                        {isCompleted ? <CheckCircle className="h-3 w-3" /> : <StatusIcon className="h-3 w-3" />}
                                    </div>
                                    <div className="pt-0.5">
                                        <h4 className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            isCurrent ? "text-blue-600" : "text-slate-900"
                                        )}>
                                            {statusConfig[status].label}
                                            {isCurrent && <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />}
                                        </h4>
                                        <p className="text-[9px] font-bold text-muted-foreground mt-0.5 leading-relaxed">
                                            {statusConfig[status].message}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {isWeekendRequest && currentStatus === 'Requested' && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold uppercase tracking-tight text-amber-800/80 leading-relaxed">
                            Hydration Note: We don't dispatch on weekends. Your request will be processed for Monday delivery.
                        </p>
                    </div>
                )}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center px-10">
                <Package className="h-10 w-10 text-slate-200" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No active refill in progress</p>
                <Button variant="link" onClick={() => setView('history')} className="text-[10px] font-black uppercase tracking-widest text-primary">View History Instead</Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-5 space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="max-h-80 overflow-y-auto pr-1 -mr-1 space-y-3">
                {isHistoryLoading ? (
                    <div className="py-10 text-center animate-pulse">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading History...</p>
                    </div>
                ) : refillHistory && refillHistory.length > 0 ? (
                    refillHistory.map(req => {
                        const duration = getCompletionDuration(req);
                        const date = toSafeDate(req.requestedAt);
                        return (
                            <div key={req.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:bg-white hover:border-slate-200 transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[8px] font-mono uppercase bg-white px-1.5 h-4 border-slate-200">REF-{req.id.substring(0, 4)}</Badge>
                                        <span className="text-[10px] font-bold text-slate-900">{date ? format(date, 'MMM d, yyyy') : 'N/A'}</span>
                                    </div>
                                    <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">
                                        {req.volumeContainers || 0} Containers • {req.status}
                                    </p>
                                </div>
                                {duration && req.status === 'Completed' && (
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1 text-green-600">
                                            <Clock className="h-3 w-3" />
                                            <span className="text-[11px] font-black">{duration}</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Time</p>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="py-10 text-center flex flex-col items-center gap-3">
                        <History className="h-8 w-8 text-slate-200" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No previous requests found</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="bg-slate-50 p-5 pt-4 border-t flex items-center justify-between gap-4">
            {view === 'tracker' ? (
                <>
                    <Button 
                        variant="ghost" 
                        onClick={() => setView('history')}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors h-10 px-4"
                    >
                        <History className="mr-2 h-3.5 w-3.5" />
                        Full History
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline" className="flex-1 h-10 font-bold uppercase tracking-widest text-[10px] border-slate-200 shadow-none rounded-xl">
                            Dismiss
                        </Button>
                    </DialogClose>
                </>
            ) : (
                <Button 
                    variant="outline" 
                    onClick={() => setView('tracker')}
                    className="w-full h-10 font-bold uppercase tracking-widest text-[10px] border-slate-200 shadow-none rounded-xl"
                >
                    <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                    Back to Active Tracker
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}