
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useCollection,
  useDoc,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import type { Delivery, WaterStation, AppUser, ComplianceReport, SanitationVisit, RefillRequest } from '@/lib/types';
import { TooltipProvider } from '@/components/ui/tooltip';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { ConsumptionAnalytics } from '@/components/dashboard/ConsumptionAnalytics';
import { InfoCards } from '@/components/dashboard/InfoCards';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardDialogs } from '@/components/dashboard/DashboardDialogs';


const containerToLiter = (containers: number) => (containers || 0) * 19.5;

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  const [greeting, setGreeting] = useState('');

  const isParent = user?.accountType === 'Parent';

  const deliveriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const collectionName = user.accountType === 'Parent' ? 'branchDeliveries' : 'deliveries';
    return query(collection(firestore, 'users', user.id, collectionName), orderBy('date', 'desc'));
  }, [firestore, user]);

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

  const { data: activeRefills } = useCollection<RefillRequest>(activeRefillQuery);
  const activeRefillRequest = useMemo(() => (activeRefills && activeRefills.length > 0 ? activeRefills[0] : null), [activeRefills]);
  const hasPendingRefill = useMemo(() => !!activeRefillRequest, [activeRefillRequest]);
  
  const branchUsersQuery = useMemoFirebase(() => {
    if (!firestore || !isParent || !user?.id) return null;
    return query(collection(firestore, 'users'), where('parentId', '==', user.id));
  }, [firestore, isParent, user?.id]);
  const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);
  
  const totalBranchConsumptionLiters = useMemo(() => {
    if (!isParent || !deliveries) return 0;
    return deliveries.reduce((total, delivery) => total + (delivery.liters || containerToLiter(delivery.volumeContainers)), 0);
  }, [isParent, deliveries]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleDispatchDialogEvent = (eventName: string, detail?: any) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
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
          hasPendingRefill={hasPendingRefill}
          stationStatus={waterStation?.status}
          onRefillRequest={() => handleDispatchDialogEvent(hasPendingRefill ? 'open-refill-status' : 'request-asap-refill')}
          onComplianceClick={() => handleDispatchDialogEvent('open-compliance')}
          onPartnerNoticeClick={() => handleDispatchDialogEvent('open-partner-notice')}
        />
        
        <StatCards
            user={user}
            deliveries={deliveries}
            totalBranchConsumptionLiters={totalBranchConsumptionLiters}
            onConsumptionHistoryClick={() => handleDispatchDialogEvent('open-consumption-history')}
            onSaveLitersClick={() => handleDispatchDialogEvent('open-save-liters')}
            onUpdateScheduleClick={() => handleDispatchDialogEvent('open-update-schedule')}
            onRequestRefillClick={() => handleDispatchDialogEvent('open-request-refill')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ConsumptionAnalytics
                deliveries={deliveries}
                onHistoryClick={() => handleDispatchDialogEvent('open-delivery-history')}
                isParent={isParent}
                branches={branchUsers}
            />
          </div>
          <div className="lg:col-span-4">
            <InfoCards />
          </div>
        </div>

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
      </div>
    </TooltipProvider>
  );
}
