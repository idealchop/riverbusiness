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
import { MapPin, QrCode, Download, Printer, ShieldCheck, Map as MapIcon, Info, HelpCircle, ArrowLeft, CheckCircle2, ChevronRight, Calculator, Database } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { HRCompanyLocation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
        if (!open) setShowHowItWorks(false);
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
                                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900">QR Attendance</DialogTitle>
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
                                        {isSubmitting ? 'Syncing...' : 'Save QR System'}
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
                        <h4 className="text-2xl font-black tracking-tight uppercase">QR Entry Tag</h4>
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
            <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 border-b bg-white sticky top-0 z-10 flex items-center justify-between">
                    <button 
                        onClick={() => setShowHowItWorks(false)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to setup
                    </button>
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold uppercase text-[9px] tracking-widest px-3 h-6">Educational Guide</Badge>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-10 max-w-3xl mx-auto space-y-12 pb-20">
                        <div className="text-center space-y-3">
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">QR Office Attendance</h2>
                            <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">How It Works</p>
                        </div>

                        <div className="grid gap-8">
                            {/* Step 1 */}
                            <div className="relative group">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full group-hover:bg-primary transition-all" />
                                <div className="space-y-4 pl-6">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs">1</span>
                                        Owner sets up office
                                    </h3>
                                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                                        <ul className="grid gap-3 text-sm font-medium text-slate-600">
                                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> Admin opens River Apps</li>
                                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> Adds office/branch location</li>
                                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> Sets allowed GPS radius (ex: 50–100m)</li>
                                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> System generates Office QR Code</li>
                                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> QR code is printed and placed in the office</li>
                                        </ul>
                                        <p className="text-[10px] font-black uppercase text-green-600 tracking-[0.2em] pt-2 flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3" /> Office is now ready for scanning
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative group">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full group-hover:bg-primary transition-all" />
                                <div className="space-y-4 pl-6">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs">2</span>
                                        Employee arrives at office
                                    </h3>
                                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-50 text-primary"><MapPin className="h-6 w-6" /></div>
                                            <p className="text-sm font-bold text-slate-600 leading-tight">
                                                Staff member enters the designated physical premises and opens the River Business portal.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative group">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full group-hover:bg-primary transition-all" />
                                <div className="space-y-4 pl-6">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs">3</span>
                                        Employee scans office QR
                                    </h3>
                                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-50 text-primary"><QrCode className="h-6 w-6" /></div>
                                            <p className="text-sm font-bold text-slate-600 leading-tight">
                                                Employee taps “Attendance Terminal” and scans the printed Office QR code.
                                            </p>
                                        </div>
                                        <div className="pt-4 border-t space-y-3">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Automatic handshake data:</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold">Employee ID</Badge>
                                                <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold">Office Auth ID</Badge>
                                                <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold">GPS Coordinates</Badge>
                                                <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold">Server Timestamp</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="opacity-40" />

                        {/* Additional Information Section (4-7) */}
                        <div className="space-y-8">
                             <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-slate-200" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Additional system intelligence</h4>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-none shadow-sm rounded-3xl bg-white p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><ShieldCheck className="h-5 w-5" /></div>
                                        <p className="text-sm font-black uppercase tracking-tight">Location validation</p>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        River checks if the employee is within the allowed GPS radius. Scans outside the boundary are automatically rejected to prevent remote spoofing.
                                    </p>
                                </Card>

                                <Card className="border-none shadow-sm rounded-3xl bg-white p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Calculator className="h-5 w-5" /></div>
                                        <p className="text-sm font-black uppercase tracking-tight">Automated session logic</p>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        The system intelligently decides: the first valid scan of the day is marked as **TIME IN**, and the subsequent valid scan is **TIME OUT**.
                                    </p>
                                </Card>

                                <Card className="border-none shadow-sm rounded-3xl bg-white p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></div>
                                        <p className="text-sm font-black uppercase tracking-tight">Immutable records</p>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Every verified log stores the employee, office entity, time, and precise GPS proof for a tamper-proof audit trail.
                                    </p>
                                </Card>

                                <Card className="border-none shadow-sm rounded-3xl bg-white p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-green-50 text-green-600"><DollarSign className="h-5 w-5" /></div>
                                        <p className="text-sm font-black uppercase tracking-tight">HR synchronization</p>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Logs automatically update the attendance ledger, calculate daily work hours, flag late entries, and feed into the payroll computation engine.
                                    </p>
                                </Card>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                
                <div className="p-8 border-t bg-white flex justify-center">
                    <Button onClick={() => setShowHowItWorks(false)} className="rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-xs px-12 shadow-xl shadow-primary/20">
                        Continue to configuration
                    </Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}