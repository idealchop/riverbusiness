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
      <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-0 border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-8 pb-4 bg-muted/20 border-b">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <DialogTitle className="text-2xl font-bold tracking-tight">Supply Fulfillment Log</DialogTitle>
              </div>
              <Button onClick={handleDownloadHistory} disabled={filteredDeliveries.length === 0} size="sm" className="h-9 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg">
                <Download className="mr-2 h-3.5 w-3.5" />
                Export High-Fidelity SOA
              </Button>
          </div>
          <DialogDescription className="text-sm font-medium">
             {isParent ? 'Consolidated logistics tracking for all business branches.' : 'Tracking replenishment cycles and distribution metrics.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 px-8 pt-6 pb-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Find tracking # or branch..." 
                className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary shadow-none" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[260px] h-10 justify-start text-left font-bold rounded-xl border-slate-200 bg-white", !deliveryDateRange && "text-slate-400")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {deliveryDateRange?.from ? (deliveryDateRange.to ? (<> {format(deliveryDateRange.from, "MMM d")} - {format(deliveryDateRange.to!, "MMM d, y")} </>) : (format(deliveryDateRange.from, "MMM d, y"))) : (<span className="text-[10px] uppercase tracking-widest">Filter by Date Range</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl" align="end">
              <Calendar initialFocus mode="range" defaultMonth={deliveryDateRange?.from} selected={deliveryDateRange} onSelect={setDeliveryDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          {(deliveryDateRange || searchTerm) && (
              <Button variant="ghost" size="sm" onClick={() => { setDeliveryDateRange(undefined); setSearchTerm(''); }} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Clear</Button>
          )}
        </div>

        <div className="flex-1 min-h-0 px-8 py-4">
            <ScrollArea className="h-full">
            {/* Desktop Table View */}
            <Table className="hidden md:table">
                <TableHeader className="bg-muted/10">
                <TableRow>
                    <TableHead className="pl-4 py-4">Ref ID</TableHead>
                    {isParent && <TableHead>Target Branch</TableHead>}
                    <TableHead>Dispatch Date</TableHead>
                    <TableHead>Volume Metrics</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => {
                    const status = getStatusInfo(delivery.status);
                    const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                    const containers = delivery.volumeContainers || 0;
                    return (
                    <TableRow key={delivery.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{delivery.id}</TableCell>
                        {isParent && <TableCell className="font-bold text-sm">{branchMap[delivery.userId] || 'Primary Hub'}</TableCell>}
                        <TableCell className="text-sm font-medium">{format(getSortableDate(delivery.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="font-bold text-sm">{liters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</div>
                          <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">({containers} Containers)</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 gap-1.5 shadow-sm', status.color)}>
                                <status.icon className="h-3 w-3" />
                                {status.label}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-2">
                                {delivery.proofOfDeliveryUrl ? (
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest border-slate-200 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => onViewProof(delivery.proofOfDeliveryUrl || null)}>
                                        <Eye className="mr-1.5 h-3 w-3" /> View Proof
                                    </Button>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic pr-3">Pending POD</span>
                                )}
                                <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                            </div>
                        </TableCell>
                    </TableRow>
                    );
                }) : (
                    <TableRow>
                    <TableCell colSpan={isParent ? 6 : 5} className="text-center py-20 text-muted-foreground opacity-30">
                        <History className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No logistics records found</p>
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
                {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => {
                const status = getStatusInfo(delivery.status);
                const liters = delivery.liters ?? containerToLiter(delivery.volumeContainers || 0);
                return (
                    <Card key={delivery.id} className="shadow-none border bg-muted/10">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">REF: {delivery.id}</p>
                                <p className="font-black text-sm">{format(getSortableDate(delivery.date), 'MMM d, yyyy')}</p>
                                {isParent && <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mt-1">{branchMap[delivery.userId] || 'Branch'}</p>}
                            </div>
                            <Badge variant="outline" className={cn('text-[9px] uppercase font-bold border px-2', status.color)}>
                                {status.label}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-baseline border-y border-slate-100 py-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logistics Load</span>
                          <p className="font-extrabold text-sm">{liters.toLocaleString()} L <span className="text-[10px] text-muted-foreground font-normal">({delivery.volumeContainers} units)</span></p>
                        </div>
                        {delivery.proofOfDeliveryUrl && (
                        <Button variant="outline" size="sm" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-white" onClick={() => onViewProof(delivery.proofOfDeliveryUrl || null)}>
                            <Eye className="mr-2 h-3.5 w-3.5 text-primary" />
                            Verify Dispatch Proof
                        </Button>
                        )}
                    </CardContent>
                    </Card>
                );
                }) : (
                    <div className="text-center py-20 opacity-30 flex flex-col items-center gap-2">
                         <History className="h-8 w-8" />
                         <p className="text-xs font-bold uppercase tracking-widest">Empty Ledger</p>
                    </div>
                )}
            </div>
            </ScrollArea>
        </div>

        <DialogFooter className="border-t p-8 pt-4 bg-muted/5 flex flex-col-reverse md:flex-row md:justify-between items-center w-full gap-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ledger {filteredDeliveries.length} entries</div>
            <div className="flex items-center gap-3">
                <div className="flex items-center space-x-1 mr-4">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 px-3">{currentPage} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</Button>
                </div>
                <DialogClose asChild>
                    <Button variant="ghost" className="h-9 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-500 hover:text-slate-900">Dismiss</Button>
                </DialogClose>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
