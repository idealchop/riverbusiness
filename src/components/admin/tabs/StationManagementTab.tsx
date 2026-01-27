'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WaterStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

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
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Station ID</TableHead>
                                <TableHead>Station Name</TableHead>
                                <TableHead>Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(waterStations || []).map((station) => (
                                <TableRow key={station.id} onClick={() => onStationClick(station)} className="cursor-pointer">
                                    <TableCell className="font-mono text-xs">{station.id}</TableCell>
                                    <TableCell className="font-medium">{station.name}</TableCell>
                                    <TableCell>{station.location}</TableCell>
                                </TableRow>
                            ))}
                            {(waterStations?.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No water stations found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
