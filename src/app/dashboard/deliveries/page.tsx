
'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Paperclip, Search, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Delivery } from '@/lib/types';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const containerToLiter = (containers: number) => containers * 19.5;

export default function DeliveriesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const deliveriesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users', user.id, 'deliveries') : null, [firestore, user]);
  const { data: userDeliveries, isLoading } = useCollection<Delivery>(deliveriesQuery);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userDeliveries) {
      setDeliveries(userDeliveries);
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
      setDeliveries(userDeliveries);
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
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Search by ID, date, or status..."
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
            <TableHead>Delivery ID</TableHead>
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
                <TableCell>{new Date(delivery.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
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
                      <DropdownMenuItem>
                        <Truck className="mr-2 h-4 w-4" />
                        Track Delivery
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Paperclip className="mr-2 h-4 w-4" />
                        View/Add Attachments
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
