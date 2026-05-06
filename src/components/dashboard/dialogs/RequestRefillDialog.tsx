'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isWeekend } from 'date-fns';
import Image from 'next/image';
import { Package, Calendar as CalendarIcon, Info, Droplets, ChevronRight } from 'lucide-react';

interface RequestRefillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (date: Date, containers: number) => void;
  isSubmitting: boolean;
}

export function RequestRefillDialog({ isOpen, onOpenChange, onSubmit, isSubmitting }: RequestRefillDialogProps) {
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [containers, setContainers] = useState<number>(1);

  const handleSubmit = () => {
    if (deliveryDate && containers > 0) {
      onSubmit(deliveryDate, containers);
    }
  };

  const isDateWeekend = deliveryDate && isWeekend(deliveryDate);
  const brandingImage = "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden shadow-none rounded-2xl border-none">
        <div className="relative aspect-video w-full">
           <Image 
              src={brandingImage} 
              alt="Water Refill Service" 
              fill 
              className="object-cover"
              priority
              data-ai-hint="water refill"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
           <div className="absolute bottom-6 left-6 text-white">
              <h2 className="text-3xl font-black tracking-tight leading-none">Request Refill</h2>
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-2">Professional Hydration Logistics</p>
           </div>
        </div>

        <div className="p-6 space-y-8">
            <div className="grid gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-primary border border-blue-100">
                            <Package className="h-4 w-4" />
                        </div>
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">1. Quantity Selection</Label>
                    </div>
                    <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-dashed">
                        <div className="flex-1 space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Gallons Needed</p>
                            <Input
                                type="number"
                                value={containers}
                                onChange={(e) => setContainers(Number(e.target.value))}
                                min="1"
                                disabled={isSubmitting}
                                className="bg-white font-black text-lg h-12 border-slate-200 shadow-none focus-visible:ring-primary"
                            />
                        </div>
                        <div className="p-3 rounded-2xl bg-white border border-slate-100">
                            <Droplets className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-primary border border-blue-100">
                            <CalendarIcon className="h-4 w-4" />
                        </div>
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">2. Scheduled Date</Label>
                    </div>
                    <div className="flex justify-center border rounded-2xl p-2 bg-white">
                        <Calendar
                            mode="single"
                            selected={deliveryDate}
                            onSelect={setDeliveryDate}
                            disabled={(date) => date < new Date() || isSubmitting}
                            initialFocus
                        />
                    </div>
                </div>
            </div>

            {isDateWeekend && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-tight text-amber-800/80 leading-relaxed">
                        Hydration Note: We don't dispatch on weekends. Your request will be processed for Monday delivery.
                    </p>
                </div>
            )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t flex items-center justify-between gap-4">
          <DialogClose asChild>
            <Button variant="ghost" disabled={isSubmitting} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-slate-900">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleSubmit} 
            disabled={!deliveryDate || isSubmitting}
            className="flex-1 shadow-lg font-black h-12 uppercase tracking-widest text-xs rounded-xl"
          >
            {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-dashed rounded-full animate-spin mr-2" />
            ) : null}
            {isSubmitting ? 'Syncing...' : 'Authorize Delivery'}
            {!isSubmitting && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
