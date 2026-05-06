'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AppUser, Delivery } from '@/lib/types';
import { format } from 'date-fns';
import { BarChart3, Droplets, Calendar, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  
  const sortedDeliveries = useMemo(() => {
      if (!deliveries) return [];
      return [...deliveries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveries]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-8 bg-muted/20 border-b">
          <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">Consumption Ledger</DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium">
            A comprehensive tracking of all water volume delivered to your business {isParent ? 'network' : 'premises'}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] px-8 py-6">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="py-4">Transaction Date</TableHead>
                 {isParent && <TableHead>Branch Entity</TableHead>}
                <TableHead className="text-right pr-4">Volume Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDeliveries.length > 0 ? sortedDeliveries.map(delivery => {
                const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                const containers = delivery.volumeContainers || 0;
                return (
                  <TableRow key={delivery.id} className="hover:bg-muted/30 transition-colors group cursor-default">
                    <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="font-bold text-sm text-slate-900">{format(new Date(delivery.date), 'MMMM d, yyyy')}</span>
                        </div>
                    </TableCell>
                     {isParent && (
                        <TableCell>
                            <Badge variant="secondary" className="bg-white border-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">
                                {branchMap[delivery.userId] || 'Primary'}
                            </Badge>
                        </TableCell>
                     )}
                    <TableCell className="text-right pr-4">
                        <div className="flex flex-col items-end">
                            <span className="font-extrabold text-slate-900 text-sm">{liters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{containers} Containers</span>
                        </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={isParent ? 3 : 2} className="text-center py-20 opacity-30 flex flex-col items-center gap-2 justify-center h-full">
                      <History className="h-10 w-10 mx-auto" />
                      <p className="text-sm font-bold uppercase tracking-widest">No logistics history found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="p-8 pt-4 bg-muted/5 border-t">
            <DialogClose asChild>
                <Button variant="outline" className="font-bold uppercase tracking-widest text-[10px] rounded-xl px-10 h-10 border-slate-200">Dismiss</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
