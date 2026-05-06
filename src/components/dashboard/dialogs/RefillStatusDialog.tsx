'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RefillRequest, RefillRequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Send, Settings, Truck, CheckCircle, FileX, Package, Calendar, Info, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    const dayOfWeek = requestedAtDate.getDay(); 
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, [activeRefillRequest]);

  const currentStatus = activeRefillRequest?.status || 'Requested';
  const config = statusConfig[currentStatus];
  const Icon = config.icon;
  const brandingImage = "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden shadow-none rounded-2xl border-none">
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
                <h2 className="text-xl font-black tracking-tight text-white">Refill Tracker</h2>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">Real-time Fulfillment Feed</p>
              </div>
              {activeRefillRequest && (
                  <Badge variant="outline" className="h-5 font-mono text-[9px] bg-white/10 text-white border-white/20 backdrop-blur-sm">
                      REF-{activeRefillRequest.id.substring(0, 8).toUpperCase()}
                  </Badge>
              )}
           </div>
        </div>

        {activeRefillRequest ? (
          <div className="p-5 space-y-6">
            <div className={cn("rounded-xl p-4 border flex items-center gap-4 transition-all", config.bg, "border-white shadow-none")}>
                <div className={cn("p-2.5 rounded-full bg-white border border-slate-100", config.color)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className={cn("text-base font-black tracking-tight mb-0.5", config.color)}>{config.label}</h3>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{config.subtext}</p>
                </div>
            </div>

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
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-tight text-amber-800/80 leading-relaxed">
                        Note: Requests made on weekends are processed on the next business day (Monday).
                    </p>
                </div>
            )}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center px-10">
            <div className="h-10 w-10 border-4 border-dashed border-primary rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Syncing Fulfillment Data...</p>
          </div>
        )}

        <DialogFooter className="bg-slate-50 p-5 pt-4 border-t">
            <DialogClose asChild>
                <Button variant="outline" className="w-full h-10 font-bold uppercase tracking-widest text-[10px] border-slate-200 shadow-none rounded-xl">
                    Close Tracker
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
