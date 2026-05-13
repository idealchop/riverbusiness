
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, setDoc, getDocs, query } from 'firebase/firestore';
import { 
  MapPin, 
  QrCode, 
  Download, 
  ShieldCheck, 
  Map as MapIcon, 
  HelpCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Calculator, 
  Database,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Building,
  Zap,
  Lock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { HRCompanyLocation } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const locationSchema = z.object({
  office_name: z.string().min(1, 'Office name is required'),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius_meters: z.coerce.number().min(10, 'Minimum radius is 10m'),
  gps_verification_enabled: z.boolean().default(true),
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [infoStep, setInfoStep] = useState(0);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      office_name: 'Main branch',
      radius_meters: 50,
      latitude: 0,
      longitude: 0,
      gps_verification_enabled: true,
    }
  });

  const gpsEnabled = form.watch('gps_verification_enabled');

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
                    radius_meters: locData.radius_meters,
                    gps_verification_enabled: locData.gps_verification_enabled ?? true
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
        form.setValue('latitude', pos.coords.latitude, { shouldValidate: true, shouldDirty: true });
        form.setValue('longitude', pos.coords.longitude, { shouldValidate: true, shouldDirty: true });
        toast({ title: 'Coordinates captured' });
    }, (err) => {
        toast({ variant: 'destructive', title: 'Location access denied', description: 'Please enable high-accuracy GPS in your browser settings.' });
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
      toast({ title: 'System synchronized', description: `${values.gps_verification_enabled ? 'GPS Locked' : 'Flexible'} protocol is now active.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Setup failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('office-qr-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx?.drawImage(img, 0, 0, 1000, 1000);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${form.getValues('office_name')}_QR_HD.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
      toast({ title: "HD QR code generated", description: "The asset is now downloading." });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const qrValue = `RIVER_OFFICE_QR:${companyId}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setShowHowItWorks(false);
          setInfoStep(0);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        {!showHowItWorks ? (
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                <ScrollArea className="flex-1">
                    <div className="p-10">
                        <DialogHeader className="mb-10">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 rounded-2xl bg-primary/10">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900">QR System Setup</DialogTitle>
                            </div>
                            <DialogDescription className="text-slate-500 font-bold text-xs">
                                Choose how staff presence should be verified during clock-in.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
                                    <FormField control={form.control} name="gps_verification_enabled" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <FormLabel className="text-sm font-black uppercase text-slate-900">GPS Precision Lock</FormLabel>
                                                    {field.value ? <Lock className="h-3 w-3 text-primary" /> : <Zap className="h-3 w-3 text-amber-500" />}
                                                </div>
                                                <FormDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {field.value ? 'Strict on-site verification' : 'Flexible QR scan only'}
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )} />

                                    {gpsEnabled && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Separator className="bg-slate-200" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="latitude" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latitude</FormLabel><FormControl><Input type="number" step="any" className="h-12 rounded-xl bg-white border-slate-200 font-mono text-xs" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={form.control} name="longitude" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Longitude</FormLabel><FormControl><Input type="number" step="any" className="h-12 rounded-xl bg-white border-slate-200 font-mono text-xs" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>

                                            <Button type="button" variant="outline" onClick={captureCurrentLocation} className="w-full rounded-xl border-dashed gap-3 h-12 text-xs font-bold text-slate-500 hover:text-primary transition-all bg-white">
                                                <MapIcon className="h-4 w-4" /> Capture current coordinates
                                            </Button>

                                            <FormField control={form.control} name="radius_meters" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowed radius (meters)</FormLabel>
                                                    <FormControl><Input type="number" className="h-12 rounded-xl bg-white border-slate-200 font-bold" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    )}
                                </div>

                                <FormField control={form.control} name="office_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location label</FormLabel>
                                        <FormControl><Input placeholder="Headquarters" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="pt-6 space-y-3">
                                    <Button type="submit" disabled={isSubmitting} className="w-full rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20">
                                        {isSubmitting ? 'Syncing...' : 'Save Configuration'}
                                    </Button>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowHowItWorks(true)}
                                        className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors py-2"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5" /> How it works
                                    </button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>

                <div className="w-full md:w-[45%] bg-slate-900 text-white p-12 flex flex-col items-center justify-center animate-in slide-in-from-right duration-700 relative shrink-0">
                    <div className="bg-white p-8 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] mb-10 group relative transition-transform duration-500 hover:scale-105">
                        <QRCodeSVG id="office-qr-svg" value={qrValue} size={200} level="H" includeMargin={false} />
                        <div className="absolute inset-0 border-8 border-slate-50/50 rounded-[3rem] pointer-events-none" />
                    </div>

                    <div className="text-center space-y-6 max-w-[280px]">
                        <h4 className="text-2xl font-black tracking-tight">QR Entry Tag</h4>
                        <div className="flex flex-col gap-3 pt-4">
                            <Button 
                              className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 h-12 text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl" 
                              onClick={downloadQR}
                              disabled={!location}
                            >
                                <Download className="h-4 w-4" /> Download QR code in HD
                            </Button>
                            {!location && (
                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Setup required for download</p>
                            )}
                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white" onClick={() => onOpenChange(false)}>Close asset view</Button>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-8 text-[8px] font-black uppercase tracking-[0.6em] text-white/10">River Philippines</div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
                <div className="p-8 border-b bg-white sticky top-0 z-20 flex items-center justify-between">
                    <button 
                        onClick={() => { setShowHowItWorks(false); setInfoStep(0); }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to setup
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            {[0, 1, 2, 3].map((s) => (
                                <div key={s} className={cn("h-1.5 w-6 rounded-full transition-all", s === infoStep ? "bg-primary w-10" : "bg-slate-200")} />
                            ))}
                        </div>
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold uppercase text-[9px] tracking-widest px-3 h-6">Educational Guide</Badge>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                    <div className="w-full max-w-4xl h-full flex items-center justify-center">
                        <div key={infoStep} className="w-full animate-in fade-in slide-in-from-right-8 duration-500">
                            {infoStep === 0 && (
                                <div className="space-y-8 text-center max-w-2xl mx-auto">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 mb-4">
                                        <span className="text-2xl font-black">1</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">System configuration</h3>
                                        <p className="text-slate-500 font-medium">Choosing the level of verification for your workplace.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="border-none shadow-lg rounded-[2rem] bg-white p-8 flex flex-col items-center gap-6">
                                            <div className="p-4 rounded-2xl bg-blue-50 text-primary shadow-inner"><Lock className="h-8 w-8" /></div>
                                            <div className="space-y-2">
                                                <p className="font-black text-sm uppercase text-slate-900">GPS Locked</p>
                                                <p className="text-xs text-slate-500 leading-snug">Strict verification. Employees must be within a specific radius of the office to clock in.</p>
                                            </div>
                                        </Card>
                                        <Card className="border-none shadow-lg rounded-[2rem] bg-white p-8 flex flex-col items-center gap-6">
                                            <div className="p-4 rounded-2xl bg-amber-50 text-amber-500 shadow-inner"><Zap className="h-8 w-8" /></div>
                                            <div className="space-y-2">
                                                <p className="font-black text-sm uppercase text-slate-900">Flexible Scan</p>
                                                <p className="text-xs text-slate-500 leading-snug">Fast verification. Employees can clock in simply by scanning the QR code anywhere.</p>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {infoStep === 1 && (
                                <div className="space-y-8 text-center max-w-2xl mx-auto">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 mb-4">
                                        <span className="text-2xl font-black">2</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Deploying the Entry Tag</h3>
                                        <p className="text-slate-500 font-medium">Digital gateway meet physical touchpoint.</p>
                                    </div>
                                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 flex flex-col items-center gap-8">
                                        <div className="p-6 rounded-[2rem] bg-blue-50 text-primary shadow-inner">
                                            <QrCode className="h-12 w-12" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-700 leading-snug">
                                            Print and display the generated QR code at your office entrance or common areas for staff to scan upon arrival.
                                        </p>
                                    </Card>
                                </div>
                            )}

                            {infoStep === 2 && (
                                <div className="space-y-8 text-center max-w-2xl mx-auto">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 mb-4">
                                        <span className="text-2xl font-black">3</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Employee Terminal Scan</h3>
                                        <p className="text-slate-500 font-medium">The digital handshake that verifies attendance.</p>
                                    </div>
                                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8">
                                        <div className="flex items-center justify-center gap-6">
                                            <div className="p-5 rounded-[1.5rem] bg-blue-50 text-primary shadow-sm"><QrCode className="h-10 w-10" /></div>
                                            <p className="text-left text-base font-bold text-slate-700 leading-tight flex-1">
                                                Employee taps “Attendance Terminal” in their app and scans the office QR code. The system verifies identity and protocol in real-time.
                                            </p>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {infoStep === 3 && (
                                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intelligent automation</h3>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">How the system decides</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                                        <Card className="border-none shadow-lg rounded-3xl bg-white p-6 space-y-4 hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Calculator className="h-5 w-5" /></div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Session logic</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                The first valid scan of the day is marked as **TIME IN**, and the subsequent valid scan is **TIME OUT**. Duration is automatically calculated.
                                            </p>
                                        </Card>

                                        <Card className="border-none shadow-lg rounded-3xl bg-white p-6 space-y-4 hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-green-50 text-green-600"><DollarSign className="h-5 w-5" /></div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Payroll sync</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                Verified logs feed directly into the payroll engine, ensuring accurate salary computation based on real work data.
                                            </p>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="p-8 border-t bg-white flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setInfoStep(prev => Math.max(0, prev - 1))}
                        disabled={infoStep === 0}
                        className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 disabled:opacity-20"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Phase {infoStep + 1} of 4</div>
                    
                    {infoStep < 3 ? (
                        <Button 
                            onClick={() => setInfoStep(prev => prev + 1)}
                            className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
                        >
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button 
                            onClick={() => { setShowHowItWorks(false); setInfoStep(0); }}
                            className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 bg-green-600 hover:bg-green-700"
                        >
                            Finish guide <CheckCircle2 className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
