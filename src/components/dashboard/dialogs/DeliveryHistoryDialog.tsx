
'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Delivery, AppUser, SanitationVisit, ComplianceReport } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { History, Calendar as CalendarIcon, Download, PackageCheck, Truck, Package, Eye, ChevronRight, Filter, Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateMonthlySOA } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface DeliveryHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deliveries: Delivery[] | null;
  sanitationVisits: SanitationVisit[] | null;
  complianceReports: ComplianceReport[] | null;
  user: AppUser | null;
  onViewProof: (url: string | null) => void;
  isParent?: boolean;
  branches?: AppUser[] | null;
}

export function DeliveryHistoryDialog({ isOpen, onOpenChange, deliveries, sanitationVisits, complianceReports, user, onViewProof, isParent = false, branches = [] }: DeliveryHistoryDialogProps) {
  const [deliveryDateRange, setDeliveryDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 6;
  
  const branchMap = useMemo(() => {
    if (!branches) return {};
    return branches.reduce((map, branch) => {
      map[branch.id] = branch.businessName;
      return map;
    }, {} as Record<string, string>);
  }, [branches]);

  const getSortableDate = (date: any): Date => {
    if (!date) return new Date(0);
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }
    return new Date(date);
  };

  const filteredDeliveries = useMemo(() => {
    let list = (deliveries || []).slice().sort((a, b) => {
        const dateA = getSortableDate(a.date);
        const dateB = getSortableDate(b.date);
        return dateB.getTime() - dateA.getTime();
    });
    
    if (searchTerm) {
        list = list.filter(d => 
            d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (isParent && branchMap[d.userId]?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    if (deliveryDateRange?.from) {
        const fromDate = deliveryDateRange.from;
        const toDate = deliveryDateRange.to || fromDate;
        list = list.filter(delivery => {
            const deliveryDate = getSortableDate(delivery.date);
            return deliveryDate >= fromDate && deliveryDate <= toDate;
        });
    }

    return list;
  }, [deliveries, deliveryDateRange, searchTerm, isParent, branchMap]);

  const totalPages = Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE);

  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredDeliveries.slice(startIndex, endIndex);
  }, [filteredDeliveries, currentPage]);

  const handleDownloadHistory = () => {
    if (!user || !filteredDeliveries) return;

    let period = 'All Time';
    if (deliveryDateRange?.from) {
        period = format(deliveryDateRange.from, 'PP');
        if (deliveryDateRange.to) {
            period += ` to ${format(deliveryDateRange.to!, 'PP')}`;
        }
    }
    
    generateMonthlySOA({
      user,
      deliveries: filteredDeliveries,
      sanitationVisits: sanitationVisits || [],
      complianceReports: complianceReports || [],
      billingPeriod: period,
      branches: branches
    });

    toast({ title: 'Report Generated', description: 'Your high-fidelity delivery log is downloading.' });
  };
  
  const getStatusInfo = (status: Delivery['status'] | undefined) => {
    if (!status) return { color: 'bg-slate-50 text-slate-400 border-slate-200', icon: Package, label: 'N/A' };
    switch (status) {
        case 'Delivered': return { color: 'bg-green-50 text-green-700 border-green-200', icon: PackageCheck, label: 'Delivered' };
        case 'In Transit': return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Truck, label: 'In Transit' };
        default: return { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Package, label: 'Pending' };
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2rem] bg-white overflow-hidden">
        <DialogHeader className="p-8 pb-6 bg-slate-50/50 border-b shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-4">
              <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-blue-50 text-primary shadow-inner">
                    <History className="h-6 w-6" />
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                      <DialogTitle className="text-2xl font-black tracking-tight uppercase leading-none">Refill History</DialogTitle>
                      <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                         {isParent ? 'Consolidated branch logistics' : 'Personal fulfillment ledger'}
                      </DialogDescription>
                  </div>
              </div>
              <Button onClick={handleDownloadHistory} disabled={filteredDeliveries.length === 0} size="sm" className="w-full sm:w-auto h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                <Download className="mr-2 h-4 w-4" />
                Export Logic Statement
              </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 px-8 pt-8 pb-4 bg-white shrink-0">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Find tracking # or branch..." 
                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-100 focus-visible:ring-primary shadow-inner font-bold text-xs" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[280px] h-11 justify-start text-left font-bold rounded-xl border-slate-200 bg-white shadow-sm", !deliveryDateRange && "text-slate-400")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {deliveryDateRange?.from ? (deliveryDateRange.to ? (<> {format(deliveryDateRange.from, "MMM d")} - {format(deliveryDateRange.to!, "MMM d, y")} </>) : (format(deliveryDateRange.from, "MMM d, y"))) : (<span className="text-[10px] uppercase font-black tracking-widest">Select period window</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-3xl rounded-[1.5rem]" align="end">
              <Calendar initialFocus mode="range" defaultMonth={deliveryDateRange?.from} selected={deliveryDateRange} onSelect={setDeliveryDateRange} numberOfMonths={2} className="rounded-[1.5rem]" />
            </PopoverContent>
          </Popover>
          {(deliveryDateRange || searchTerm) && (
              <Button variant="ghost" size="sm" onClick={() => { setDeliveryDateRange(undefined); setSearchTerm(''); }} className="h-11 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">Reset</Button>
          )}
        </div>

        <div className="flex-1 min-h-0 px-8 py-4 overflow-hidden">
            <ScrollArea className="h-full">
            {/* Desktop Table View */}
            <Table className="hidden md:table">
                <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none">
                    <TableHead className="pl-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Ref ID</TableHead>
                    {isParent && <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Branch</TableHead>}
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Dispatch</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Volume</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Management</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => {
                    const status = getStatusInfo(delivery.status);
                    const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                    const containers = delivery.volumeContainers || 0;
                    return (
                    <TableRow key={delivery.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                        <TableCell className="pl-6 py-5 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">{delivery.id}</TableCell>
                        {isParent && <TableCell className="font-bold text-sm text-slate-900">{branchMap[delivery.userId] || 'Primary Hub'}</TableCell>}
                        <TableCell className="text-sm font-semibold text-slate-600">{format(getSortableDate(delivery.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="font-black text-sm text-slate-900">{liters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">({containers} Containers)</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-wider border-none px-3 h-6 shadow-none', status.color)}>
                                <status.icon className="h-3 w-3 mr-1.5" />
                                {status.label}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                {delivery.proofOfDeliveryUrl ? (
                                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-white border-slate-200 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm" onClick={() => onViewProof(delivery.proofOfDeliveryUrl || null)}>
                                        <Eye className="h-3.5 w-3.5" /> Proof
                                    </Button>
                                ) : (
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic pr-3">Pending POD</span>
                                )}
                                <ChevronRight className="h-4 w-4 text-slate-200" />
                            </div>
                        </TableCell>
                    </TableRow>
                    );
                }) : (
                    <TableRow>
                    <TableCell colSpan={isParent ? 6 : 5} className="text-center py-32 opacity-20 flex flex-col items-center gap-4 justify-center">
                        <History className="h-12 w-12" />
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Empty Ledger</p>
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>

            {/* Mobile Card View */}
            <div className="space-y-6 md:hidden">
                {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => {
                const status = getStatusInfo(delivery.status);
                const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                return (
                    <Card key={delivery.id} className="shadow-none border-slate-100 rounded-[1.5rem] bg-slate-50/50 group overflow-hidden active:scale-[0.98] transition-all">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-widest">#{delivery.id}</p>
                                <p className="font-black text-base text-slate-900">{format(getSortableDate(delivery.date), 'MMMM d, yyyy')}</p>
                                {isParent && <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1.5">{branchMap[delivery.userId] || 'Branch'}</p>}
                            </div>
                            <Badge variant="outline" className={cn('text-[9px] uppercase font-black tracking-widest border-none px-3 h-6 shadow-sm', status.color)}>
                                {status.label}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-inner border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logistics Load</span>
                          <p className="font-black text-sm text-slate-900">{liters.toLocaleString()} L <span className="text-[10px] text-slate-400 font-bold ml-1">({delivery.volumeContainers}U)</span></p>
                        </div>
                        {delivery.proofOfDeliveryUrl && (
                        <Button variant="outline" size="sm" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm bg-white border-slate-100 text-primary gap-2" onClick={() => onViewProof(delivery.proofOfDeliveryUrl || null)}>
                            <Eye className="h-4 w-4" />
                            Verify Dispatch Proof
                        </Button>
                        )}
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
            </ScrollArea>
        </div>

        <DialogFooter className="border-t p-8 pt-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ledger Index: {filteredDeliveries.length} Records</div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2 mr-auto sm:mr-4">
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold uppercase text-[9px] shadow-sm bg-white" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter tabular-nums px-2">{currentPage} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold uppercase text-[9px] shadow-sm bg-white" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</Button>
                </div>
                <DialogClose asChild>
                    <Button variant="ghost" className="h-10 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 transition-colors">Dismiss</Button>
                </DialogClose>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
