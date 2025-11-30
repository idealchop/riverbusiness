'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { waterStations as initialWaterStations } from '@/lib/data';
import { FileText, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import type { WaterStation } from '@/lib/types';


export default function WaterStationsPage() {
    const [waterStations, setWaterStations] = useState<WaterStation[]>(initialWaterStations);

    useEffect(() => {
        const storedWaterStations = localStorage.getItem('waterStations');
        if (storedWaterStations) {
            setWaterStations(JSON.parse(storedWaterStations));
        }
    }, []);


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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        View Permit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Compliance Permit: {station.name}</DialogTitle>
                            <DialogDescription>
                                Permit ID: {station.id}-PERMIT
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 text-center min-h-[400px]">
                          {station.permitUrl && station.permitUrl !== '#' ? (
                            <iframe src={station.permitUrl} className="w-full h-96 mt-4 border rounded-md" title={`Permit for ${station.name}`} />
                          ) : (
                            <div className="w-full h-96 mt-4 border rounded-md bg-background flex items-center justify-center">
                              {/* This area is intentionally blank unless a permit is attached */}
                            </div>
                          )}
                        </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
