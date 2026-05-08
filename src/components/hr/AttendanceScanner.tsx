'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, CheckCircle2, XCircle, ShieldCheck, QrCode } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { HRCompanyLocation, HRAttendanceLog } from '@/lib/types';

interface AttendanceScannerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function AttendanceScanner({ isOpen, onOpenChange, user }: AttendanceScannerProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [step, setFormStep] = useState<'scan' | 'validate' | 'success' | 'error'>('scan');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'IN' | 'OUT' | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const companyId = user?.companyId || user?.clientId;

  // Cleanup function to strictly stop the scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn("Scanner stop warning:", e);
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let mountTimeout: NodeJS.Timeout;

    if (isOpen && step === 'scan' && companyId) {
      setCameraLoading(true);
      
      const initializeScanner = async () => {
        // Wait for Dialog animation to finish and DOM to be ready
        // Mobile browsers need a bit more time for the UI to stabilize before hardware requests
        await new Promise(resolve => mountTimeout = setTimeout(resolve, 800));

        let attempts = 0;
        const maxAttempts = 15;
        
        const tryStart = async () => {
          const element = document.getElementById("qr-reader");
          
          if (!element) {
            if (attempts < maxAttempts) {
              attempts++;
              mountTimeout = setTimeout(tryStart, 150);
            } else {
              setErrorMsg("Hardware link timed out. Please try opening the terminal again.");
              setFormStep('error');
              setCameraLoading(false);
            }
            return;
          }

          try {
            await stopScanner(); // Ensure no previous instance exists

            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
              { facingMode: "environment" },
              { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0 
              },
              (decodedText) => {
                handleScanSuccess(decodedText);
              },
              () => {} // Silent on scan failure (scanning...)
            );
            setCameraLoading(false);
          } catch (err) {
            console.error("Scanner start error:", err);
            setErrorMsg("Camera access denied. Please allow camera permissions for River Apps.");
            setFormStep('error');
            setCameraLoading(false);
          }
        };

        tryStart();
      };

      initializeScanner();
    }

    return () => {
      clearTimeout(mountTimeout);
      stopScanner();
    };
  }, [isOpen, step, companyId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!firestore || !companyId) return;

    // Secure Handshake Check
    const expectedHandshake = `RIVER_OFFICE_QR:${companyId}`;
    if (decodedText.trim() !== expectedHandshake) {
      setErrorMsg("Security Mismatch: This QR code is not recognized by your company terminal.");
      setFormStep('error');
      return;
    }

    await stopScanner();

    setFormStep('validate');
    setIsProcessing(true);

    try {
      // Capture GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Location Validation
      const locationsCol = collection(firestore, 'hr_companies', companyId, 'locations');
      const locationSnap = await getDocs(locationsCol);
      
      if (locationSnap.empty) {
        setErrorMsg("Operational Error: Office coordinates not found. Please contact admin.");
        setFormStep('error');
        return;
      }

      const office = locationSnap.docs[0].data() as HRCompanyLocation;
      const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
      const radius = office.radius_meters || 100;

      if (distance > radius) {
        setErrorMsg(`Radius Error: You are ${Math.round(distance)}m away. Attendance only allowed within ${radius}m.`);
        setFormStep('error');
        return;
      }

      // Log Logic
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const logsQuery = query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', user.id),
        where('date', '==', todayStr),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const logsSnap = await getDocs(logsQuery);
      const lastAction = logsSnap.empty ? null : (logsSnap.docs[0].data() as HRAttendanceLog).action;
      const nextAction = lastAction === 'IN' ? 'OUT' : 'IN';
      setActionType(nextAction);

      const logData: Omit<HRAttendanceLog, 'id'> = {
        companyId,
        employeeId: user.id,
        employeeName: user.name,
        date: todayStr,
        timestamp: serverTimestamp(),
        action: nextAction,
        gps_lat: latitude,
        gps_long: longitude,
        validation_status: 'Valid',
        method: 'QR',
        office_id: office.id
      };

      await addDoc(collection(firestore, 'hr_companies', companyId, 'attendance'), logData);

      setFormStep('success');
      toast({ title: `Verified: Clocked ${nextAction}` });

    } catch (err: any) {
      setErrorMsg(err.message || "GPS Failure. Please ensure location services are ON.");
      setFormStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTerminal = () => {
    stopScanner();
    setFormStep('scan');
    setErrorMsg('');
    setActionType(null);
    setCameraLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetTerminal();
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">Attendance</DialogTitle>
                </div>
                <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    Verified Presence Protocol
                </DialogDescription>
            </DialogHeader>
            
            <div className="min-h-[350px] flex flex-col items-center justify-center bg-slate-900 rounded-[2.5rem] border-4 border-slate-100 overflow-hidden relative shadow-inner group">
                {step === 'scan' && (
                    <>
                        <div id="qr-reader" className="w-full h-full overflow-hidden" />
                        
                        {cameraLoading && (
                           <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                              <Loader2 className="h-10 w-10 animate-spin text-primary" />
                              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Opening Camera...</p>
                           </div>
                        )}

                        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
                            <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-slide-down" />
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                            </div>
                            <p className="mt-8 text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Position QR code here</p>
                        </div>
                    </>
                )}

                {step === 'validate' && (
                    <div className="flex flex-col items-center gap-8 p-10 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-bounce" />
                        </div>
                        <div className="text-center space-y-3">
                            <p className="text-lg font-black uppercase tracking-[0.2em] text-white">Validating</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed text-center">
                                Capturing GPS proof...<br/>Checking organizational radius.
                            </p>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center gap-8 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                            <CheckCircle2 className="h-12 w-12 text-white" />
                        </div>
                        <div className="space-y-3">
                            <p className="text-3xl font-black tracking-tight text-white uppercase">Clocked {actionType}!</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Your location has been verified.<br/>Log has been securely stored.
                            </p>
                        </div>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col items-center gap-8 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <XCircle className="h-12 w-12 text-white" />
                        </div>
                        <div className="space-y-4">
                            <p className="text-2xl font-black tracking-tight text-white uppercase">Verification Failed</p>
                            <div className="bg-red-500/10 px-6 py-4 rounded-2xl border border-red-500/20 max-w-[280px]">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={resetTerminal} 
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest h-11 px-10 border-white/10 text-white hover:bg-white hover:text-slate-900 transition-all"
                        >
                            Try Again
                        </Button>
                    </div>
                )}
            </div>

            <DialogFooter className="pt-8">
                {step === 'scan' ? (
                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-3 justify-center text-slate-400">
                            <ShieldCheck className="h-4 w-4" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Verified Secure Terminal</p>
                        </div>
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Close</Button>
                    </div>
                ) : (
                    <Button onClick={() => onOpenChange(false)} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20">
                        Dismiss
                    </Button>
                )}
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
