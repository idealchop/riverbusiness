'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RefillRequest, RefillRequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Send, Settings, Truck, CheckCircle, FileX } from 'lucide-react';
import Image from 'next/image';

interface RefillStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeRefillRequest: RefillRequest | null;
}

const statusConfig: Record<RefillRequestStatus, { label: string; icon: React.ElementType; message: string; }> = {
    'Requested': { label: 'Request Sent', icon: Send, message: "We've received your refill request and our team will begin processing it shortly." },
    'In Production': { label: 'In Production', icon: Settings, message: 'Your water is being prepared and quality-checked at the station.' },
    'Out for Delivery': { label: 'Out for Delivery', icon: Truck, message: 'Your fresh water is on its way to you! Expect it to arrive soon.' },
    'Completed': { label: 'Delivery Complete', icon: CheckCircle, message: 'Your water has been delivered. Stay hydrated!' },
    'Cancelled': { label: 'Request Cancelled', icon: FileX, message: 'This request has been cancelled.' },
};

const statusOrder: RefillRequestStatus[] = ['Requested', 'In Production', 'Out for Delivery', 'Completed'];

export function RefillStatusDialog({ isOpen, onOpenChange, activeRefillRequest }: RefillStatusDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refill Request Status</DialogTitle>
          <DialogDescription>
            Here's the current progress of your refill request.
          </DialogDescription>
        </DialogHeader>
        {activeRefillRequest ? (
          <div className="space-y-8 pt-6 pb-2">
            <div className="relative aspect-video w-full max-w-sm mx-auto">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63"
                alt="Refill process"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <ol className="grid grid-cols-4 items-start">
                {statusOrder.map((status, index) => {
                  const currentStatusIndex = statusOrder.indexOf(activeRefillRequest.status);
                  const isCompleted = index < currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const Icon = statusConfig[status].icon;

                  return (
                    <li key={status} className="relative flex flex-col items-center justify-start text-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10",
                        isCompleted ? "bg-primary border-primary text-primary-foreground" :
                        isCurrent ? "bg-primary/20 border-primary text-primary animate-pulse" :
                        "bg-muted border-muted-foreground/30 text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className={cn(
                        "font-semibold text-xs mt-2",
                        (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {statusConfig[status].label}
                      </p>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {statusConfig[activeRefillRequest.status]?.message}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p>Loading status...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
