

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Users,
  AlertTriangle,
  Building,
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
} from '@/firebase';
import {
  doc,
  collection,
  serverTimestamp,
  query,
  where,
  Timestamp,
  arrayUnion,
  addDoc,
  collectionGroup,
  orderBy,
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
import { WelcomeDialog } from '@/components/dashboard/WelcomeDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';


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

  const isParent = user?.accountType === 'Parent';

  // This query is now used for ALL user types. 
  // For parents, it will fetch the copies of branch deliveries from their own subcollection.
  const deliveriesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'users', user.id, 'deliveries'), orderBy('date', 'desc')) : null),
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
  const hasPendingRefill = useMemo(() => !!activeRefillRequest, [activeRefillRequest]);
  const [isRefillRequesting, setIsRefillRequesting] = useState(false);
  const [isSubmitScheduledRefill, setIsSubmitScheduledRefill] = useState(false);

  // --- START PARENT ACCOUNT LOGIC (DATA FOR DISPLAY PURPOSES) ---
  const branchUsersQuery = useMemoFirebase(() => {
    if (!firestore || !isParent || !user?.id) return null;
    return query(collection(firestore, 'users'), where('parentId', '==', user.id));
  }, [firestore, isParent, user?.id]);
  const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);
  
  const totalBranchConsumptionLiters = useMemo(() => {
    if (!isParent || !deliveries) return 0;
    return deliveries.reduce((total, delivery) => total + containerToLiter(delivery.volumeContainers), 0);
  }, [isParent, deliveries]);
  // --- END PARENT ACCOUNT LOGIC ---


  const openDialog = (dialog: keyof typeof dialogState) => {
    if (dialog === 'requestRefill' && hasPendingRefill) {
      setDialogState((prev) => ({ ...prev, refillStatus: true }));
    } else {
      setDialogState((prev) => ({ ...prev, [dialog]: true }));
    }
  };
  const closeDialog = (dialog: keyof typeof dialogState) => setDialogState((prev) => ({ ...prev, [dialog]: false }));
  
  const handleOneClickRefill = useCallback(async () => {
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
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: 'There was an issue sending your request. Please try again.',
      });
    } finally {
      setIsRefillRequesting(false);
    }
  }, [user, firestore, authUser, hasPendingRefill, toast]);
  
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
  }, [handleOneClickRefill]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (user && !isUserDocLoading && !welcomeShown) {
      setDialogState((prev) => ({ ...prev, welcome: true }));
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

  const stationOKImage = PlaceHolderImages.find(p => p.id === 'station-operational');
  const userFirstName = user?.name.split(' ')[0] || 'there';

  if (isAuthLoading || isUserDocLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8">
        <WelcomeDialog 
            isOpen={dialogState.welcome}
            onOpenChange={() => closeDialog('welcome')}
            user={user}
        />

        <DashboardHeader
          greeting={greeting}
          userName={user?.businessName}
          isRefillRequesting={isRefillRequesting}
          onRefillRequest={handleOneClickRefill}
          onComplianceClick={() => openDialog('compliance')}
          hasPendingRefill={hasPendingRefill}
          onPartnerNoticeClick={() => openDialog('partnerNotice')}
          stationStatus={waterStation?.status}
        />
        
        <StatCards
            user={user}
            deliveries={deliveries}
            totalBranchConsumptionLiters={totalBranchConsumptionLiters}
            onConsumptionHistoryClick={() => openDialog('consumptionHistory')}
            onSaveLitersClick={() => openDialog('saveLiters')}
            onUpdateScheduleClick={() => openDialog('updateSchedule')}
            onRequestRefillClick={() => openDialog('requestRefill')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ConsumptionAnalytics
                deliveries={deliveries}
                onHistoryClick={() => openDialog('deliveryHistory')}
                isParent={isParent}
                branches={branchUsers}
            />
          </div>
          <div className="lg:col-span-4">
            <InfoCards />
          </div>
        </div>

        {/* --- DIALOGS --- */}
        <DeliveryHistoryDialog
            isOpen={dialogState.deliveryHistory}
            onOpenChange={() => closeDialog('deliveryHistory')}
            deliveries={deliveries}
            sanitationVisits={sanitationVisits}
            complianceReports={complianceReports}
            user={user}
            onViewProof={setSelectedProofUrl}
            isParent={isParent}
            branches={branchUsers}
        />
        <ConsumptionHistoryDialog
            isOpen={dialogState.consumptionHistory}
            onOpenChange={() => closeDialog('consumptionHistory')}
            deliveries={deliveries}
            user={user}
            branches={branchUsers}
            isParent={isParent}
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
        <Dialog open={dialogState.partnerNotice} onOpenChange={() => closeDialog('partnerNotice')}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {waterStation?.status === 'Under Maintenance' ? (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        Partner Station Notice
                    </DialogTitle>
                    <DialogDescription>
                        Updates regarding your assigned water refilling station.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {waterStation?.status === 'Under Maintenance' ? (
                        <div className="space-y-4">
                            {stationOKImage && (
                                <div className="relative h-40 w-full overflow-hidden rounded-lg">
                                     <Image src={stationOKImage.imageUrl} alt="Water station under maintenance" layout="fill" objectFit="contain" className="opacity-50 grayscale" data-ai-hint="water station" />
                                </div>
                            )}
                            <h3 className="font-semibold">Station is Under Maintenance</h3>
                            <p className="text-sm text-muted-foreground">
                                We're currently performing essential maintenance at your assigned station,{' '}
                                <span className="font-semibold">{waterStation.name}</span>, to ensure our high standards of quality.
                            </p>
                            {waterStation.statusMessage && (
                                <div className="p-3 bg-muted rounded-md text-sm">
                                    <p className="font-semibold">Admin Note:</p>
                                    <p className="text-muted-foreground">{waterStation.statusMessage}</p>
                                </div>
                            )}
                            <p className="text-sm text-primary font-medium">
                                Please rest assured, this will not affect your service. All delivery requests will be handled today by a partner station to ensure no disruption. We appreciate your understanding.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 text-center">
                            {stationOKImage && (
                                <div className="relative h-40 w-full overflow-hidden rounded-lg">
                                    <Image src={stationOKImage.imageUrl} alt="Water station operating normally" layout="fill" objectFit="contain" data-ai-hint={stationOKImage.imageHint} />
                                </div>
                            )}
                            <h3 className="font-semibold">All Systems Operational</h3>
                            <p className="text-sm text-muted-foreground">
                                Hi {userFirstName}, your assigned station, <span className="font-semibold">{waterStation?.name || 'N/A'}</span>, is fully operational.
                                All systems are running smoothly, ensuring your water is safe, clean, and delivered on time. Thank you for your trust in River Business!
                            </p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
