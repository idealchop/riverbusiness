'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WaterStation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, MapPin, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StationManagementTabProps {
    waterStations: WaterStation[] | null;
    isAdmin: boolean;
    onStationClick: (station: WaterStation | null) => void;
}

export function StationManagementTab({ waterStations, isAdmin, onStationClick }: StationManagementTabProps) {
    return (
        <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
                <div>
                    <CardTitle className="text-xl">Water Station Network</CardTitle>
                    <CardDescription>Manage your fulfillment centers and monitor their compliance documents.</CardDescription>
                </div>
                <Button onClick={() => onStationClick(null)} disabled={!isAdmin} className="w-full sm:w-auto shadow-md">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Station
                </Button>
            </CardHeader>
            <CardContent>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="pl-6 py-4">Station ID</TableHead>
                                <TableHead>Station Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Health Status</TableHead>
                                <TableHead className="text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(waterStations || []).map((station) => (
                                <TableRow key={station.id} onClick={() => onStationClick(station)} className="group cursor-pointer hover:bg-muted/30 transition-colors">
                                    <TableCell className="pl-6 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{station.id.substring(0, 8)}</TableCell>
                                    <TableCell className="font-semibold text-sm">{station.name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            {station.location}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={station.status === 'Operational' ? 'default' : 'destructive'} 
                                            className={cn(
                                                "text-[10px] uppercase tracking-widest font-bold border-none px-2",
                                                station.status === 'Operational' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                            )}
                                        >
                                            <Activity className="mr-1 h-3 w-3" />
                                            {station.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge variant="outline" className="text-[10px] gap-1 border-muted-foreground/20">
                                                <ShieldCheck className="h-3 w-3 text-primary" /> Compliance
                                            </Badge>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(waterStations?.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-60 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Building className="h-10 w-10 opacity-20" />
                                            <p>Your fulfillment network is empty. Create your first station to start deliveries.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                    {(waterStations && waterStations.length > 0) ? waterStations.map((station) => (
                        <Card key={station.id} onClick={() => onStationClick(station)} className="shadow-sm active:scale-[0.98] transition-transform">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-base">{station.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">ID: {station.id.substring(0, 8)}</p>
                                    </div>
                                    <Badge 
                                        variant={station.status === 'Operational' ? 'default' : 'destructive'} 
                                        className={cn(
                                            "text-[10px] uppercase font-bold",
                                            station.status === 'Operational' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                        )}
                                    >
                                        {station.status}
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground border-t pt-3 flex items-start gap-2">
                                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                                    <span>{station.location}</span>
                                </div>
                                <Button variant="outline" size="sm" className="w-full h-8 text-[10px] uppercase font-bold tracking-widest mt-2 border-muted-foreground/20">
                                    View Station Profile
                                </Button>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="text-center text-muted-foreground py-20 bg-muted/20 rounded-lg border-2 border-dashed">
                            <Building className="mx-auto h-12 w-12 opacity-10" />
                            <p className="mt-2 text-sm">No water stations found in network.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
