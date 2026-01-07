
'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppUser, Delivery } from '@/lib/types';
import { format } from 'date-fns';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface ConsumptionHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deliveries: Delivery[] | null;
  user: AppUser | null;
  branches: AppUser[] | null;
  isParent: boolean;
}

export function ConsumptionHistoryDialog({ isOpen, onOpenChange, deliveries, user, branches, isParent }: ConsumptionHistoryDialogProps) {
    
  const branchMap = useMemo(() => {
    if (!branches) return {};
    return branches.reduce((map, branch) => {
      map[branch.id] = branch.businessName;
      return map;
    }, {} as Record<string, string>);
  }, [branches]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consumption History</DialogTitle>
          <DialogDescription>A log of your water consumption from deliveries.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                 {isParent && <TableHead>Branch</TableHead>}
                <TableHead className="text-right">Liters / Containers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(deliveries || []).map(delivery => {
                const liters = containerToLiter(delivery.volumeContainers || 0);
                const containers = delivery.volumeContainers || 0;
                return (
                  <TableRow key={delivery.id}>
                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                     {isParent && <TableCell>{branchMap[delivery.userId] || 'Unknown'}</TableCell>}
                    <TableCell className="text-right">{liters.toLocaleString(undefined, { maximumFractionDigits: 0 })}L / {containers} containers</TableCell>
                  </TableRow>
                );
              })}
              {(deliveries || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={isParent ? 3 : 2} className="text-center">No consumption data available.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
