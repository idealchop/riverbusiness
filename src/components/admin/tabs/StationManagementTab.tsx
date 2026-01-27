'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WaterStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StationManagementTabProps {
    waterStations: WaterStation[] | null;
    isAdmin: boolean;
    onStationClick: (station: WaterStation | null) => void;
}

export function StationManagementTab({ waterStations, isAdmin, onStationClick }: StationManagementTabProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Water Station Network</CardTitle>
                <CardDescription>Manage all water refilling stations in the network.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={() => onStationClick(null)} disabled={!isAdmin}>
                        <PlusCircle className="mr-2 h-4 w-4" />Create Station
                    </Button>
                </div>
                
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Station ID</TableHead>
                                <TableHead>Station Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(waterStations || []).map((station) => (
                                <TableRow key={station.id} onClick={() => onStationClick(station)} className="cursor-pointer">
                                    <TableCell className="font-mono text-xs">{station.id}</TableCell>
                                    <TableCell className="font-medium">{station.name}</TableCell>
                                    <TableCell>{station.location}</TableCell>
                                    <TableCell>
                                        <Badge variant={station.status === 'Operational' ? 'default' : 'destructive'} className={cn(station.status === 'Operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                                            {station.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(waterStations?.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No water stations found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                    {(waterStations && waterStations.length > 0) ? waterStations.map((station) => (
                        <Card key={station.id} onClick={() => onStationClick(station)} className="cursor-pointer">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{station.name}</p>
                                        <p className="text-xs text-muted-foreground">ID: {station.id}</p>
                                    </div>
                                    <Badge variant={station.status === 'Operational' ? 'default' : 'destructive'} className={cn(station.status === 'Operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                                        {station.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{station.location}</p>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="text-center text-muted-foreground py-10">
                            <Building className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2">No water stations found.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
