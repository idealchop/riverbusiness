'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, MapPin, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
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

  const companyId = user?.companyId || user?.clientId;

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    // Use a small timeout to ensure the DOM element #qr-reader is rendered
    // by React before the Html5QrcodeScanner tries to find it.
    const setupScanner = () => {
        if (isOpen && step === 'scan') {
          const element = document.getElementById("qr-reader");
          if (!element) {
              // If element isn't found yet, retry in the next tick
              setTimeout(setupScanner, 50);
              return;
          }

          scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );

          scanner.render(
            (decodedText) => {
              handleScanSuccess(decodedText);
              scanner?.clear().catch(err => console.error("Scanner clear failed", err));
            },
            (error) => {
              // Silent fail for scanning errors (common during active search)
            }
          );
        }
    };

    setupScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.warn("Scanner cleanup failed", err));
      }
    };
  }, [isOpen, step]);

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

    // QR Format Check: RIVER_OFFICE_QR:<COMPANY_ID>
    if (!decodedText.startsWith(`RIVER_OFFICE_QR:${companyId}`)) {
      setErrorMsg("Invalid QR Code. Please scan the official River Office QR.");
      setFormStep('error');
      return;
    }

    setFormStep('validate');
    setIsProcessing(true);

    try {
      // 1. Get Employee Geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // 2. Fetch Company Location Settings
      const locationsCol = collection(firestore, 'hr_companies', companyId, 'locations');
      const locationSnap = await getDocs(locationsCol);
      
      if (locationSnap.empty) {
        setErrorMsg("Office coordinates not set. Please contact your admin.");
        setFormStep('error');
        return;
      }

      const office = locationSnap.docs[0].data() as HRCompanyLocation;
      const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
      const radius = office.radius_meters || 100;

      if (distance > radius) {
        setErrorMsg(`Location mismatch. You are ${Math.round(distance)}m away from the office.`);
        setFormStep('error');
        return;
      }

      // 3. Determine IN vs OUT logic
      // Check for the latest log today
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const logsQuery = query(
        collection(firestore, 'hr_companies', companyId, 'attendance'),
        where('employeeId', '==', user.id),
        where('date', '==', todayStr),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const logsSnap = await getDocs(logsQuery);
      const nextAction = logsSnap.empty ? 'IN' : (logsSnap.docs[0].data() as HRAttendanceLog).action === 'IN' ? 'OUT' : 'IN';
      setActionType(nextAction);

      // 4. Save Record
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

      const logRef = collection(firestore, 'hr_companies', companyId, 'attendance');
      await addDoc(logRef, logData);

      setFormStep('success');
      toast({ title: `Successfully Clocked ${nextAction}` });

    } catch (err: any) {
      console.error("Validation failed", err);
      setErrorMsg(err.message || "Failed to verify location. Please enable GPS.");
      setFormStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setFormStep('scan');
    setErrorMsg('');
    setActionType(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <div className="p-8">
            <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Attendance Terminal</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">Verify your presence via QR & GPS validation.</DialogDescription>
            </DialogHeader>
            
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden relative">
                {step === 'scan' && (
                    <div id="qr-reader" className="w-full h-full" />
                )}

                {step === 'validate' && (
                    <div className="flex flex-col items-center gap-6 p-10 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">Validating</p>
                            <p className="text-xs font-medium text-slate-400">Capturing GPS proof & verifying radius...</p>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center gap-6 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-2xl font-black tracking-tight text-slate-900">Clocked {actionType}!</p>
                            <p className="text-sm font-medium text-slate-500">Your presence has been verified and logged in the ledger.</p>
                        </div>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col items-center gap-6 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center">
                            <XCircle className="h-12 w-12 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xl font-bold tracking-tight text-slate-900">Validation Denied</p>
                            <p className="text-xs font-medium text-red-600/70 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{errorMsg}</p>
                        </div>
                        <Button variant="outline" onClick={resetScanner} className="rounded-xl font-bold text-xs h-10 px-8">Retry Validation</Button>
                    </div>
                )}
            </div>

            <DialogFooter className="pt-6">
                {step === 'scan' ? (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-full">Point camera at the printed office QR</p>
                ) : (
                    <Button onClick={() => onOpenChange(false)} className="w-full h-12 rounded-xl font-bold text-sm shadow-lg">Dismiss Terminal</Button>
                )}
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
