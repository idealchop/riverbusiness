'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc, getDoc, query, increment, addDoc, DocumentReference, arrayUnion, Timestamp, where, deleteField, setDoc, deleteDoc, orderBy, writeBatch } from 'firebase/firestore';
import { AppUser, Delivery, WaterStation, Payment, SanitationVisit, RefillRequest, RefillRequestStatus, Notification, DispenserReport, Transaction, TopUpRequest, ManualCharge } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, getYear, getMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithProgress } from '@/lib/storage-utils';

import { OverviewTab } from './OverviewTab';
import { DeliveriesTab } from './DeliveriesTab';
import { BillingTab } from './BillingTab';
import { SanitationTab } from './SanitationTab';
import { CreateDeliveryDialog } from './CreateDeliveryDialog';
import { PaymentReviewDialog } from './PaymentReviewDialog';
import { ManualChargeDialog } from './ManualChargeDialog';
import { TopUpDialog } from './TopUpDialog';
import { CreateSanitationDialog } from './CreateSanitationDialog';
import { SanitationHistoryDialog } from './SanitationHistoryDialog';
import { ProofViewerDialog } from './ProofViewerDialog';
import { YearlyConsumptionDialog } from './YearlyConsumptionDialog';
import { BranchDeliveriesTab } from './BranchDeliveriesTab';
import { ChangePlanDialog } from './ChangePlanDialog';
import { createClientNotification } from '@/lib/notifications';

const containerToLiter = (containers: number) => (containers || 0) * 19.5;
const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
};

interface UserDetailsDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: AppUser;
    setSelectedUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
    isAdmin: boolean;
    allUsers: AppUser[];
    waterStations: WaterStation[];
    initialTab?: string;
}

export function UserDetailsDialog({ isOpen, onOpenChange, user, setSelectedUser, isAdmin, allUsers, waterStations, initialTab }: UserDetailsDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();
    
    const [isCreateDeliveryOpen, setIsCreateDeliveryOpen] = useState(false);
    const [deliveryToEdit, setDeliveryToEdit] = useState<Delivery | null>(null);
    const [isManualChargeOpen, setIsManualChargeOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isCreateSanitationOpen, setIsCreateSanitationOpen] = useState(false);
    const [isSanitationHistoryOpen, setIsSanitationHistoryOpen] = useState(false);
    const [selectedSanitationVisit, setSelectedSanitationVisit] = useState<SanitationVisit | null>(null);
    const [visitToEdit, setVisitToEdit] = useState<SanitationVisit | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [isUploadingContract, setIsUploadingContract] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [proofToViewUrl, setProofToViewUrl] = useState<string | null>(null);
    const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState(false);
    const [paymentToReview, setPaymentToReview] = useState<Payment | null>(null);
    const [isYearlyConsumptionOpen, setIsYearlyConsumptionOpen] = useState(false);
    const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);

    const userDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', user.id) : null, [firestore, user.id]);
    const userDeliveriesQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'deliveries'), orderBy('date', 'desc')) : null, [userDocRef]);
    const { data: userDeliveriesData } = useCollection<Delivery>(userDeliveriesQuery);
    const userPaymentsQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'payments'), orderBy('date', 'desc')) : null, [userDocRef]);
    const { data: userPaymentsData } = useCollection<Payment>(userPaymentsQuery);
    const sanitationVisitsQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'sanitationVisits'), orderBy('scheduledDate', 'desc')) : null, [userDocRef]);
    const { data: sanitationVisitsData } = useCollection<SanitationVisit>(sanitationVisitsQuery);
    const topUpRequestsQuery = useMemoFirebase(() => userDocRef ? query(collection(userDocRef, 'topUpRequests'), orderBy('requestedAt', 'desc')) : null, [userDocRef]);
    const { data: topUpRequestsData } = useCollection<TopUpRequest>(topUpRequestsQuery);

     useEffect(() => {
        const handleOpenChangePlan = () => setIsChangePlanOpen(true);
        window.addEventListener('admin-open-change-plan-dialog', handleOpenChangePlan);
        return () => {
            window.removeEventListener('admin-open-change-plan-dialog', handleOpenChangePlan);
        };
    }, []);

    const consumedLitersThisMonth = useMemo(() => {
        if (!userDeliveriesData) return 0;
        const now = new Date();
        const cycleStart = startOfMonth(now);
        const cycleEnd = endOfMonth(now);
        
        const deliveriesThisCycle = userDeliveriesData.filter(d => {
            const deliveryDate = toSafeDate(d.date);
            return deliveryDate ? isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd }) : false;
        });
        return deliveriesThisCycle.reduce((acc, d) => acc + containerToLiter(d.volumeContainers), 0);
    }, [userDeliveriesData]);
    
    const consumptionComparison = useMemo(() => {
        if (!userDeliveriesData) return { percentageChange: 0, changeType: 'same' };
    
        const now = new Date();
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
        const consumedLitersLastMonth = userDeliveriesData
            .filter(d => {
                const deliveryDate = toSafeDate(d.date);
                return deliveryDate ? isWithinInterval(deliveryDate, { start: lastMonthStart, end: lastMonthEnd }) : false;
            })
            .reduce((sum, d) => sum + containerToLiter(d.volumeContainers), 0);
    
        if (consumedLitersLastMonth === 0) {
            return { percentageChange: consumedLitersThisMonth > 0 ? 100 : 0, changeType: consumedLitersThisMonth > 0 ? 'increase' : 'same' };
        }
    
        const percentageChange = ((consumedLitersThisMonth - consumedLitersLastMonth) / consumedLitersLastMonth) * 100;
    
        return {
            percentageChange: Math.abs(percentageChange),
            changeType: percentageChange > 0 ? 'increase' : (percentageChange < 0 ? 'decrease' : 'same'),
        };
      }, [userDeliveriesData, consumedLitersThisMonth]);

    const currentMonthInvoice = useMemo(() => {
        if (!user || !userDeliveriesData) return null;
    
        const now = new Date();
        const monthsToBill = 1;
    
        let estimatedCost = 0;
        const userCreationDate = toSafeDate(user.createdAt);
        const isFirstMonth = userCreationDate ? getYear(userCreationDate) === getYear(now) && getMonth(userCreationDate) === getMonth(now) : false;
    
        if (isFirstMonth && user.customPlanDetails) {
            if (user.customPlanDetails.gallonPaymentType === 'One-Time') estimatedCost += user.customPlanDetails.gallonPrice || 0;
            if (user.customPlanDetails.dispenserPaymentType === 'One-Time') estimatedCost += user.customPlanDetails.dispenserPrice || 0;
        }
    
        let monthlyEquipmentCost = 0;
        if (user.customPlanDetails?.gallonPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
        if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
        
        estimatedCost += monthlyEquipmentCost * monthsToBill;
    
        if (user.plan?.isConsumptionBased) {
            estimatedCost += consumedLitersThisMonth * (user.plan.price || 0);
        } else {
            estimatedCost += user.plan?.price || 0;
        }
    
        const pendingChargesTotal = (user.pendingCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        estimatedCost += pendingChargesTotal;
    
        return {
            id: `INV-EST-${user.id.substring(0, 5)}-${format(now, 'yyyyMM')}`,
            date: new Date().toISOString(),
            description: `Estimated bill for ${format(now, 'MMMM yyyy')}`,
            amount: estimatedCost,
            status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
        };
    }, [user, userDeliveriesData, consumedLitersThisMonth]);

    const handleAssignStation = async (stationId: string) => {
        if (!userDocRef) return;
        await updateDoc(userDocRef, { assignedWaterStationId: stationId });
        toast({ title: "Station Assigned" });
    };

    const handleContractUpload = async () => {
        if (!contractFile || !auth?.currentUser || !storage || !userDocRef || !firestore) return;
        setIsUploadingContract(true);
        setUploadProgress(0);
        const filePath = `userContracts/${user.id}/${Date.now()}-${contractFile.name}`;
        try {
            const downloadURL = await uploadFileWithProgress(storage, auth, filePath, contractFile, {}, setUploadProgress);

            await updateDoc(userDocRef, {
                currentContractUrl: downloadURL,
                contractUploadedDate: serverTimestamp(),
                contractStatus: "Active",
            });
            
            toast({ title: "Contract Uploaded", description: "The user's contract has been updated." });
            
            await createClientNotification(firestore, user.id, {
                type: 'general',
                title: 'New Contract Uploaded',
                description: 'A new contract has been added to your account by an admin.',
                data: { userId: user.id }
            });
            await createClientNotification(firestore, auth.currentUser.uid, {
                type: 'general',
                title: 'Contract Added',
                description: `You have successfully added a contract for ${user.businessName}.`,
                data: { userId: user.id }
            });

        } catch (error) {
            console.error("Contract upload failed:", error)
            toast({ variant: 'destructive', title: "Upload Failed" });
        } finally {
            setIsUploadingContract(false);
            setContractFile(null);
            setUploadProgress(0);
        }
    };
    
    const isParent = user.accountType === 'Parent';
    
    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>User Account Management</DialogTitle>
                        <DialogDescription>View user details and perform administrative actions.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 min-h-0">
                        <Tabs defaultValue={initialTab || (isParent ? 'branch-deliveries' : 'overview')}>
                             <TabsList>
                                {isParent ? (
                                    <>
                                        <TabsTrigger value="overview">Parent Overview</TabsTrigger>
                                        <TabsTrigger value="branch-deliveries">Branch Deliveries</TabsTrigger>
                                        <TabsTrigger value="billing">Top-Ups</TabsTrigger>
                                    </>
                                ) : (
                                    <>
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                                        <TabsTrigger value="billing">Billing</TabsTrigger>
                                        <TabsTrigger value="sanitation">Sanitation</TabsTrigger>
                                    </>
                                )}
                            </TabsList>
                            <TabsContent value="overview" className="py-6">
                                <OverviewTab
                                    user={user}
                                    allUsers={allUsers}
                                    waterStations={waterStations}
                                    consumedLitersThisMonth={consumedLitersThisMonth}
                                    consumptionComparison={consumptionComparison}
                                    currentMonthInvoice={currentMonthInvoice}
                                    contractFile={contractFile}
                                    isUploadingContract={isUploadingContract}
                                    uploadProgress={uploadProgress}
                                    onAssignStation={handleAssignStation}
                                    onContractFileChange={setContractFile}
                                    onContractUpload={handleContractUpload}
                                    onSetIsYearlyConsumptionOpen={setIsYearlyConsumptionOpen}
                                    onSetIsChangePlanOpen={setIsChangePlanOpen}
                                />
                            </TabsContent>
                            <TabsContent value="deliveries" className="py-6">
                                <DeliveriesTab
                                    userDeliveriesData={userDeliveriesData}
                                    onSetDeliveryToEdit={setDeliveryToEdit}
                                    onSetIsCreateDeliveryOpen={setIsCreateDeliveryOpen}
                                    onSetProofToViewUrl={setProofToViewUrl}
                                />
                            </TabsContent>
                             <TabsContent value="branch-deliveries" className="py-6">
                                <BranchDeliveriesTab 
                                    user={user} 
                                    onSetProofToViewUrl={setProofToViewUrl} 
                                    allUsers={allUsers}
                                />
                            </TabsContent>
                            <TabsContent value="billing" className="py-6">
                                <BillingTab
                                    user={user}
                                    userPaymentsData={userPaymentsData}
                                    currentMonthInvoice={currentMonthInvoice}
                                    onSetIsManualChargeOpen={setIsManualChargeOpen}
                                    onSetIsTopUpOpen={setIsTopUpOpen}
                                    onSetPaymentToReview={setPaymentToReview}
                                    onSetIsPaymentReviewOpen={setIsPaymentReviewOpen}
                                />
                            </TabsContent>
                            <TabsContent value="sanitation" className="py-6">
                               <SanitationTab
                                    sanitationVisitsData={sanitationVisitsData}
                                    onSetSelectedSanitationVisit={setSelectedSanitationVisit}
                                    onSetIsSanitationHistoryOpen={setIsSanitationHistoryOpen}
                                    onSetIsCreateSanitationOpen={setIsCreateSanitationOpen}
                                    onSetVisitToEdit={setVisitToEdit}
                               />
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                    <DialogFooter className="border-t pt-4 -mb-2 -mx-6 px-6 pb-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateDeliveryDialog
                isOpen={isCreateDeliveryOpen}
                onOpenChange={setIsCreateDeliveryOpen}
                deliveryToEdit={deliveryToEdit}
                user={user}
            />
            <PaymentReviewDialog
                isOpen={isPaymentReviewOpen}
                onOpenChange={setIsPaymentReviewOpen}
                paymentToReview={paymentToReview}
                userDocRef={userDocRef}
                user={user}
            />
            <ManualChargeDialog
                isOpen={isManualChargeOpen}
                onOpenChange={setIsManualChargeOpen}
                userDocRef={userDocRef}
            />
            <TopUpDialog
                isOpen={isTopUpOpen}
                onOpenChange={setIsTopUpOpen}
                userDocRef={userDocRef}
                user={user}
            />
            <CreateSanitationDialog
                isOpen={isCreateSanitationOpen}
                onOpenChange={(open) => {
                    if (!open) setVisitToEdit(null);
                    setIsCreateSanitationOpen(open);
                }}
                userDocRef={userDocRef}
                user={user}
                visitToEdit={visitToEdit}
                setVisitToEdit={setVisitToEdit}
            />
            <SanitationHistoryDialog
                isOpen={isSanitationHistoryOpen}
                onOpenChange={setIsSanitationHistoryOpen}
                visit={selectedSanitationVisit}
                isAdmin={isAdmin}
            />
            <ProofViewerDialog
                isOpen={!!proofToViewUrl}
                onOpenChange={() => setProofToViewUrl(null)}
                proofUrl={proofToViewUrl}
            />
            <YearlyConsumptionDialog
                isOpen={isYearlyConsumptionOpen}
                onOpenChange={setIsYearlyConsumptionOpen}
                deliveries={userDeliveriesData}
                user={user}
            />
            <ChangePlanDialog
                isOpen={isChangePlanOpen}
                onOpenChange={setIsChangePlanOpen}
                user={user}
            />
        </>
    );
}
