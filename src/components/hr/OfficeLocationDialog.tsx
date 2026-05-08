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
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { MapPin, QrCode, Download, Printer, ShieldCheck, Map as MapIcon, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { HRCompanyLocation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
      office_name: 'Main Branch',
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
        toast({ variant: 'destructive', title: 'GPS Unavailable' });
        return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
        form.setValue('latitude', pos.coords.latitude);
        form.setValue('longitude', pos.coords.longitude);
        toast({ title: 'Anchor Coordinates Captured' });
    }, (err) => {
        toast({ variant: 'destructive', title: 'Location Access Denied', description: 'Please enable high-accuracy GPS in your browser settings.' });
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
      toast({ title: 'Geo-Fence Synchronized', description: 'Precision attendance validation is now active.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Setup Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const qrValue = `RIVER_OFFICE_QR:${companyId}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <div className="flex flex-col md:flex-row h-full">
            {/* Control Panel */}
            <div className="flex-1 p-10">
                <DialogHeader className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-2xl bg-primary/10">
                            <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Office Protocol</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Define the physical boundaries for team attendance verification.
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField control={form.control} name="office_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location Label</FormLabel>
                                <FormControl><Input placeholder="Headquarters" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="latitude" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lat</FormLabel><FormControl><Input type="number" step="any" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="longitude" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Long</FormLabel><FormControl><Input type="number" step="any" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>

                        <Button type="button" variant="outline" onClick={captureCurrentLocation} className="w-full rounded-xl border-dashed gap-3 h-12 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all">
                            <MapIcon className="h-4 w-4" /> Capture Current GPS Anchor
                        </Button>

                        <FormField control={form.control} name="radius_meters" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowed Radius (Meters)</FormLabel>
                                <FormControl><Input type="number" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold" {...field} /></FormControl>
                                <FormDescription className="text-[10px] font-medium text-slate-400">Distance from anchor point where clock-in is authorized.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="pt-6 flex flex-col gap-3">
                            <Button type="submit" disabled={isSubmitting} className="w-full rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20">
                                {isSubmitting ? 'Syncing...' : 'Authorize Geo-Fence'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setShowQR(true)} className="w-full rounded-xl h-12 font-black uppercase tracking-widest text-[10px] gap-2 text-primary hover:bg-primary/5">
                                <QrCode className="h-4 w-4" /> Access Office Entry Tag
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {/* Asset Hub / QR Presenter */}
            {showQR && (
                <div className="w-full md:w-[45%] bg-slate-900 text-white p-12 flex flex-col items-center justify-center animate-in slide-in-from-right duration-700 relative">
                    <div className="absolute top-10 right-10 flex gap-2">
                        <Badge className="bg-primary text-white border-none font-black text-[9px] uppercase tracking-widest px-3 h-6">Verified Handshake</Badge>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] mb-10 group relative transition-transform duration-500 hover:scale-105">
                        <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={false} />
                        <div className="absolute inset-0 border-8 border-slate-50/50 rounded-[3rem] pointer-events-none" />
                    </div>

                    <div className="text-center space-y-6 max-w-[280px]">
                        <h4 className="text-2xl font-black tracking-tight uppercase">Entry Asset</h4>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-start gap-3">
                                <Info className="h-4 w-4 text-primary-light shrink-0 mt-0.5" />
                                <p className="text-[10px] text-left font-bold text-white/50 uppercase tracking-widest leading-relaxed">
                                    Display this QR physically at the entrance. It triggers the River GPS-Proof validation flow.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                            <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 h-12 text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl" onClick={() => window.print()}>
                                <Printer className="h-4 w-4" /> Print Physical Tag
                            </Button>
                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white" onClick={() => setShowQR(false)}>Close Asset View</Button>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-8 text-[8px] font-black uppercase tracking-[0.6em] text-white/10">River Philippines</div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
