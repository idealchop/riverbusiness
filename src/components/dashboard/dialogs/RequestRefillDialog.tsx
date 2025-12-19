
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Refill</DialogTitle>
          <DialogDescription>Select a date and quantity for your delivery.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={deliveryDate}
              onSelect={setDeliveryDate}
              disabled={(date) => date < new Date() || isSubmitting}
              initialFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="oneTimeContainers">Number of Containers</Label>
            <Input
              id="oneTimeContainers"
              type="number"
              value={containers}
              onChange={(e) => setContainers(Number(e.target.value))}
              min="1"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!deliveryDate || isSubmitting}>
            {isSubmitting ? 'Sending Request...' : 'Confirm Delivery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
