
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface SwitchProviderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SwitchProviderDialog({ isOpen, onOpenChange }: SwitchProviderDialogProps) {
  const { toast } = useToast();
  const [switchReason, setSwitchReason] = React.useState('');
  const [switchUrgency, setSwitchUrgency] = React.useState('');

  const handleSwitchProviderSubmit = () => {
    toast({
        title: 'Request Sent',
        description: 'Your request to switch providers has been submitted to the admin team.',
    });
    onOpenChange(false);
    setSwitchReason('');
    setSwitchUrgency('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to Switch Water Provider</DialogTitle>
          <DialogDescription>
            Please provide a reason for your request. An admin will contact you shortly.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Textarea
            placeholder="Describe the reason for your request (e.g., water quality, delivery issues, etc.)..."
            value={switchReason}
            onChange={(e) => setSwitchReason(e.target.value)}
          />
          <Select onValueChange={setSwitchUrgency} value={switchUrgency}>
            <SelectTrigger>
              <SelectValue placeholder="Select urgency level..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - Just exploring options</SelectItem>
              <SelectItem value="medium">I have some concerns</SelectItem>
              <SelectItem value="high">High - Urgent issue, need to switch ASAP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSwitchProviderSubmit}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
