
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Delivery, WaterStation, AppUser, ComplianceReport, SanitationVisit, RefillRequest, RefillRequestStatus } from '@/lib/types';

import { WelcomeDialog } from '@/components/dashboard/WelcomeDialog';
import { DeliveryHistoryDialog } from '@/components/dashboard/dialogs/DeliveryHistoryDialog';
import { ConsumptionHistoryDialog } from '@/components/dashboard/dialogs/ConsumptionHistoryDialog';
import { ProofViewerDialog } from '@/components/dashboard/dialogs/ProofViewerDialog';
import { UpdateScheduleDialog } from '@/components/dashboard/dialogs/UpdateScheduleDialog';
import { RequestRefillDialog } from '@/components/dashboard/dialogs/RequestRefillDialog';
import { SaveLitersDialog } from '@/components/dashboard/dialogs/SaveLitersDialog';
import { ComplianceDialog } from '@/components/dashboard/dialogs/ComplianceDialog';
import { AttachmentViewerDialog } from '@/components/dashboard/dialogs/AttachmentViewerDialog';
import { RefillStatusDialog } from '@/components/dashboard/dialogs/RefillStatusDialog';
import { Dialog } from '@/components/ui/dialog';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface DashboardDialogsProps {
  user: AppUser | null;
  authUser: any;
  firestore: any;
  isUserDocLoading: boolean;
  userDocRef: any;
  deliveries: Delivery[] | null;
  waterStation: WaterStation | null;
  complianceReports: ComplianceReport[] | null;
  complianceLoading: boolean;
  sanitationVisits: SanitationVisit[] | null;
  sanitationLoading: boolean;
  activeRefillRequest: RefillRequest | null;
  branchUsers: AppUser[] | null;
}

export function DashboardDialogs({
  user,
  authUser,
  firestore,
  isUserDocLoading,
  userDocRef,
  deliveries,
  waterStation,
  complianceReports,
  complianceLoading,
  sanitationVisits,
  sanitationLoading,
  activeRefillRequest,
  branchUsers,
}: DashboardDialogsProps) {
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState({
    deliveryHistory: false,
    consumptionHistory: false,
    updateSchedule: false,
    requestRefill: false,
    saveLiters: false,
    compliance: false,
    refillStatus: false,
    welcome: false,
    partnerNotice: false,
  });

  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [attachmentToView, setAttachmentToView] = useState<string | null>(null);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [isRefillRequesting, setIsRefillRequesting] = useState(false);
  const [isSubmitScheduledRefill, setIsSubmitScheduledRefill] = useState(false);

  const openDialog = (dialog: keyof typeof dialogState) => setDialogState(prev => ({ ...prev, [dialog]: true }));
  const closeDialog = (dialog: keyof typeof dialogState) => setDialogState(prev => ({ ...prev, [dialog]: false }));

  const handleOneClickRefill = useCallback(async () => {
    if (!user || !firestore || !authUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot process request. User not found.' });
      return;
    }
    
    setIsRefillRequesting(true);
    const newRequestData: Omit<RefillRequest, 'id'> = {
      userId: user.id,
      userName: user.name,
      businessName: user.businessName,
      clientId: user.clientId || '',
      requestedAt: serverTimestamp(),
      status: 'Requested',
      statusHistory: [{ status: 'Requested', timestamp: Timestamp.now() }],
    };

    try {
      const refillRequestsCollection = collection(firestore, 'users', authUser.uid, 'refillRequests');
      await addDoc(refillRequestsCollection, newRequestData);
      
      toast({
        title: 'Refill Request Sent!',
        description: `Thank you, ${user.name}! We've received your ASAP refill request. You can track its progress.`,
      });
      openDialog('refillStatus');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Request Failed', description: 'There was an issue sending your request.' });
    } finally {
      setIsRefillRequesting(false);
    }
  }, [user, firestore, authUser, toast]);

  useEffect(() => {
    const eventListeners: { [key: string]: (e: Event) => void } = {
      'open-delivery-history': () => openDialog('deliveryHistory'),
      'open-consumption-history': () => openDialog('consumptionHistory'),
      'open-update-schedule': () => openDialog('updateSchedule'),
      'open-request-refill': () => openDialog('requestRefill'),
      'open-save-liters': () => openDialog('saveLiters'),
      'open-compliance': () => openDialog('compliance'),
      'open-refill-status': () => openDialog('refillStatus'),
      'open-partner-notice': () => openDialog('partnerNotice'),
      'request-asap-refill': handleOneClickRefill,
      'view-delivery-proof': (e) => setSelectedProofUrl((e as CustomEvent).detail.url),
      'view-attachment': (e) => setAttachmentToView((e as CustomEvent).detail.url),
    };

    Object.keys(eventListeners).forEach(eventName => {
      window.addEventListener(eventName, eventListeners[eventName]);
    });

    return () => {
      Object.keys(eventListeners).forEach(eventName => {
        window.removeEventListener(eventName, eventListeners[eventName]);
      });
    };
  }, [handleOneClickRefill]);

  useEffect(() => {
    if (user && !isUserDocLoading && !welcomeShown) {
      openDialog('welcome');
      setWelcomeShown(true);
    }
  }, [user, isUserDocLoading, welcomeShown]);

  const handleScheduledRefill = async (date: Date, containers: number) => {
    if (!user || !firestore || !authUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot process request. User not found.' });
      return;
    }
    
    setIsSubmitScheduledRefill(true);
    const newRequestData: Omit<RefillRequest, 'id'> = {
      userId: user.id,
      userName: user.name,
      businessName: user.businessName,
      clientId: user.clientId || '',
      requestedAt: serverTimestamp(),
      status: 'Requested',
      statusHistory: [{ status: 'Requested', timestamp: Timestamp.now() }],
      volumeContainers: containers,
      requestedDate: date.toISOString(),
    };

    try {
      const refillRequestsCollection = collection(firestore, 'users', authUser.uid, 'refillRequests');
      await addDoc(refillRequestsCollection, newRequestData);
      
      toast({ title: 'Refill Request Sent!', description: `Thank you, ${user.name}! You can track the progress of your request.` });
      closeDialog('requestRefill');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Request Failed', description: 'There was an issue sending your request.' });
    } finally {
      setIsSubmitScheduledRefill(false);
    }
  };

  const stationOKImage = PlaceHolderImages.find(p => p.id === 'station-operational');
  const userFirstName = user?.name.split(' ')[0] || 'there';

  return (
    <>
      <WelcomeDialog isOpen={dialogState.welcome} onOpenChange={() => closeDialog('welcome')} user={user} />
      <DeliveryHistoryDialog
        isOpen={dialogState.deliveryHistory}
        onOpenChange={() => closeDialog('deliveryHistory')}
        deliveries={deliveries}
        sanitationVisits={sanitationVisits}
        complianceReports={complianceReports}
        user={user}
        onViewProof={setSelectedProofUrl}
        isParent={user?.accountType === 'Parent'}
        branches={branchUsers}
      />
      <ConsumptionHistoryDialog
        isOpen={dialogState.consumptionHistory}
        onOpenChange={() => closeDialog('consumptionHistory')}
        deliveries={deliveries}
        user={user}
        branches={branchUsers}
        isParent={user?.accountType === 'Parent'}
      />
      <ProofViewerDialog isOpen={!!selectedProofUrl} onOpenChange={() => setSelectedProofUrl(null)} proofUrl={selectedProofUrl} />
      <UpdateScheduleDialog isOpen={dialogState.updateSchedule} onOpenChange={() => closeDialog('updateSchedule')} userDocRef={userDocRef} customPlanDetails={user?.customPlanDetails} />
      <RequestRefillDialog isOpen={dialogState.requestRefill} onOpenChange={() => closeDialog('requestRefill')} onSubmit={handleScheduledRefill} isSubmitting={isSubmitScheduledRefill} />
      <SaveLitersDialog isOpen={dialogState.saveLiters} onOpenChange={() => closeDialog('saveLiters')} user={user} deliveries={deliveries} />
      <ComplianceDialog
        isOpen={dialogState.compliance}
        onOpenChange={() => closeDialog('compliance')}
        waterStation={waterStation}
        complianceReports={complianceReports}
        complianceLoading={complianceLoading}
        sanitationVisits={sanitationVisits}
        sanitationLoading={sanitationLoading}
        onViewAttachment={setAttachmentToView}
      />
      <AttachmentViewerDialog isOpen={!!attachmentToView} onOpenChange={() => setAttachmentToView(null)} attachmentUrl={attachmentToView} />
      <RefillStatusDialog isOpen={dialogState.refillStatus} onOpenChange={() => closeDialog('refillStatus')} activeRefillRequest={activeRefillRequest} />
      <Dialog open={dialogState.partnerNotice} onOpenChange={() => closeDialog('partnerNotice')}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {waterStation?.status === 'Under Maintenance' ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
              Partner Station Notice
            </DialogTitle>
            <DialogDescription>Updates regarding your assigned water refilling station.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {waterStation?.status === 'Under Maintenance' ? (
              <div className="space-y-4">
                {stationOKImage && <div className="relative h-40 w-full overflow-hidden rounded-lg"><Image src={stationOKImage.imageUrl} alt="Water station under maintenance" layout="fill" objectFit="contain" className="opacity-50 grayscale" data-ai-hint="water station" /></div>}
                <h3 className="font-semibold">Station is Under Maintenance</h3>
                <p className="text-sm text-muted-foreground">We're currently performing essential maintenance at your assigned station, <span className="font-semibold">{waterStation.name}</span>, to ensure our high standards of quality.</p>
                {waterStation.statusMessage && <div className="p-3 bg-muted rounded-md text-sm"><p className="font-semibold">Admin Note:</p><p className="text-muted-foreground">{waterStation.statusMessage}</p></div>}
                <p className="text-sm text-primary font-medium">Please rest assured, this will not affect your service. All delivery requests will be handled today by a partner station to ensure no disruption. We appreciate your understanding.</p>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                {stationOKImage && <div className="relative h-40 w-full overflow-hidden rounded-lg"><Image src={stationOKImage.imageUrl} alt="Water station operating normally" layout="fill" objectFit="contain" data-ai-hint={stationOKImage.imageHint} /></div>}
                <h3 className="font-semibold">All Systems Operational</h3>
                <p className="text-sm text-muted-foreground">Hi {userFirstName}, your assigned station, <span className="font-semibold">{waterStation?.name || 'N/A'}</span>, is fully operational. All systems are running smoothly, ensuring your water is safe, clean, and delivered on time. Thank you for your trust in River Business!</p>
              </div>
            )}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
