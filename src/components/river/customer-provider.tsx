'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, orderBy, query, where, limit } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { AppUser, ComplianceReport, Delivery, Payment, RefillRequest, SanitationVisit, Transaction, WaterStation } from '@/lib/types';
import { currentCycleEstimate } from '@/lib/current-estimate';
import { readJson, writeJson } from '@/lib/screen-cache';
import { toDate } from '@/lib/refill-display';
import { DashboardDialogs } from '@/components/dashboard/DashboardDialogs';

const CACHE_KEY = 'rb-customer-view';

type CacheShape = {
  user: AppUser;
  deliveries: Delivery[];
  payments: Payment[];
  activeRefill: RefillRequest | null;
};

type CustomerWaterValue = {
  user: AppUser | null;
  deliveries: Delivery[] | null;
  payments: Payment[] | null;
  activeRefill: RefillRequest | null;
  loading: boolean;
  estimatedAmount: number;
  usedLiters: number;
  parentBalance: number | null;
  sendingRefill: boolean;
  setSendingRefill: (value: boolean) => void;
};

const CustomerWaterContext = createContext<CustomerWaterValue | null>(null);

export function useCustomerWater() {
  const value = useContext(CustomerWaterContext);
  if (!value) throw new Error('useCustomerWater must be used inside CustomerProvider');
  return value;
}

export function CustomerProvider({
  authUser,
  children,
}: {
  authUser: { uid: string } | null;
  children: React.ReactNode;
}) {
  const firestore = useFirestore();
  const [cached, setCached] = useState<CacheShape | null>(null);
  const [sendingRefill, setSendingRefill] = useState(false);

  useEffect(() => {
    setCached(readJson<CacheShape>(CACHE_KEY));
  }, []);

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser],
  );
  const { data: liveUser, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);
  const user = liveUser ?? cached?.user ?? null;

  const isParent = user?.accountType === 'Parent';
  const deliveriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const collectionName = user.accountType === 'Parent' ? 'branchDeliveries' : 'deliveries';
    return query(collection(firestore, 'users', user.id, collectionName), orderBy('date', 'desc'));
  }, [firestore, user]);
  const { data: liveDeliveries, isLoading: deliveriesLoading } = useCollection<Delivery>(deliveriesQuery);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'users', authUser.uid, 'payments'), orderBy('date', 'desc'), limit(80));
  }, [firestore, authUser]);
  const { data: livePayments } = useCollection<Payment>(paymentsQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !isParent || !user?.id) return null;
    return query(collection(firestore, 'users', user.id, 'transactions'), orderBy('date', 'desc'));
  }, [firestore, isParent, user?.id]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const activeRefillQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(
      collection(firestore, 'users', authUser.uid, 'refillRequests'),
      where('status', 'in', ['Requested', 'In Production', 'Out for Delivery']),
    );
  }, [firestore, authUser]);
  const { data: activeRefills } = useCollection<RefillRequest>(activeRefillQuery);

  const stationDocRef = useMemoFirebase(
    () => (firestore && user?.assignedWaterStationId ? doc(firestore, 'waterStations', user.assignedWaterStationId) : null),
    [firestore, user?.assignedWaterStationId],
  );
  const { data: waterStation } = useDoc<WaterStation>(stationDocRef);

  const complianceReportsQuery = useMemoFirebase(
    () => (firestore && user?.assignedWaterStationId
      ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports')
      : null),
    [firestore, user?.assignedWaterStationId],
  );
  const { data: complianceReports, isLoading: complianceLoading } = useCollection<ComplianceReport>(complianceReportsQuery);

  const sanitationVisitsQuery = useMemoFirebase(
    () => (firestore && authUser
      ? collection(firestore, 'users', authUser.uid, 'sanitationVisits')
      : null),
    [firestore, authUser],
  );
  const { data: sanitationVisits, isLoading: sanitationLoading } = useCollection<SanitationVisit>(sanitationVisitsQuery);

  const branchUsersQuery = useMemoFirebase(() => {
    if (!firestore || !isParent || !user?.id) return null;
    return query(collection(firestore, 'users'), where('parentId', '==', user.id));
  }, [firestore, isParent, user?.id]);
  const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);

  const deliveries = liveDeliveries ?? cached?.deliveries ?? null;
  const payments = livePayments ?? cached?.payments ?? null;
  const activeRefill = useMemo(() => {
    if (activeRefills) {
      const sorted = [...activeRefills].sort((a, b) => (toDate(b.requestedAt)?.getTime() || 0) - (toDate(a.requestedAt)?.getTime() || 0));
      return sorted[0] ?? null;
    }
    return cached?.activeRefill ?? null;
  }, [activeRefills, cached?.activeRefill]);

  useEffect(() => {
    if (!liveUser) return;
    writeJson(CACHE_KEY, {
      user: liveUser,
      deliveries: (liveDeliveries || []).slice(0, 60),
      payments: (livePayments || []).slice(0, 40),
      activeRefill: activeRefills && activeRefills.length > 0 ? activeRefills[0] : null,
    });
  }, [liveUser, liveDeliveries, livePayments, activeRefills]);

  useEffect(() => {
    const onFinished = () => setSendingRefill(false);
    window.addEventListener('refill-request-finished', onFinished);
    return () => window.removeEventListener('refill-request-finished', onFinished);
  }, []);

  const estimate = useMemo(() => {
    if (!user || !deliveries) return null;
    return currentCycleEstimate(user, deliveries);
  }, [user, deliveries]);

  const parentBalance = useMemo(() => {
    if (!isParent || !user || !deliveries) return null;
    const totalCredits = (transactions || []).filter((item) => item.type === 'Credit').reduce((sum, item) => sum + item.amountCredits, 0);
    const pricePerLiter = user.plan?.price || 1;
    const totalDebit = deliveries.reduce((sum, delivery) => {
      const amount = delivery.amount ?? ((delivery.liters ?? (delivery.volumeContainers || 0) * 19.5) * pricePerLiter);
      return sum + amount;
    }, 0);
    return totalCredits - totalDebit;
  }, [isParent, user, deliveries, transactions]);

  const value: CustomerWaterValue = {
    user,
    deliveries,
    payments,
    activeRefill,
    loading: !user && (isUserDocLoading || deliveriesLoading),
    estimatedAmount: estimate?.amount ?? 0,
    usedLiters: estimate?.consumedLiters ?? 0,
    parentBalance,
    sendingRefill,
    setSendingRefill,
  };

  return (
    <CustomerWaterContext.Provider value={value}>
      {children}
      {user && firestore && authUser ? (
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
          activeRefillRequest={activeRefill}
          branchUsers={branchUsers || null}
        />
      ) : null}
    </CustomerWaterContext.Provider>
  );
}
