
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useCollection,
  useDoc,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear, getMonth, subMonths } from 'date-fns';
import type { Delivery, WaterStation, AppUser, ComplianceReport, SanitationVisit, RefillRequest, Transaction } from '@/lib/types';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import styles from '@/components/dashboard/home-screen.module.css';
import { ProgressTrack, RbButton } from '@/components/river/ui';
import { formatSentAt, refillStep } from '@/lib/refill-display';
import { StatCards } from '@/components/dashboard/StatCards';
import { ConsumptionAnalytics } from '@/components/dashboard/ConsumptionAnalytics';
import { InfoCards } from '@/components/dashboard/InfoCards';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardDialogs } from '@/components/dashboard/DashboardDialogs';


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

export default function DashboardPage({ showDialogs = true }: { showDialogs?: boolean }) {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const isParent = user?.accountType === 'Parent';

  const deliveriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const collectionName = user.accountType === 'Parent' ? 'branchDeliveries' : 'deliveries';
    return query(collection(firestore, 'users', user.id, collectionName), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: deliveries, isLoading: areDeliveriesLoading } = useCollection<Delivery>(deliveriesQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !isParent || !user?.id) return null;
    return query(collection(firestore, 'users', user.id, 'transactions'), orderBy('date', 'desc'));
  }, [firestore, isParent, user?.id]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

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

  const { data: activeRefills } = useCollection<RefillRequest>(activeRefillQuery);
  const activeRefillRequest = useMemo(() => (activeRefills && activeRefills.length > 0 ? activeRefills[0] : null), [activeRefills]);
  
  const branchUsersQuery = useMemoFirebase(() => {
    if (!firestore || !isParent || !user?.id) return null;
    return query(collection(firestore, 'users'), where('parentId', '==', user.id));
  }, [firestore, isParent, user?.id]);
  const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);
  
  const parentCalculatedBalances = useMemo(() => {
    if (!isParent || !user || !deliveries) return { displayedCreditBalance: 0, displayedAvailableLiters: 0, totalConsumptionLiters: 0 };
    
    const totalCredits = (transactions || [])
        .filter(t => t.type === 'Credit')
        .reduce((sum, t) => sum + t.amountCredits, 0);
    
    const pricePerLiter = user.plan?.price || 1;

    const totalDebitAmount = (deliveries || []).reduce((sum, d) => {
        const amount = d.amount ?? (d.liters ?? containerToLiter(d.volumeContainers)) * pricePerLiter;
        return sum + amount;
    }, 0);
        
    const totalConsumptionLiters = (deliveries || []).reduce((sum, d) => {
        const liters = d.liters ?? containerToLiter(d.volumeContainers);
        return sum + liters;
    }, 0);

    const displayedCreditBalance = totalCredits - totalDebitAmount;
    
    const totalPotentialLiters = totalCredits > 0 ? totalCredits / pricePerLiter : 0;
    const displayedAvailableLiters = totalPotentialLiters - totalConsumptionLiters;

    return {
      displayedCreditBalance,
      displayedAvailableLiters: displayedAvailableLiters,
      totalConsumptionLiters: totalConsumptionLiters
    };

  }, [isParent, transactions, deliveries, user]);

  const handleDispatchDialogEvent = (eventName: string, detail?: any) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  if (isAuthLoading || isUserDocLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <div className={`${styles.screen} grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start lg:gap-6`}>
        <div className="lg:col-span-12">
          <DashboardHeader userName={user?.businessName} />
        </div>

        <div className="flex flex-col gap-3 lg:col-span-7">
          <RefillRequest
            active={activeRefillRequest}
            onSend={() => handleDispatchDialogEvent('request-asap-refill')}
          />

          <StatCards
              user={user}
              deliveries={deliveries}
              parentCalculatedBalances={parentCalculatedBalances}
              onConsumptionHistoryClick={() => handleDispatchDialogEvent('open-consumption-history')}
              onSaveLitersClick={() => handleDispatchDialogEvent('open-save-liters')}
              onUpdateScheduleClick={() => handleDispatchDialogEvent('open-update-schedule')}
              onRequestRefillClick={() => handleDispatchDialogEvent('open-request-refill')}
          />
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5">
            <ConsumptionAnalytics
                deliveries={deliveries}
                onHistoryClick={() => handleDispatchDialogEvent('open-delivery-history')}
                isParent={isParent}
                branches={branchUsers}
            />
            <InfoCards />
        </div>
      </div>

        {showDialogs ? (
          <DashboardDialogs
            user={user}
            authUser={authUser}
            firestore={firestore}
            isUserDocLoading={isUserDocLoading}
            userDocRef={userDocRef}
            deliveries={deliveries}
            waterStation={waterStation}
            complianceReports={complianceReports}
            complianceLoading={complianceLoading}
            sanitationVisits={sanitationVisits}
            sanitationLoading={sanitationLoading}
            activeRefillRequest={activeRefillRequest}
            branchUsers={branchUsers}
          />
        ) : null}
    </>
  );
}

function RefillRequest({
  active,
  onSend,
}: {
  active: RefillRequest | null;
  onSend: () => void;
}) {
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const finished = () => setSending(false);
    window.addEventListener('refill-request-finished', finished);
    return () => window.removeEventListener('refill-request-finished', finished);
  }, []);

  if (active) {
    return (
      <section className="rounded-[24px] bg-[#EEF2F7] px-5 pb-4 pt-5">
        <h2 className="text-[21px] font-extrabold leading-[1.2] tracking-[-0.025em]">Station notified</h2>
        <p className="mt-1 text-[14px] font-semibold text-[#8A8A94]">{formatSentAt(active.requestedAt)}</p>
        <ProgressTrack step={refillStep(active.status)} />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <RbButton
        size="lg"
        full
        disabled={sending}
        onClick={() => {
          setSending(true);
          onSend();
        }}
      >
        {sending ? 'Sending…' : 'Request refill'}
      </RbButton>
    </div>
  );
}
