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
import { Card } from '@/components/ui/card';
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
  Info,
  Building
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
  const [infoStep, setInfoStep] = useState(0); // 0: Setup, 1: Arrival, 2: Scan, 3: Additional Info

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      office_name: 'Main branch',
      radius_meters: 50,
      latitude: 0,
      longitude: 0,
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
      toast({ title: 'Geo-fence synchronized', description: 'Precision attendance validation is now active.' });
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
                {/* Control Panel */}
                <ScrollArea className="flex-1">
                    <div className="p-10">
                        <DialogHeader className="mb-10">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 rounded-2xl bg-primary/10">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">QR attendance</DialogTitle>
                            </div>
                            <DialogDescription className="text-slate-500 font-bold text-xs">
                                Define the physical boundaries for team attendance verification.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="office_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location label</FormLabel>
                                        <FormControl><Input placeholder="Headquarters" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="latitude" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latitude</FormLabel><FormControl><Input type="number" step="any" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="longitude" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Longitude</FormLabel><FormControl><Input type="number" step="any" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <Button type="button" variant="outline" onClick={captureCurrentLocation} className="w-full rounded-xl border-dashed gap-3 h-12 text-xs font-bold text-slate-500 hover:text-primary transition-all">
                                    <MapIcon className="h-4 w-4" /> Capture current GPS anchor
                                </Button>

                                <FormField control={form.control} name="radius_meters" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowed radius (meters)</FormLabel>
                                        <FormControl><Input type="number" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold" {...field} /></FormControl>
                                        <FormDescription className="text-[10px] font-medium text-slate-400">Distance from anchor point where clock-in is permitted.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="pt-6 space-y-3">
                                    <Button type="submit" disabled={isSubmitting} className="w-full rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20">
                                        {isSubmitting ? 'Syncing...' : 'Save QR system'}
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

                {/* Asset Hub / QR Presenter */}
                <div className="w-full md:w-[45%] bg-slate-900 text-white p-12 flex flex-col items-center justify-center animate-in slide-in-from-right duration-700 relative shrink-0">
                    <div className="bg-white p-8 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] mb-10 group relative transition-transform duration-500 hover:scale-105">
                        <QRCodeSVG id="office-qr-svg" value={qrValue} size={200} level="H" includeMargin={false} />
                        <div className="absolute inset-0 border-8 border-slate-50/50 rounded-[3rem] pointer-events-none" />
                    </div>

                    <div className="text-center space-y-6 max-w-[280px]">
                        <h4 className="text-2xl font-black tracking-tight uppercase">QR entry tag</h4>
                        <div className="flex flex-col gap-3 pt-4">
                            <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 h-12 text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl" onClick={downloadQR}>
                                <Download className="h-4 w-4" /> Download QR code in HD
                            </Button>
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
                    {/* Animated Step Container */}
                    <div className="w-full max-w-4xl h-full flex items-center justify-center">
                        <div key={infoStep} className="w-full animate-in fade-in slide-in-from-right-8 duration-500">
                            {infoStep === 0 && (
                                <div className="space-y-8 text-center max-w-2xl mx-auto">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 mb-4">
                                        <span className="text-2xl font-black">1</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Owner sets up office</h3>
                                        <p className="text-slate-500 font-medium">Setting up the digital gateway for your workplace.</p>
                                    </div>
                                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 flex flex-col items-center gap-8">
                                        <div className="p-6 rounded-[2rem] bg-blue-50 text-primary shadow-inner">
                                            <Building className="h-12 w-12" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-700 leading-snug">
                                            The admin registers the office location, sets the required GPS distance for staff, and the system instantly creates your unique office entry QR tag.
                                        </p>
                                    </Card>
                                </div>
                            )}

                            {infoStep === 1 && (
                                <div className="space-y-8 text-center max-w-2xl mx-auto">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 mb-4">
                                        <span className="text-2xl font-black">2</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Employee arrives at office</h3>
                                        <p className="text-slate-500 font-medium">Physical presence meets digital verification.</p>
                                    </div>
                                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 flex flex-col items-center gap-8">
                                        <div className="p-6 rounded-[2rem] bg-blue-50 text-primary shadow-inner">
                                            <MapPin className="h-12 w-12" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-700 leading-snug">
                                            Staff member enters the designated physical premises and opens the River Business portal on their device.
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
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Employee scans office QR</h3>
                                        <p className="text-slate-500 font-medium">The digital handshake that verifies attendance.</p>
                                    </div>
                                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10 space-y-8">
                                        <div className="flex items-center justify-center gap-6">
                                            <div className="p-5 rounded-[1.5rem] bg-blue-50 text-primary shadow-sm"><QrCode className="h-10 w-10" /></div>
                                            <p className="text-left text-base font-bold text-slate-700 leading-tight flex-1">
                                                Employee taps “Attendance Terminal” and scans the printed office QR code using their camera.
                                            </p>
                                        </div>
                                        <div className="pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Protocol 1</p>
                                                <Badge variant="outline" className="w-full justify-center bg-slate-50 text-[9px] font-bold border-none h-7">Employee ID</Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Protocol 2</p>
                                                <Badge variant="outline" className="w-full justify-center bg-slate-50 text-[9px] font-bold border-none h-7">Office ID</Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Protocol 3</p>
                                                <Badge variant="outline" className="w-full justify-center bg-slate-50 text-[9px] font-bold border-none h-7">GPS Proof</Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Protocol 4</p>
                                                <Badge variant="outline" className="w-full justify-center bg-slate-50 text-[9px] font-bold border-none h-7">Timestamp</Badge>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {infoStep === 3 && (
                                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">System intelligence</h3>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Automated backend decisions</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                                        <Card className="border-none shadow-lg rounded-3xl bg-white p-6 space-y-4 hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><ShieldCheck className="h-5 w-5" /></div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Location validation</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                River checks if the employee is within the allowed GPS radius. Scans outside the boundary are rejected to prevent remote spoofing.
                                            </p>
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                                <Badge className="bg-green-50 text-green-700 text-[8px] font-bold uppercase border-none h-5">Verified</Badge>
                                                <Badge className="bg-red-50 text-red-700 text-[8px] font-bold uppercase border-none h-5">Rejected</Badge>
                                            </div>
                                        </Card>

                                        <Card className="border-none shadow-lg rounded-3xl bg-white p-6 space-y-4 hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Calculator className="h-5 w-5" /></div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Session logic</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                The system intelligently decides: the first valid scan of the day is marked as **TIME IN**, and the subsequent valid scan is **TIME OUT**.
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 italic">No manual action needed by admin.</p>
                                        </Card>

                                        <Card className="border-none shadow-lg rounded-3xl bg-white p-6 space-y-4 hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Immutable records</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                Every verified log stores the employee, office entity, and precise GPS proof for a tamper-proof digital audit trail.
                                            </p>
                                        </Card>

                                        <Card className="border-none shadow-lg rounded-3xl bg-white p-6 space-y-4 hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-green-50 text-green-600"><DollarSign className="h-5 w-5" /></div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">HR synchronization</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                Logs automatically update the attendance ledger, calculate daily work hours, and feed into the payroll computation engine.
                                            </p>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Wizard Navigation */}
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
