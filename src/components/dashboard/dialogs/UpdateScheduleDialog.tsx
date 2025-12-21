
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DocumentReference, updateDoc } from 'firebase/firestore';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface UpdateScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userDocRef: DocumentReference | null;
  customPlanDetails: any;
}

export function UpdateScheduleDialog({ isOpen, onOpenChange, userDocRef, customPlanDetails }: UpdateScheduleDialogProps) {
  const { toast } = useToast();
  const [newDeliveryDay, setNewDeliveryDay] = useState<string>('');
  const [newDeliveryTime, setNewDeliveryTime] = useState<string>('');

  useEffect(() => {
    if (customPlanDetails) {
      setNewDeliveryDay(customPlanDetails.deliveryDay || '');
      setNewDeliveryTime(customPlanDetails.deliveryTime || '');
    }
  }, [customPlanDetails]);

  const handleScheduleUpdate = async () => {
    if (!userDocRef || !newDeliveryDay || !newDeliveryTime) {
      toast({ variant: "destructive", title: "Update Failed", description: "Please select a valid day and time." });
      return;
    }
    try {
        await updateDoc(userDocRef, {
            'customPlanDetails.deliveryDay': newDeliveryDay,
            'customPlanDetails.deliveryTime': newDeliveryTime,
        });

        toast({ title: "Schedule Updated", description: "Your delivery schedule has been updated successfully." });
        onOpenChange(false);
    } catch (error) {
        console.error("Failed to update schedule:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not save your schedule changes." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Delivery Schedule</DialogTitle>
          <DialogDescription>Select your preferred day and time for your recurring delivery.</DialogDescription>
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
  );
}
