'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RefillRequest, RefillRequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Send, Settings, Truck, CheckCircle, FileX, Package, Calendar, Clock, MessageSquare, Info, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

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

  const isWeekendRequest = React.useMemo(() => {
    if (!activeRefillRequest?.requestedAt || !(activeRefillRequest.requestedAt instanceof Timestamp)) {
        return false;
    }
    const requestedAtDate = activeRefillRequest.requestedAt.toDate();
    const dayOfWeek = requestedAtDate.getDay(); // 0 for Sunday, 6 for Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, [activeRefillRequest]);

  const currentStatus = activeRefillRequest?.status || 'Requested';
  const config = statusConfig[currentStatus];
  const Icon = config.icon;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <div className="bg-slate-50 border-b p-6">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Refill Tracker</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">
                            Real-time Fulfillment Feed
                        </DialogDescription>
                    </div>
                    {activeRefillRequest && (
                        <Badge variant="outline" className="h-6 font-mono text-[10px] bg-white shadow-sm border-slate-200">
                            REF-{activeRefillRequest.id.substring(0, 8).toUpperCase()}
                        </Badge>
                    )}
                </div>
            </DialogHeader>
        </div>

        {activeRefillRequest ? (
          <div className="p-6 space-y-8">
            {/* Current Status Hero */}
            <div className={cn("rounded-2xl p-6 border flex items-center gap-5 transition-all shadow-sm", config.bg, "border-white shadow-inner")}>
                <div className={cn("p-4 rounded-full bg-white shadow-md text-white", config.color)}>
                    <Icon className="h-8 w-8" />
                </div>
                <div>
                    <h3 className={cn("text-xl font-black tracking-tight mb-1", config.color)}>{config.label}</h3>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">{config.subtext}</p>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="relative pl-2">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                <div className="space-y-8 relative">
                    {statusOrder.map((status, index) => {
                        const currentStatusIndex = statusOrder.indexOf(currentStatus);
                        const isCompleted = index < currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;
                        const StatusIcon = statusConfig[status].icon;

                        return (
                            <div key={status} className={cn(
                                "flex items-start gap-6 transition-all",
                                !isCompleted && !isCurrent && "opacity-40 grayscale"
                            )}>
                                <div className={cn(
                                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white shadow-sm transition-all",
                                    isCompleted ? "bg-green-500 text-white" :
                                    isCurrent ? "bg-blue-600 text-white scale-110 ring-4 ring-blue-50" :
                                    "bg-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <StatusIcon className="h-4 w-4" />}
                                </div>
                                <div className="pt-1">
                                    <h4 className={cn(
                                        "text-sm font-bold uppercase tracking-wider",
                                        isCurrent ? "text-blue-600" : "text-slate-900"
                                    )}>
                                        {statusConfig[status].label}
                                        {isCurrent && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {statusConfig[status].message}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                        <Package className="h-3 w-3" /> Fulfillment Volume
                    </p>
                    <p className="text-base font-bold text-slate-900">
                        {activeRefillRequest.volumeContainers || 1} <span className="text-xs font-medium text-slate-500 uppercase tracking-tighter">Containers</span>
                    </p>
                </div>
                <div className="p-4 rounded-xl border bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Target Dispatch
                    </p>
                    <p className="text-base font-bold text-slate-900">
                        {activeRefillRequest.requestedDate 
                            ? format(new Date(activeRefillRequest.requestedDate), 'MMM d, yyyy')
                            : 'ASAP Refill'
                        }
                    </p>
                </div>
            </div>

            {/* Support Callout */}
            <Card className="border-dashed bg-muted/20 shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border shadow-sm">
                            <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900">Need to modify your request?</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Our support team is online</p>
                        </div>
                    </div>
                    <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary gap-1"
                        onClick={() => {
                            onOpenChange(false);
                            window.dispatchEvent(new CustomEvent('open-live-support'));
                        }}
                    >
                        Chat Now <ChevronRight className="h-3 w-3" />
                    </Button>
                </CardContent>
            </Card>

            {isWeekendRequest && currentStatus === 'Requested' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-tight text-amber-800/80 leading-relaxed">
                        Hydration Insight: Requests made on weekends are processed on the next business day (Monday).
                    </p>
                </div>
            )}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-10">
            <div className="h-12 w-12 border-4 border-dashed border-primary rounded-full animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Syncing Fulfillment Data...</p>
          </div>
        )}

        <DialogFooter className="bg-slate-50 p-6 pt-4 border-t">
            <DialogClose asChild>
                <Button variant="outline" className="w-full h-10 font-bold uppercase tracking-widest text-xs border-slate-200">
                    Close Tracker
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
