
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, setDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { MapPin, QrCode, Download, Printer, ShieldCheck, Map as MapIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { HRCompanyLocation } from '@/lib/types';
import { cn } from '@/lib/utils';

const locationSchema = z.object({
  office_name: z.string().min(1, 'Office name is required'),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius_meters: z.coerce.number().min(10, 'Minimum radius is 10m'),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface OfficeLocationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function OfficeLocationDialog({ isOpen, onOpenChange, companyId }: OfficeLocationDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<HRCompanyLocation | null>(null);
  const [showQR, setShowQR] = useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      office_name: 'Main Office',
      radius_meters: 50,
    }
  });

  useEffect(() => {
    if (isOpen && firestore && companyId) {
        const fetchLocation = async () => {
            const q = query(collection(firestore, 'hr_companies', companyId, 'locations'));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const locData = { id: snap.docs[0].id, ...snap.docs[0].data() } as HRCompanyLocation;
                setLocation(locData);
                form.reset({
                    office_name: locData.office_name,
                    latitude: locData.latitude,
                    longitude: locData.longitude,
                    radius_meters: locData.radius_meters
                });
            }
        };
        fetchLocation();
    }
  }, [isOpen, firestore, companyId, form]);

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'GPS unavailable' });
        return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
        form.setValue('latitude', pos.coords.latitude);
        form.setValue('longitude', pos.coords.longitude);
        toast({ title: 'Coordinates captured' });
    }, (err) => {
        toast({ variant: 'destructive', title: 'Location Access Denied' });
    });
  };

  const onSubmit = async (values: LocationFormValues) => {
    if (!firestore || !companyId) return;
    setIsSubmitting(true);
    
    try {
      const locationsCol = collection(firestore, 'hr_companies', companyId, 'locations');
      let locRef = location ? doc(locationsCol, location.id) : doc(locationsCol);
      
      const newLoc = {
          id: locRef.id,
          companyId,
          ...values
      };

      await setDoc(locRef, newLoc);
      setLocation(newLoc as HRCompanyLocation);
      toast({ title: 'Location synchronized', description: 'GPS validation is now active for this radius.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const qrValue = `RIVER_OFFICE_QR:${companyId}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <div className="flex flex-col md:flex-row h-full">
            {/* Control Panel */}
            <div className="flex-1 p-8">
                <DialogHeader className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-primary">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Office Geo-Fence</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500 font-medium">Set the physical anchor for attendance validation.</DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField control={form.control} name="office_name" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">Office Name</FormLabel><FormControl><Input placeholder="HQ" className="rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="latitude" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">Lat</FormLabel><FormControl><Input type="number" step="any" className="rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="longitude" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">Long</FormLabel><FormControl><Input type="number" step="any" className="rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>

                        <Button type="button" variant="outline" onClick={captureCurrentLocation} className="w-full rounded-xl border-dashed gap-2 h-11 text-xs font-bold uppercase tracking-widest text-slate-500">
                            <MapIcon className="h-4 w-4" /> Use Current GPS
                        </Button>

                        <FormField control={form.control} name="radius_meters" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">Allowed Radius (m)</FormLabel><FormControl><Input type="number" className="rounded-xl bg-slate-50 border-slate-100" {...field} /></FormControl><FormDescription className="text-[10px]">Distance allowed for valid check-in.</FormDescription><FormMessage /></FormItem>
                        )} />

                        <div className="pt-4 flex flex-col gap-3">
                            <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/10">Authorize Location</Button>
                            <Button type="button" variant="ghost" onClick={() => setShowQR(true)} className="w-full rounded-xl h-12 font-bold gap-2 text-primary">
                                <QrCode className="h-4 w-4" /> Manage Office QR
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {/* QR Presenter */}
            {showQR && (
                <div className="w-full md:w-[40%] bg-slate-900 text-white p-10 flex flex-col items-center justify-center animate-in slide-in-from-right duration-500">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8">
                        <QRCodeSVG value={qrValue} size={160} level="H" />
                    </div>
                    <div className="text-center space-y-4">
                        <h4 className="text-lg font-black tracking-tight">Office Entry QR</h4>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-relaxed">Print and place at the physical entrance for team verification.</p>
                        <div className="flex flex-col gap-2 pt-4">
                            <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 h-10 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => window.print()}>
                                <Printer className="h-3.5 w-3.5" /> Print Tag
                            </Button>
                            <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-white/50" onClick={() => setShowQR(false)}>Close Asset</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
