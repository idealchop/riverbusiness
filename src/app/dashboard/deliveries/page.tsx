
'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Paperclip, Search, Truck, StickyNote, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Delivery } from '@/lib/types';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

const containerToLiter = (containers: number) => containers * 19.5;

export default function DeliveriesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const deliveriesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users', user.id, 'deliveries') : null, [firestore, user]);
  const { data: userDeliveries, isLoading } = useCollection<Delivery>(deliveriesQuery);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);

  useEffect(() => {
    if (userDeliveries) {
      const sortedDeliveries = [...userDeliveries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDeliveries(sortedDeliveries);
    }
  }, [userDeliveries]);

  const getStatusBadgeVariant = (status: 'Delivered' | 'In Transit' | 'Pending'): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'Delivered': return 'default';
      case 'In Transit': return 'secondary';
      case 'Pending': return 'outline';
      default: return 'outline';
    }
  };

  const handleSearch = () => {
    if(!userDeliveries) return;
    const filteredDeliveries = userDeliveries.filter(delivery => {
      const searchLower = searchTerm.toLowerCase();
      return (
        delivery.id.toLowerCase().includes(searchLower) ||
        new Date(delivery.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase().includes(searchLower) ||
        delivery.status.toLowerCase().includes(searchLower)
      );
    });
    setDeliveries(filteredDeliveries);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term === '' && userDeliveries) {
       const sortedDeliveries = [...userDeliveries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDeliveries(sortedDeliveries);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if(isLoading) return <div>Loading deliveries...</div>

  return (
    <div className="py-4 space-y-4">
      <Dialog open={!!selectedProofUrl} onOpenChange={(open) => !open && setSelectedProofUrl(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Proof of Delivery</DialogTitle>
            </DialogHeader>
            {selectedProofUrl && (
                <div className="py-4 flex justify-center">
                    <Image src={selectedProofUrl} alt="Proof of delivery" width={400} height={600} className="rounded-md object-contain" />
                </div>
            )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedNotes} onOpenChange={(open) => !open && setSelectedNotes(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Admin Notes</DialogTitle>
                <DialogDescription>Notes from the administrator regarding this delivery.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm bg-muted p-4 rounded-md">{selectedNotes}</p>
            </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <Input 
          placeholder="Search by Tracking No, date, or status..."
          value={searchTerm}
          onChange={handleSearchInputChange}
          onKeyDown={handleSearchKeyDown}
          className="flex-1"
        />
        <Button onClick={handleSearch} className="font-bold">
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tracking No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => {
            const volumeLiters = containerToLiter(delivery.volumeContainers);
            return (
              <TableRow key={delivery.id}>
                <TableCell className="font-medium">{delivery.id}</TableCell>
                <TableCell>{format(new Date(delivery.date), 'PP')}</TableCell>
                <TableCell>{volumeLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })}L / {delivery.volumeContainers} containers</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(delivery.status)}
                    className={
                      delivery.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                      : delivery.status === 'In Transit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                    }
                  >
                    {delivery.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       {delivery.proofOfDeliveryUrl && (
                        <DropdownMenuItem onClick={() => setSelectedProofUrl(delivery.proofOfDeliveryUrl!)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Proof
                        </DropdownMenuItem>
                      )}
                      {delivery.adminNotes && (
                        <DropdownMenuItem onClick={() => setSelectedNotes(delivery.adminNotes!)}>
                          <StickyNote className="mr-2 h-4 w-4" />
                          View Notes
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Truck className="mr-2 h-4 w-4" />
                        Track Delivery
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

    