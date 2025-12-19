
'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Delivery } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { History, Calendar as CalendarIcon, Download, PackageCheck, Truck, Package, Eye } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent } from '@/components/ui/card';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

interface DeliveryHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deliveries: Delivery[] | null;
  userName?: string;
  onViewProof: (url: string | null) => void;
}

export function DeliveryHistoryDialog({ isOpen, onOpenChange, deliveries, userName, onViewProof }: DeliveryHistoryDialogProps) {
  const [deliveryDateRange, setDeliveryDateRange] = useState<DateRange | undefined>();

  const filteredDeliveries = useMemo(() => (deliveries || []).filter(delivery => {
    if (!deliveryDateRange?.from) return true;
    const fromDate = deliveryDateRange.from;
    const toDate = deliveryDateRange.to || fromDate;
    const deliveryDate = new Date(delivery.date);
    return deliveryDate >= fromDate && deliveryDate <= toDate;
  }), [deliveries, deliveryDateRange]);

  const handleDownloadDeliveries = () => {
    const headers = ["ID", "Date", "Volume (Liters)", "Containers", "Status", "Proof of Delivery URL"];
    const csvRows = [headers.join(',')];

    filteredDeliveries.forEach(delivery => {
      const liters = containerToLiter(delivery.volumeContainers || 0);
      const containers = delivery.volumeContainers || 0;
      const row = [
        delivery.id,
        format(new Date(delivery.date), 'PP'),
        liters.toFixed(2),
        containers,
        delivery.status,
        delivery.proofOfDeliveryUrl || "N/A"
      ].join(',');
      csvRows.push(row);
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `delivery-history-${userName?.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <DialogContent className="sm:max-w-3xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Delivery History for {userName}</DialogTitle>
          <DialogDescription>A log of all past deliveries for this user.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row items-center gap-2 py-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !deliveryDateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deliveryDateRange?.from ? (deliveryDateRange.to ? (<> {format(deliveryDateRange.from, "LLL dd, y")} - {format(deliveryDateRange.to, "LLL dd, y")} </>) : (format(deliveryDateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" defaultMonth={deliveryDateRange?.from} selected={deliveryDateRange} onSelect={setDeliveryDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          <Button onClick={handleDownloadDeliveries} disabled={filteredDeliveries.length === 0} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {/* Desktop Table View */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Ref ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Liters / Containers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attachment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map(delivery => {
                const statusInfo = getStatusInfo(delivery.status);
                const liters = containerToLiter(delivery.volumeContainers || 0);
                const containers = delivery.volumeContainers || 0;
                return (
                  <TableRow key={delivery.id}>
                    <TableCell>{delivery.id}</TableCell>
                    <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
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
              })}
              {(deliveries || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No delivery history found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Mobile Card View */}
          <div className="space-y-4 md:hidden">
            {filteredDeliveries.map(delivery => {
              const statusInfo = getStatusInfo(delivery.status);
              const liters = containerToLiter(delivery.volumeContainers || 0);
              const containers = delivery.volumeContainers || 0;
              return (
                <Card key={delivery.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{format(new Date(delivery.date), 'PP')}</p>
                        <p className="text-xs text-muted-foreground">ID: {delivery.id}</p>
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
            })}
             {(deliveries || []).length === 0 && (
                <div className="text-center text-muted-foreground py-10">No delivery history found.</div>
              )}
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
