
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
import { Card, CardContent } from '@/components/ui/card';
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
      <DialogContent className="sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2rem] bg-white overflow-hidden">
        <DialogHeader className="p-8 pb-6 bg-slate-50/50 border-b shrink-0">
          <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase leading-none">Logistics History</DialogTitle>
                  <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                     Verified organizational water volume record
                  </DialogDescription>
              </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
              {/* Desktop Table View */}
              <Table className="hidden md:table">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 pl-6">Transaction Date</TableHead>
                     {isParent && <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Branch Entity</TableHead>}
                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Volume Record</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDeliveries.length > 0 ? sortedDeliveries.map(delivery => {
                    const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                    const containers = delivery.volumeContainers || 0;
                    return (
                      <TableRow key={delivery.id} className="hover:bg-slate-50/50 transition-colors group cursor-default border-b border-slate-50 last:border-0">
                        <TableCell className="py-5 pl-6">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                                <span className="font-bold text-sm text-slate-900 leading-none pt-0.5">{format(new Date(delivery.date), 'MMMM d, yyyy')}</span>
                            </div>
                        </TableCell>
                         {isParent && (
                            <TableCell>
                                <Badge variant="secondary" className="bg-white border-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-widest px-3 h-6 shadow-sm">
                                    {branchMap[delivery.userId] || 'Primary Hub'}
                                </Badge>
                            </TableCell>
                         )}
                        <TableCell className="text-right pr-6">
                            <div className="flex flex-col items-end">
                                <span className="font-black text-slate-900 text-sm tabular-nums">{liters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{containers} Containers</span>
                            </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={isParent ? 3 : 2} className="text-center py-32 opacity-20 flex flex-col items-center gap-4 justify-center">
                          <History className="h-12 w-12" />
                          <p className="text-xs font-black uppercase tracking-[0.4em]">Empty Ledger</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Mobile Card View */}
              <div className="space-y-5 md:hidden">
                {sortedDeliveries.length > 0 ? sortedDeliveries.map(delivery => {
                    const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                    const containers = delivery.volumeContainers || 0;
                    return (
                      <Card key={delivery.id} className="shadow-none border-slate-100 rounded-[1.5rem] bg-slate-50/50 overflow-hidden active:scale-[0.98] transition-all">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-white border border-slate-100 text-primary shadow-sm">
                                        <Calendar className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-black text-sm text-slate-900">{format(new Date(delivery.date), 'MMM d, yyyy')}</span>
                                </div>
                                {isParent && (
                                    <Badge variant="outline" className="bg-white border-slate-100 text-primary font-black uppercase text-[8px] tracking-widest px-2 h-5 shadow-none ml-0.5">
                                        {branchMap[delivery.userId] || 'Primary'}
                                    </Badge>
                                )}
                            </div>
                            <div className="text-right space-y-0.5">
                                <p className="font-black text-slate-900 text-base tabular-nums leading-none">{liters.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{containers} Units</p>
                            </div>
                        </CardContent>
                      </Card>
                    );
                }) : (
                    <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                        <History className="h-10 w-10" />
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Empty Ledger</p>
                    </div>
                )}
              </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 pt-6 bg-slate-50/50 border-t shrink-0">
            <DialogClose asChild>
                <Button variant="ghost" className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px] rounded-xl px-12 h-11 text-slate-400 hover:text-slate-900 transition-colors">
                    Dismiss
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
