
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  LifeBuoy,
  Droplet,
  Truck,
  MessageSquare,
  Waves,
  Droplets,
  History,
  Star,
  Send,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  CheckCircle,
  Clock,
  Info,
  PackageCheck,
  Package,
  Lightbulb,
  Gift,
  ExternalLink,
  MapPin,
  FileText,
  Eye,
  Download,
  Calendar as CalendarIcon,
  Edit,
  ShieldCheck,
  FileHeart,
  Shield,
  Save,
  Wrench,
  PlusCircle,
  BellRing,
  Hourglass,
  AlertCircle,
  RefreshCw,
  Box,
  Settings,
  FileX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type {
  Delivery,
  WaterStation,
  AppUser,
  ComplianceReport,
  SanitationVisit,
  RefillRequest,
  RefillRequestStatus,
  StatusHistoryEntry,
  Notification,
} from '@/lib/types';
import {
  useCollection,
  useDoc,
  useFirestore,
  useUser,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase';
import {
  doc,
  collection,
  serverTimestamp,
  query,
  where,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';

import { TooltipProvider } from '@/components/ui/tooltip';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { ConsumptionAnalytics } from '@/components/dashboard/ConsumptionAnalytics';
import { InfoCards } from '@/components/dashboard/InfoCards';
import { DeliveryHistoryDialog } from '@/components/dashboard/dialogs/DeliveryHistoryDialog';
import { ConsumptionHistoryDialog } from '@/components/dashboard/dialogs/ConsumptionHistoryDialog';
import { ProofViewerDialog } from '@/components/dashboard/dialogs/ProofViewerDialog';
import { UpdateScheduleDialog } from '@/components/dashboard/dialogs/UpdateScheduleDialog';
import { RequestRefillDialog } from '@/components/dashboard/dialogs/RequestRefillDialog';
import { SaveLitersDialog } from '@/components/dashboard/dialogs/SaveLitersDialog';
import { ComplianceDialog } from '@/components/dashboard/dialogs/ComplianceDialog';
import { AttachmentViewerDialog } from '@/components/dashboard/dialogs/AttachmentViewerDialog';
import { RefillStatusDialog } from '@/components/dashboard/dialogs/RefillStatusDialog';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

export default function DashboardPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const [greeting, setGreeting] = useState('');
  const [isRefillRequesting, setIsRefillRequesting] = useState(false);


  const [dialogState, setDialogState] = useState({
    deliveryHistory: false,
    consumptionHistory: false,
    updateSchedule: false,
    requestRefill: false,
    saveLiters: false,
    compliance: false,
    refillStatus: false,
  });

  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [attachmentToView, setAttachmentToView] = useState<string | null>(null);

  const deliveriesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users', user.id, 'deliveries') : null),
    [firestore, user]
  );
  const { data: deliveries, isLoading: areDeliveriesLoading } = useCollection<Delivery>(deliveriesQuery);

  const stationDocRef = useMemoFirebase(
    () => (firestore && user?.assignedWaterStationId ? doc(firestore, 'waterStations', user.assignedWaterStationId) : null),
    [firestore, user]
  );
  const { data: waterStation } = useDoc<WaterStation>(stationDocRef);

  const complianceReportsQuery = useMemoFirebase(
    () => (firestore && user?.assignedWaterStationId ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports') : null),
    [firestore, user?.assignedWaterStationId]
  );
  const { data: complianceReports, isLoading: complianceLoading } = useCollection<ComplianceReport>(complianceReportsQuery);

  const sanitationVisitsQuery = useMemoFirebase(
    () => (firestore && authUser ? collection(firestore, 'users', authUser.uid, 'sanitationVisits') : null),
    [firestore, authUser]
  );
  const { data: sanitationVisits, isLoading: sanitationLoading } = useCollection<SanitationVisit>(sanitationVisitsQuery);

  const activeRefillQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(
      collection(firestore, 'users', authUser.uid, 'refillRequests'),
      where('status', 'in', ['Requested', 'In Production', 'Out for Delivery'])
    );
  }, [firestore, authUser]);

  const { data: activeRefills, isLoading: isRefillLoading } = useCollection<RefillRequest>(activeRefillQuery);
  const activeRefillRequest = useMemo(() => (activeRefills && activeRefills.length > 0 ? activeRefills[0] : null), [activeRefills]);
  const hasPendingRefill = useMemo(() => !isRefillLoading && activeRefills && activeRefills.length > 0, [activeRefills, isRefillLoading]);
  
  const [isSubmitScheduledRefill, setIsSubmitScheduledRefill] = useState(false);


  const openDialog = (dialog: keyof typeof dialogState) => {
    if (dialog === 'requestRefill' && hasPendingRefill) {
      setDialogState((prev) => ({ ...prev, refillStatus: true }));
    } else {
      setDialogState((prev) => ({ ...prev, [dialog]: true }));
    }
  };
  const closeDialog = (dialog: keyof typeof dialogState) => setDialogState((prev) => ({ ...prev, [dialog]: false }));

  const handleOneClickRefill = async () => {
      if (hasPendingRefill) {
          openDialog('refillStatus');
          return;
      }
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
          statusHistory: [{ status: 'Requested', timestamp: new Date().toISOString() as any }],
          requestedDate: new Date().toISOString(), // Use current date for ASAP
      };
  
      try {
          const refillRequestsCollection = collection(firestore, 'users', authUser.uid, 'refillRequests');
          const newDocRef = await addDocumentNonBlocking(refillRequestsCollection, newRequestData);
  
          await createNotification(authUser.uid, {
              type: 'delivery',
              title: 'ASAP Refill Request Sent!',
              description: `Your immediate refill request has been sent.`,
              data: { requestId: newDocRef.id },
          });

          const userName = user?.name.split(' ')[0] || 'friend';
          toast({
              title: 'Request Sent!',
              description: `Salamat, ${userName}! Papunta na ang aming team para sa iyong water refill.`,
          });
  
      } catch (error) {
          toast({
              variant: 'destructive',
              title: 'Request Failed',
              description: 'There was an issue sending your request. Please try again.',
          });
      } finally {
          setIsRefillRequesting(false);
      }
  };


  useEffect(() => {
    const handleOpenDelivery = () => openDialog('deliveryHistory');
    const handleOpenCompliance = (event: Event) => {
        const customEvent = event as CustomEvent;
        openDialog('compliance');
    }
    
    // Listener for mobile button
    const handleMobileRefill = () => handleOneClickRefill();

    window.addEventListener('open-delivery-history', handleOpenDelivery);
    window.addEventListener('open-compliance-dialog', handleOpenCompliance);
    window.addEventListener('request-asap-refill', handleMobileRefill);

    return () => {
        window.removeEventListener('open-delivery-history', handleOpenDelivery);
        window.removeEventListener('open-compliance-dialog', handleOpenCompliance);
        window.removeEventListener('request-asap-refill', handleMobileRefill);
    };
  }, [hasPendingRefill, user, authUser, firestore]); // Add dependencies to ensure the latest state is used

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const createNotification = async (userId: string, notification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) => {
    if (!firestore) return;
    const notificationsCol = collection(firestore, 'users', userId, 'notifications');
    const newNotification: Partial<Notification> = {
        ...notification,
        userId,
        date: serverTimestamp(),
        isRead: false
    };
    await addDocumentNonBlocking(notificationsCol, newNotification);
  };
  
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
      statusHistory: [{ status: 'Requested', timestamp: new Date().toISOString() as any }],
      volumeContainers: containers,
      requestedDate: date.toISOString(),
    };

    try {
      const refillRequestsCollection = collection(firestore, 'users', authUser.uid, 'refillRequests');
      const newDocRef = await addDocumentNonBlocking(refillRequestsCollection, newRequestData);
      
      await createNotification(authUser.uid, {
        type: 'delivery',
        title: 'Refill Request Sent',
        description: `Request for ${containers} containers on ${date.toLocaleDateString()} sent.`,
        data: { requestId: newDocRef.id },
      });

      toast({
        title: 'Refill Request Sent!',
        description: `Thank you, ${user.name}! You can track the progress of your request.`,
      });
      closeDialog('requestRefill');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: 'There was an issue sending your request. Please try again.',
      });
    } finally {
      setIsSubmitScheduledRefill(false);
    }
  };

  if (isAuthLoading || isUserDocLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8">
        <DashboardHeader
          greeting={greeting}
          userName={user?.businessName}
          isRefillRequesting={isRefillRequesting}
          onRefillRequest={handleOneClickRefill}
          onComplianceClick={() => openDialog('compliance')}
          hasPendingRefill={hasPendingRefill}
        />
        
        <StatCards
            user={user}
            deliveries={deliveries}
            onConsumptionHistoryClick={() => openDialog('consumptionHistory')}
            onSaveLitersClick={() => openDialog('saveLiters')}
            onUpdateScheduleClick={() => openDialog('updateSchedule')}
            onRequestRefillClick={() => openDialog('requestRefill')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ConsumptionAnalytics
            deliveries={deliveries}
            onHistoryClick={() => openDialog('deliveryHistory')}
          />
          <InfoCards />
        </div>

        {/* --- DIALOGS --- */}
        <DeliveryHistoryDialog
            isOpen={dialogState.deliveryHistory}
            onOpenChange={() => closeDialog('deliveryHistory')}
            deliveries={deliveries}
            user={user}
            onViewProof={setSelectedProofUrl}
        />
        <ConsumptionHistoryDialog
            isOpen={dialogState.consumptionHistory}
            onOpenChange={() => closeDialog('consumptionHistory')}
            deliveries={deliveries}
        />
        <ProofViewerDialog
            isOpen={!!selectedProofUrl}
            onOpenChange={() => setSelectedProofUrl(null)}
            proofUrl={selectedProofUrl}
        />
        <UpdateScheduleDialog
            isOpen={dialogState.updateSchedule}
            onOpenChange={() => closeDialog('updateSchedule')}
            userDocRef={userDocRef}
            customPlanDetails={user?.customPlanDetails}
        />
        <RequestRefillDialog
            isOpen={dialogState.requestRefill}
            onOpenChange={() => closeDialog('requestRefill')}
            onSubmit={handleScheduledRefill}
            isSubmitting={isSubmitScheduledRefill}
        />
        <SaveLitersDialog
            isOpen={dialogState.saveLiters}
            onOpenChange={() => closeDialog('saveLiters')}
            user={user}
            deliveries={deliveries}
        />
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
        <AttachmentViewerDialog
            isOpen={!!attachmentToView}
            onOpenChange={() => setAttachmentToView(null)}
            attachmentUrl={attachmentToView}
        />
        <RefillStatusDialog
            isOpen={dialogState.refillStatus}
            onOpenChange={() => closeDialog('refillStatus')}
            activeRefillRequest={activeRefillRequest}
        />

      </div>
    </TooltipProvider>
  );
}
