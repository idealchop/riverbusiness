

'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Delivery, AppUser, SanitationVisit, ComplianceReport } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { History, Calendar as CalendarIcon, Download, PackageCheck, Truck, Package, Eye } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateMonthlySOA } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';

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
    if (!date) return new Date(0); // Return a very old date for null/undefined values
    // Handles Firestore Timestamps
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }
    // Handles ISO strings or other date string formats
    return new Date(date);
  };

  const filteredDeliveries = useMemo(() => {
    const sorted = (deliveries || []).slice().sort((a, b) => {
        const dateA = getSortableDate(a.date);
        const dateB = getSortableDate(b.date);
        return dateB.getTime() - dateA.getTime();
    });
    
    return sorted.filter(delivery => {
      if (!deliveryDateRange?.from) return true;
      const fromDate = deliveryDateRange.from;
      const toDate = deliveryDateRange.to || fromDate;
      const deliveryDate = getSortableDate(delivery.date);
      return deliveryDate >= fromDate && deliveryDate <= toDate;
    });
  }, [deliveries, deliveryDateRange]);

  const totalPages = Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE);

  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredDeliveries.slice(startIndex, endIndex);
  }, [filteredDeliveries, currentPage]);

  const handleDownloadHistory = () => {
    if (!user || !filteredDeliveries) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User data or deliveries not available to generate history.',
      });
      return;
    }

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
      billingPeriod: period
    });

    toast({
      title: 'Download Started',
      description: 'Your delivery history is being generated.',
    });
  };
  
  const getStatusInfo = (status: Delivery['status'] | undefined) => {
    if (!status) return { variant: 'outline', icon: null, label: 'No Deliveries' };
    switch (status) {
        case 'Delivered': return { variant: 'default', icon: PackageCheck, label: 'Delivered' };
        case 'In Transit': return { variant: 'secondary', icon: Truck, label: 'In Transit' };
        case 'Pending': return { variant: 'outline', icon: Package, label: 'Pending' };
        default: return { variant: 'outline', icon: null, label: 'No Deliveries' };
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-lg h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> 
            {isParent ? 'Branch Delivery History' : `Delivery History for ${user?.name}`}
          </DialogTitle>
          <DialogDescription>
            {isParent 
              ? "This is a consolidated log of all deliveries made to your linked branch accounts."
              : "A log of all past deliveries for this user."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 px-6 pt-4 flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !deliveryDateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deliveryDateRange?.from ? (deliveryDateRange.to ? (<> {format(deliveryDateRange.from, "LLL dd, y")} - {format(deliveryDateRange.to!, "LLL dd, y")} </>) : (format(deliveryDateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" defaultMonth={deliveryDateRange?.from} selected={deliveryDateRange} onSelect={setDeliveryDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          <Button onClick={handleDownloadHistory} disabled={filteredDeliveries.length === 0} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Download History
          </Button>
        </div>

        <div className="flex-1 min-h-0 px-6 py-4">
            <ScrollArea className="h-full">
            {/* Desktop Table View */}
            <Table className="hidden md:table">
                <TableHeader>
                <TableRow>
                    <TableHead>Ref ID</TableHead>
                    {isParent && <TableHead>Branch Name</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Liters / Containers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Attachment</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => {
                    const statusInfo = getStatusInfo(delivery.status);
                    const liters = containerToLiter(delivery.volumeContainers || 0);
                    const containers = delivery.volumeContainers || 0;
                    return (
                    <TableRow key={delivery.id}>
                        <TableCell>{delivery.id}</TableCell>
                        {isParent && <TableCell>{branchMap[delivery.userId] || delivery.userId}</TableCell>}
                        <TableCell>{format(getSortableDate(delivery.date), 'PP')}</TableCell>
                        <TableCell>{liters.toLocaleString(undefined, { maximumFractionDigits: 0 })}L / {containers} containers</TableCell>
                        <TableCell>
                        <Badge variant={statusInfo.variant} className={cn('text-xs', statusInfo.variant === 'default' && 'bg-green-100 text-green-800', statusInfo.variant === 'secondary' && 'bg-blue-100 text-blue-800', statusInfo.variant === 'outline' && 'bg-yellow-100 text-yellow-800')}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        {delivery.proofOfDeliveryUrl ? (
                            <Button variant="link" size="sm" onClick={() => onViewProof(delivery.proofOfDeliveryUrl || null)}>View</Button>
                        ) : (
                            <Badge variant="secondary">Upcoming</Badge>
                        )}
                        </TableCell>
                    </TableRow>
                    );
                }) : (
                    <TableRow>
                    <TableCell colSpan={isParent ? 6 : 5} className="text-center h-24">No delivery history found.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
                {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => {
                const statusInfo = getStatusInfo(delivery.status);
                const liters = containerToLiter(delivery.volumeContainers || 0);
                const containers = delivery.volumeContainers || 0;
                return (
                    <Card key={delivery.id}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{format(getSortableDate(delivery.date), 'PP')}</p>
                            <p className="text-xs text-muted-foreground">ID: {delivery.id}</p>
                            {isParent && <p className="text-xs text-muted-foreground">Branch: {branchMap[delivery.userId] || delivery.userId}</p>}
                        </div>
                        <Badge variant={statusInfo.variant} className={cn('text-xs', statusInfo.variant === 'default' && 'bg-green-100 text-green-800', statusInfo.variant === 'secondary' && 'bg-blue-100 text-blue-800', statusInfo.variant === 'outline' && 'bg-yellow-100 text-yellow-800')}>{statusInfo.label}</Badge>
                        </div>
                        <div className="text-sm">
                        <p>
                            <strong>Volume:</strong> {liters.toLocaleString(undefined, { maximumFractionDigits: 0 })}L ({containers} containers)
                        </p>
                        </div>
                        {delivery.proofOfDeliveryUrl && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => onViewProof(delivery.proofOfDeliveryUrl || null)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Attachment
                        </Button>
                        )}
                    </CardContent>
                    </Card>
                );
                }) : (
                    <div className="text-center text-muted-foreground py-10">No delivery history found.</div>
                )}
            </div>
            </ScrollArea>
        </div>

        <DialogFooter className="border-t p-6 pt-4 flex flex-col-reverse md:flex-row md:justify-between items-center w-full flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full md:w-auto">Close</Button>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Page {currentPage} of {totalPages > 0 ? totalPages : 1}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
