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
import { consumptionCharge, deliveriesInRange, litersInRange, manilaMonthLabel, manilaMonthRange, manilaParts, previousManilaMonth, roundMoney } from '@/lib/billing-period';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithProgress } from '@/lib/storage-utils';

import { OverviewTab } from './user-details/OverviewTab';
import { DeliveriesTab } from './user-details/DeliveriesTab';
import { BillingTab } from './user-details/BillingTab';
import { SanitationTab } from './user-details/SanitationTab';
import { CreateDeliveryDialog } from './user-details/CreateDeliveryDialog';
import { PaymentReviewDialog } from './user-details/PaymentReviewDialog';
import { ManualChargeDialog } from './user-details/ManualChargeDialog';
import { TopUpDialog } from './user-details/TopUpDialog';
import { CreateSanitationDialog } from './user-details/CreateSanitationDialog';
import { SanitationHistoryDialog } from './user-details/SanitationHistoryDialog';
import { ProofViewerDialog } from './user-details/ProofViewerDialog';
import { YearlyConsumptionDialog } from './user-details/YearlyConsumptionDialog';
import { BranchDeliveriesTab } from './user-details/BranchDeliveriesTab';
import { ChangePlanDialog } from './user-details/ChangePlanDialog';

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

    const consumedLitersThisMonth = useMemo(() => {
        if (!userDeliveriesData) return 0;
        const parts = manilaParts(new Date());
        const range = manilaMonthRange(parts.year, parts.monthIndex);
        return litersInRange(userDeliveriesData, range.start, range.end);
    }, [userDeliveriesData]);
    
    const consumptionComparison = useMemo(() => {
        if (!userDeliveriesData) return { percentageChange: 0, changeType: 'same' };
    
        const previous = previousManilaMonth(new Date());
        const consumedLitersLastMonth = litersInRange(userDeliveriesData, previous.start, previous.end);
    
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
    
        const nowParts = manilaParts(new Date());
        const monthsToBill = 1;
    
        let estimatedCost = 0;
        const userCreationDate = toSafeDate(user.createdAt);
        const createdParts = userCreationDate ? manilaParts(userCreationDate) : null;
        const isFirstMonth = createdParts ? createdParts.year === nowParts.year && createdParts.monthIndex === nowParts.monthIndex : false;
    
        if (isFirstMonth && user.customPlanDetails) {
            if (user.customPlanDetails.gallonPaymentType === 'One-Time') estimatedCost += user.customPlanDetails.gallonPrice || 0;
            if (user.customPlanDetails.dispenserPaymentType === 'One-Time') estimatedCost += user.customPlanDetails.dispenserPrice || 0;
        }
    
        let monthlyEquipmentCost = 0;
        if (user.customPlanDetails?.gallonPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
        if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
        
        estimatedCost += monthlyEquipmentCost * monthsToBill;
    
        if (user.plan?.isConsumptionBased) {
            const range = manilaMonthRange(nowParts.year, nowParts.monthIndex);
            estimatedCost += consumptionCharge(deliveriesInRange(userDeliveriesData, range.start, range.end), user.plan.price || 0);
        } else {
            estimatedCost += user.plan?.price || 0;
        }
    
        const pendingChargesTotal = (user.pendingCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        estimatedCost += pendingChargesTotal;
    
        const monthKey = `${nowParts.year}${String(nowParts.monthIndex + 1).padStart(2, '0')}`;
        return {
            id: `INV-EST-${user.id.substring(0, 5)}-${monthKey}`,
            date: new Date().toISOString(),
            description: `Estimated bill for ${manilaMonthLabel(nowParts.year, nowParts.monthIndex)}`,
            amount: roundMoney(estimatedCost),
            status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
        };
    }, [user, userDeliveriesData]);

    const handleAssignStation = async (stationId: string) => {
        if (!userDocRef) return;
        await updateDoc(userDocRef, { assignedWaterStationId: stationId });
        toast({ title: "Station Assigned" });
    };

    const handleAssignParent = async (parentId: string) => {
        if (!userDocRef) return;
        await updateDoc(userDocRef, { parentId: parentId });
        toast({ title: "Parent Account Assigned" });
    };

    const handleContractUpload = async () => {
        if (!contractFile || !auth?.currentUser || !storage || !userDocRef) return;
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
                <DialogContent className="rb-app flex h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-none bg-[#F5F5F7] p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] sm:rounded-[28px]">
                    <DialogHeader className="flex-row items-center gap-1 space-y-0 px-3 pb-2 pt-3 text-left">
                        <button type="button" aria-label="Back" onClick={() => onOpenChange(false)} className="grid h-9 w-9 place-items-center text-[22px]">‹</button>
                        <div>
                          <DialogTitle className="text-[17px] font-extrabold">{isParent ? 'Client' : user.businessName || 'Client'}</DialogTitle>
                          <DialogDescription className="sr-only">Client account</DialogDescription>
                        </div>
                    </DialogHeader>
                    <ScrollArea className="min-h-0 flex-1 px-4">
                        <Tabs defaultValue={initialTab || (isParent ? 'branch-deliveries' : 'overview')}>
                             <TabsList className="grid h-12 w-full grid-cols-4 rounded-[16px] bg-[#F4F4F6] p-1">
                                {isParent ? (
                                    <>
                                        <TabsTrigger value="overview" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Overview</TabsTrigger>
                                        <TabsTrigger value="branch-deliveries" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Deliveries</TabsTrigger>
                                        <TabsTrigger value="billing" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Billing</TabsTrigger>
                                    </>
                                ) : (
                                    <>
                                        <TabsTrigger value="overview" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Overview</TabsTrigger>
                                        <TabsTrigger value="deliveries" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Deliveries</TabsTrigger>
                                        <TabsTrigger value="billing" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Billing</TabsTrigger>
                                        <TabsTrigger value="sanitation" className="rounded-[12px] px-1 text-[12px] font-bold data-[state=active]:bg-white">Sanitation</TabsTrigger>
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
                                    onAssignParent={handleAssignParent}
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
                    <div className="sr-only">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
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
