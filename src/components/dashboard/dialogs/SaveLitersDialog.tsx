'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppUser, Delivery } from '@/lib/types';
import { startOfMonth, isWithinInterval, subMonths, endOfMonth, format } from 'date-fns';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface SaveLitersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  deliveries: Delivery[] | null;
}

export function SaveLitersDialog({ isOpen, onOpenChange, user, deliveries }: SaveLitersDialogProps) {
  const { toast } = useToast();

  const consumptionDetails = useMemo(() => {
    const now = new Date();
    if (!user || !user.plan || !deliveries || !user.createdAt) {
      return { currentBalance: 0 };
    }

    const cycleStart = startOfMonth(now);
    const cycleEnd = endOfMonth(now);
    const deliveriesThisCycle = deliveries.filter(d => isWithinInterval(new Date(d.date), { start: cycleStart, end: cycleEnd }));
    const consumedLitersThisMonth = deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);

    const createdAtDate = typeof (user.createdAt as any)?.toDate === 'function' ? (user.createdAt as any).toDate() : new Date(user.createdAt as string);
    const lastMonth = subMonths(now, 1);
    const lastCycleStart = startOfMonth(lastMonth);
    const lastCycleEnd = endOfMonth(lastMonth);
    
    const monthlyPlanLiters = user.customPlanDetails?.litersPerMonth || 0;
    const bonusLiters = user.customPlanDetails?.bonusLiters || 0;
    const totalMonthlyAllocation = monthlyPlanLiters + bonusLiters;
    
    let rolloverLiters = 0;
    if (createdAtDate < lastCycleStart) {
        const deliveriesLastCycle = deliveries.filter(d => isWithinInterval(new Date(d.date), { start: lastCycleStart, end: lastCycleEnd }));
        const consumedLitersLastMonth = deliveriesLastCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
        rolloverLiters = Math.max(0, totalMonthlyAllocation - consumedLitersLastMonth);
    }

    const totalLitersForMonth = totalMonthlyAllocation + rolloverLiters;
    const currentBalance = totalLitersForMonth - consumedLitersThisMonth;
    return { currentBalance };
  }, [user, deliveries]);

  const handleSaveLiters = () => {
    toast({
      title: "Liters Saved!",
      description: `${consumptionDetails.currentBalance.toLocaleString()} liters will be added to your next month's balance.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Remaining Liters</DialogTitle>
          <DialogDescription>Carry over your unused water credits to the next month.</DialogDescription>
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
  );
}
