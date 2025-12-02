
'use client'
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import type { WaterStation, AppUser } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';


export default function WaterStationsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    
    const userDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser, isLoading: isUserLoading } = useDoc<AppUser>(userDocRef);

    const stationDocRef = useMemoFirebase(() => 
        (firestore && appUser?.assignedWaterStationId) 
            ? doc(firestore, 'waterStations', appUser.assignedWaterStationId) 
            : null, 
        [firestore, appUser]
    );
    const { data: waterStation, isLoading: stationLoading } = useDoc<WaterStation>(stationDocRef);
    
    const allPermits = waterStation?.permits ? Object.entries(waterStation.permits).filter(([_, url]) => url) : [];

    if (isUserLoading || stationLoading) {
        return <div>Loading station details...</div>;
    }

    if (!appUser?.assignedWaterStationId) {
        return (
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>No Water Station Assigned</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Please contact your administrator to have a water station assigned to your account to view its details.</p>
                </CardContent>
            </Card>
        )
    }

  return (
    <>
      <DialogHeader>
        <DialogTitle>My Water Station</DialogTitle>
        <DialogDescription>
          Details and compliance status for your assigned water station.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        {waterStation ? (
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Station Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Compliance Permits</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow key={waterStation.id}>
                        <TableCell className="font-medium">{waterStation.name}</TableCell>
                        <TableCell className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {waterStation.location}
                        </TableCell>
                        <TableCell className="text-right">
                        <Dialog>
                            <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <FileText className="mr-2 h-4 w-4" />
                                View Permits ({allPermits.length})
                            </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Compliance Permits: {waterStation.name}</DialogTitle>
                                    <DialogDescription>
                                        Permit ID: {waterStation.id}-PERMITS
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                  {allPermits.length > 0 ? (
                                    allPermits.map(([permitName, permitUrl]) => (
                                      <div key={permitName} className="flex items-center justify-between border p-3 rounded-md">
                                          <span className="text-sm font-medium capitalize">{permitName.replace(/([A-Z])/g, ' $1').replace('Url', '')}</span>
                                          <Button asChild variant="link">
                                            <a href={permitUrl as string} target="_blank" rel="noopener noreferrer">View Document</a>
                                          </Button>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-center text-muted-foreground">No permits have been uploaded for this station.</p>
                                  )}
                                </div>
                            </DialogContent>
                        </Dialog>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        ) : (
             <p className="text-center text-muted-foreground py-8">Your assigned water station could not be found.</p>
        )}
      </div>
    </>
  );
}
