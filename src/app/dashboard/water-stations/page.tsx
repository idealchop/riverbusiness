'use client'
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { waterStations } from '@/lib/data';
import { FileText, MapPin } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';

export default function WaterStationsPage() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Water Stations</DialogTitle>
        <DialogDescription>
          View the water stations that supply to you and their compliance status.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Compliance Permit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waterStations.map((station) => (
              <TableRow key={station.id}>
                <TableCell className="font-medium">{station.name}</TableCell>
                <TableCell className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {station.location}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <a href={station.permitUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Permit
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
