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
import { Loader2, MapPin, CheckCircle2, XCircle, ShieldCheck, QrCode, Camera } from 'lucide-react';
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
  const [showManualStart, setShowManualStart] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const companyId = user?.companyId || user?.clientId;

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn("Scanner cleanup warning:", e);
      }
      scannerRef.current = null;
    }
  };

  const startCameraFlow = async () => {
    if (!companyId) return;
    
    setErrorMsg("");
    setCameraLoading(true);
    setShowManualStart(false);

    // Ensure clean state
    await stopScanner();

    const tryStart = async (attempts = 0) => {
      const element = document.getElementById("qr-reader");
      
      if (!element) {
        if (attempts < 15) {
          setTimeout(() => tryStart(attempts + 1), 200);
        } else {
          setErrorMsg("Terminal mounting timed out. Please try again.");
          setFormStep('error');
          setCameraLoading(false);
        }
        return;
      }

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: (viewfinderWidth, vHeight) => {
                const minDim = Math.min(viewfinderWidth, vHeight);
                return { width: minDim * 0.7, height: minDim * 0.7 };
            },
            aspectRatio: 1.0 
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {} // Silent on scan success (just looking)
        );
        setCameraLoading(false);
      } catch (err) {
        console.error("Camera start failed:", err);
        setErrorMsg("Hardware access blocked. Ensure camera permissions are enabled.");
        setFormStep('error');
        setCameraLoading(false);
      }
    };

    tryStart();
  };

  useEffect(() => {
    let mountTimeout: NodeJS.Timeout;

    if (isOpen && step === 'scan' && companyId) {
      // Delay for dialog animation and DOM hydration
      mountTimeout = setTimeout(() => {
        startCameraFlow();
        // Show manual override if it hangs
        mountTimeout = setTimeout(() => {
            setCameraLoading(prev => {
                if (prev) setShowManualStart(true);
                return prev;
            });
        }, 4000);
      }, 1000);
    }

    return () => {
      clearTimeout(mountTimeout);
      stopScanner();
    };
  }, [isOpen, step, companyId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
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

    const expectedHandshake = `RIVER_OFFICE_QR:${companyId}`;
    if (decodedText.trim() !== expectedHandshake) {
      setErrorMsg("Security Error: Invalid organizational QR detected.");
      setFormStep('error');
      return;
    }

    await stopScanner();

    setFormStep('validate');
    setIsProcessing(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      const locationsCol = collection(firestore, 'hr_companies', companyId, 'locations');
      const locationSnap = await getDocs(locationsCol);
      
      if (locationSnap.empty) {
        setErrorMsg("Error: Office coordinates not anchored by administrator.");
        setFormStep('error');
        return;
      }

      const office = locationSnap.docs[0].data() as HRCompanyLocation;
      const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
      const radius = office.radius_meters || 100;

      if (distance > radius) {
        setErrorMsg(`Location Error: You are ${Math.round(distance)}m away. Authorized radius is ${radius}m.`);
        setFormStep('error');
        return;
      }

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
      toast({ title: `Verified: ${nextAction} Success` });

    } catch (err: any) {
      setErrorMsg(err.message || "GPS Failure. Please enable Location Services.");
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
            
            <div className="min-h-[350px] flex flex-col items-center justify-center bg-slate-900 rounded-[2.5rem] border-4 border-slate-100 overflow-hidden relative shadow-inner">
                {step === 'scan' && (
                    <>
                        <div id="qr-reader" className="w-full h-full" />
                        
                        {cameraLoading && (
                           <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900 text-white gap-6">
                              <Loader2 className="h-10 w-10 animate-spin text-primary" />
                              <div className="text-center space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Activating Terminal...</p>
                                {showManualStart && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={startCameraFlow}
                                        className="rounded-xl border-white/20 text-white h-9 font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900"
                                    >
                                        <Camera className="mr-2 h-3.5 w-3.5" /> Start Manual Scan
                                    </Button>
                                )}
                              </div>
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
                            <p className="mt-8 text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Align with Office Tag</p>
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
                                Capturing GPS proof...<br/>Checking boundary radius.
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
                            <p className="text-3xl font-black tracking-tight text-white uppercase">Authorized!</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Location verified. Log saved.
                            </p>
                        </div>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col items-center gap-8 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <XCircle className="h-10 w-10 text-white" />
                        </div>
                        <div className="space-y-4">
                            <p className="text-xl font-black text-white uppercase">Access Denied</p>
                            <div className="bg-red-500/10 px-6 py-4 rounded-2xl border border-red-500/20 max-w-[280px]">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={resetTerminal} 
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest h-11 px-10 border-white/10 text-white hover:bg-white hover:text-slate-900"
                        >
                            Retry Handshake
                        </Button>
                    </div>
                )}
            </div>

            <DialogFooter className="pt-8">
                <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center gap-3 justify-center">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">GPS Proof Verification Active</p>
                    </div>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Close Terminal</Button>
                </div>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}