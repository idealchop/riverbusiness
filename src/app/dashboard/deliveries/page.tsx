import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deliveries } from '@/lib/data';
import { MoreHorizontal, Paperclip, Truck } from 'lucide-react';

export default function DeliveriesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Tracking</CardTitle>
        <CardDescription>Monitor all water deliveries to ensure timely supply.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Volume (Gallons)</TableHead>
              <TableHead>Volume (Liters)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell className="font-medium">{delivery.id}</TableCell>
                <TableCell>{new Date(delivery.date).toLocaleDateString()}</TableCell>
                <TableCell>{delivery.volumeGallons.toLocaleString()}</TableCell>
                <TableCell>{(delivery.volumeGallons * 3.78541).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Badge variant={delivery.status === 'Delivered' ? 'default' : delivery.status === 'In Transit' ? 'secondary' : 'outline'}
                    className={
                      delivery.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : delivery.status === 'In Transit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
