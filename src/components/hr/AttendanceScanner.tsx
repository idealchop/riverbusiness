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
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, XCircle, QrCode, Camera, Clock, Zap, Lock, Fingerprint } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import type { HRCompanyLocation, HRAttendanceLog } from '@/lib/types';

interface AttendanceScannerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  liveDuration?: string;
}

export function AttendanceScanner({ isOpen, onOpenChange, user, liveDuration = '00:00:00' }: AttendanceScannerProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [step, setStep] = useState<'scan' | 'validate' | 'error'>('scan');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [showManualStart, setShowManualStart] = useState(false);
  const [isCurrentlyIn, setIsCurrentlyIn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const companyId = user?.companyId || user?.clientId;

  const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

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
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg("Your browser doesn't support camera access.");
        setStep('error');
        return;
    }

    setErrorMsg("");
    setCameraLoading(true);
    setShowManualStart(false);

    await stopScanner();

    try {
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
        () => {} 
      );
      setCameraLoading(false);
    } catch (err) {
      console.error("Camera start failed:", err);
      setErrorMsg("Hardware access blocked. Ensure camera permissions are enabled.");
      setStep('error');
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    let manualTimeout: NodeJS.Timeout;

    if (isOpen && step === 'scan' && companyId) {
      const checkState = async () => {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const logsQuery = query(
            collection(firestore!, 'hr_companies', companyId, 'attendance'),
            where('employeeId', '==', user.id),
            where('date', '==', todayStr)
          );
          const snap = await getDocs(logsQuery);
          const latest = snap.docs
            .map(d => d.data() as HRAttendanceLog)
            .sort((a, b) => (toSafeDate(b.timeIn)?.getTime() || 0) - (toSafeDate(a.timeIn)?.getTime() || 0))[0];
            
          setIsCurrentlyIn(!!(latest && !latest.timeOut));
      };
      checkState();

      const mountTimeout = setTimeout(() => {
        startCameraFlow();
        manualTimeout = setTimeout(() => {
            setShowManualStart(true);
        }, 5000);
      }, 500);

      return () => {
          clearTimeout(mountTimeout);
          clearTimeout(manualTimeout);
      };
    }

    return () => {
      clearTimeout(manualTimeout);
      stopScanner();
    };
  }, [isOpen, step, companyId, firestore, user.id]);

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
      setErrorMsg("Security error: Invalid organizational QR detected.");
      setStep('error');
      return;
    }

    await stopScanner();
    setStep('validate');

    try {
      const locationsCol = collection(firestore, 'hr_companies', companyId, 'locations');
      const locationSnap = await getDocs(locationsCol);
      
      if (locationSnap.empty) {
        setErrorMsg("Error: Office credentials not anchored by administrator.");
        setStep('error');
        return;
      }

      const office = locationSnap.docs[0].data() as HRCompanyLocation;
      const isGpsRequired = office.gps_verification_enabled ?? true;

      let validationStatus: 'Valid' | 'Invalid' | 'Skipped' = 'Skipped';

      if (isGpsRequired) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });

          const { latitude, longitude } = position.coords;
          const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
          const radius = office.radius_meters || 100;

          if (distance > radius) {
            setErrorMsg(`Location error: You are ${Math.round(distance)}m away.`);
            setStep('error');
            return;
          }
          validationStatus = 'Valid';
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const logsQuery = query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', user.id),
        where('date', '==', todayStr)
      );
      
      const logsSnap = await getDocs(logsQuery);
      const latestLog = logsSnap.empty ? null : logsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as HRAttendanceLog))
        .sort((a, b) => (toSafeDate(b.timeIn)?.getTime() || 0) - (toSafeDate(a.timeIn)?.getTime() || 0))[0];
      
      const nextAction = (latestLog && !latestLog.timeOut) ? 'OUT' : 'IN';

      if (nextAction === 'IN') {
          const logData: Omit<HRAttendanceLog, 'id'> = {
            companyId,
            employeeId: user.id,
            employeeName: user.name,
            date: todayStr,
            timeIn: serverTimestamp(),
            status: 'present',
            validation_status: validationStatus,
            method: 'QR',
            office_id: office.id,
            action: 'IN'
          };
          await addDoc(collection(firestore, 'hr_companies', companyId, 'attendance'), logData);
          toast({ title: 'Verified: Clock In Successful' });
      } else if (latestLog) {
          const timeOut = Timestamp.now();
          const timeIn = toSafeDate(latestLog.timeIn) ? Timestamp.fromDate(toSafeDate(latestLog.timeIn)!) : Timestamp.now();
          const minutes = differenceInMinutes(timeOut.toDate(), timeIn.toDate());
          
          await updateDoc(doc(firestore, 'hr_companies', companyId, 'attendance', latestLog.id), {
              timeOut: serverTimestamp(),
              totalMinutes: minutes,
              action: 'OUT'
          });
          toast({ title: 'Verified: Clock Out Successful' });
      }

      onOpenChange(false);
      resetTerminal();

    } catch (err: any) {
      setErrorMsg(err.message || "Protocol failure.");
      setStep('error');
    }
  };

  const resetTerminal = () => {
    stopScanner();
    setStep('scan');
    setErrorMsg('');
    setCameraLoading(false);
    setShowManualStart(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetTerminal();
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <style dangerouslySetInnerHTML={{ __html: `
          #qr-reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          #qr-reader {
            border: none !important;
          }
          #qr-reader__scan_region {
            border: none !important;
          }
        `}} />
        <div className="p-8">
            <DialogHeader className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Fingerprint className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Attendance Terminal</DialogTitle>
                </div>
            </DialogHeader>
            
            <div className="aspect-square w-full max-w-[320px] mx-auto flex flex-col items-center justify-center bg-black rounded-[2.5rem] border-4 border-slate-50 overflow-hidden relative shadow-inner">
                {step === 'scan' && (
                    <>
                        <div id="qr-reader" className="absolute inset-0 w-full h-full z-10" />
                        
                        {(cameraLoading || showManualStart) && (
                           <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 text-white gap-6">
                              {cameraLoading && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
                              <div className="text-center space-y-3">
                                {showManualStart && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={startCameraFlow}
                                        className="rounded-xl border-white/20 text-white h-9 font-bold text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 px-6 mt-4"
                                    >
                                        <Camera className="mr-2 h-3.5 w-3.5" /> Start Scanner
                                    </Button>
                                )}
                              </div>
                           </div>
                        )}
                    </>
                )}

                {step === 'validate' && (
                    <div className="flex flex-col items-center gap-8 p-10 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-bounce" />
                        </div>
                        <p className="text-lg font-black uppercase tracking-[0.2em] text-white">Validating</p>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col items-center gap-8 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <XCircle className="h-10 w-10 text-white" />
                        </div>
                        <div className="space-y-4">
                            <p className="text-xl font-black text-white uppercase">Access Denied</p>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">{errorMsg}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={resetTerminal} 
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest h-11 px-10 border-white/10 text-white hover:bg-white hover:text-slate-900"
                        >
                            Retry
                        </Button>
                    </div>
                )}
            </div>

            {isCurrentlyIn && step === 'scan' && (
                <div className="mt-6 flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
                         <Clock className="h-4 w-4 text-primary animate-pulse" />
                         <span className="text-sm font-black text-primary tabular-nums tracking-widest">{liveDuration}</span>
                    </div>
                </div>
            )}

            <DialogFooter className="pt-8">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Cancel</Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}