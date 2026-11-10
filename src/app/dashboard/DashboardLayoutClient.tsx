
'use client';
import React, { useMemo, useState, useEffect } from 'react';
import type { AppUser, Notification as NotificationType, ChatMessage, Payment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, updateDoc, serverTimestamp, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useMounted } from '@/hooks/use-mounted';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { FullScreenLoader } from '@/components/ui/loader';
import { LiveSupportDialog } from '@/components/dashboard/layout/LiveSupportDialog';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { getHomePath, isIndividualWorkspace, isInvitedEmployee } from '@/lib/workspace-access';
import { CustomerProvider } from '@/components/river/customer-provider';
import { CustomerHeader, CustomerHomeSkeleton, CustomerTabBar, useRestoreCustomerScreen } from '@/components/river/customer-screens';
import { writeLastScreen } from '@/lib/screen-cache';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMounted = useMounted();
  const auth = useAuth();
  const pathname = usePathname() || '/dashboard';
  useRestoreCustomerScreen();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    writeLastScreen(pathname);
  }, [pathname]);

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);
  
  const paymentsQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'payments') : null, [firestore, authUser]);
  const { data: paymentHistoryFromDb, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  
  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc'), limit(40)) : null, [firestore, authUser]);
  const { data: notifications } = useCollection<NotificationType>(notificationsQuery);
  
  const chatMessagesQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'users', authUser.uid, 'chatMessages'), orderBy('timestamp', 'asc'));
  }, [firestore, authUser]);
  const { data: chatMessages } = useCollection<ChatMessage>(chatMessagesQuery);
  
  const planImage = React.useMemo(() => {
    if (!user?.clientType) return null;
    const clientTypeDetails = clientTypes.find(ct => ct.name === user.clientType);
    if (!clientTypeDetails) return null;
    return PlaceHolderImages.find(p => p.id === clientTypeDetails.imageId);
  }, [user]);

  const [isLiveSupportOpen, setIsLiveSupportOpen] = React.useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [initialAccountDialogTab, setInitialAccountDialogTab] = React.useState<string | undefined>(undefined);
  const [startPaymentInvoice, setStartPaymentInvoice] = React.useState<Payment | null>(null);
  
  useEffect(() => {
    const handleOpenMyAccount = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.tab) {
            setInitialAccountDialogTab(customEvent.detail.tab);
        } else {
            setInitialAccountDialogTab(undefined);
        }
        if (customEvent.detail?.invoice) {
            setStartPaymentInvoice(customEvent.detail.invoice);
        }
        setIsAccountDialogOpen(true);
    };

    window.addEventListener('open-my-account', handleOpenMyAccount);
    return () => {
        window.removeEventListener('open-my-account', handleOpenMyAccount);
    };
  }, []);
  
  useEffect(() => {
    const handleOpenLiveSupport = () => setIsLiveSupportOpen(true);
    const handleOpenPaymentDialog = (event: Event) => {
        const customEvent = event as CustomEvent;
        const invoiceId = customEvent.detail?.invoiceId;
        if (invoiceId) {
            const invoice = paymentHistoryFromDb?.find(p => p.id === invoiceId);
            if (invoice) {
                handlePayNow(invoice);
            }
        }
    };

    window.addEventListener('open-live-support', handleOpenLiveSupport);
    window.addEventListener('open-payment-dialog', handleOpenPaymentDialog);
    return () => {
        window.removeEventListener('open-live-support', handleOpenLiveSupport);
        window.removeEventListener('open-payment-dialog', handleOpenPaymentDialog);
    };
  }, [paymentHistoryFromDb]);

  useEffect(() => {
    if (isUserLoading) return;
  
    if (!authUser && !isLoggingOut) {
      router.push('/login');
      return;
    }
  
    if (user === null && !isUserDocLoading && authUser) {
      router.push('/claim-account');
      return;
    }

    if (user && (isInvitedEmployee(user) || isIndividualWorkspace(user))) {
      router.replace(getHomePath(user));
    }
  }, [authUser, user, isUserLoading, isUserDocLoading, router, isLoggingOut]);

  useEffect(() => {
    if (!userDocRef || !auth || !auth.currentUser) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await updateDoc(userDocRef, { accountStatus: 'Inactive' });
      } else {
        await updateDoc(userDocRef, { accountStatus: 'Active', lastLogin: new Date().toISOString() });
      }
    };

    updateDoc(userDocRef, { accountStatus: 'Active', lastLogin: new Date().toISOString() });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (auth.currentUser) {
        updateDoc(userDocRef, { accountStatus: 'Inactive' });
      }
    };
  }, [userDocRef, auth]);

  const handleLogout = async () => {
    if (!auth) return;
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  }

  const handleMessageSubmit = async (messagePayload: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!firestore || !authUser || !userDocRef) return;

    const messagesCollection = collection(firestore, 'users', authUser.uid, 'chatMessages');
    const finalPayload = { ...messagePayload, timestamp: serverTimestamp() };

    try {
        await addDoc(messagesCollection, finalPayload);
        await updateDoc(userDocRef, {
            lastChatMessage: messagePayload.text || 'Attachment',
            lastChatTimestamp: serverTimestamp(),
            hasUnreadUserMessages: true
        });
    } catch(error) {
        console.error("Error sending chat message:", error);
        toast({ variant: 'destructive', title: 'Message Failed', description: 'Could not send your message.' });
    }
  };
    
  const handlePayNow = (invoice: Payment) => {
      setStartPaymentInvoice(invoice);
      setIsAccountDialogOpen(true);
  };

  const handleMobileRefillClick = () => {
      window.dispatchEvent(new CustomEvent('request-asap-refill'));
  };

  const handleNotificationClick = (notification: NotificationType) => {
      if (!notification.data) return;
      let eventName: string | null = null;
      let eventDetail: any = {};
      switch (notification.type) {
          case 'payment':
              eventName = 'open-payment-dialog';
              eventDetail = { invoiceId: notification.data.paymentId };
              break;
          case 'delivery':
              eventName = 'open-delivery-history';
              break;
          case 'sanitation':
              eventName = 'open-compliance';
              eventDetail = { tab: 'sanitation', visitId: notification.data.visitId };
              break;
          case 'compliance':
               eventName = 'open-compliance';
               eventDetail = { tab: 'compliance' };
               break;
      }
      if (eventName) {
          window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
      }
  }

  if (!isMounted || !auth || isLoggingOut) {
    return (
      <div className="rb-app mx-auto flex h-dvh w-full max-w-[460px] flex-col bg-[#F5F5F7] px-4 pt-4">
        <CustomerHomeSkeleton />
      </div>
    );
  }

  if (!isUserLoading && !authUser) return null;

  if (user && (isInvitedEmployee(user) || isIndividualWorkspace(user))) {
    return <FullScreenLoader text="Opening your workspace..." />;
  }

  const installPage = pathname.startsWith('/dashboard/install');

  return (
    <CustomerProvider authUser={authUser}>
      <div className="rb-app relative mx-auto flex h-dvh w-full max-w-[460px] flex-col overflow-hidden bg-[#F5F5F7]">
        <CustomerHeader
          onOpenChat={() => setIsLiveSupportOpen(true)}
          chatDot={!!user?.hasUnreadAdminMessages}
          notification={(
            <NotificationPopover
              appearance="plain"
              notifications={notifications || []}
              onNotificationClick={handleNotificationClick}
            />
          )}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
          {children}
        </main>
        {installPage ? null : <CustomerTabBar />}
        <LiveSupportDialog
          isOpen={isLiveSupportOpen}
          onOpenChange={setIsLiveSupportOpen}
          user={user}
          chatMessages={chatMessages || []}
          onMessageSubmit={handleMessageSubmit}
        >
          <button type="button" className="sr-only">Live support</button>
        </LiveSupportDialog>
        {user && authUser ? (
          <MyAccountDialog
            user={user}
            authUser={authUser}
            planImage={planImage}
            paymentHistory={paymentHistoryFromDb || []}
            paymentsLoading={paymentsLoading}
            onLogout={handleLogout}
            isOpen={isAccountDialogOpen}
            onOpenChange={(open) => {
              setIsAccountDialogOpen(open);
              if (!open) setStartPaymentInvoice(null);
            }}
            initialTab={initialAccountDialogTab}
            startPaymentInvoice={startPaymentInvoice}
          />
        ) : null}
      </div>
    </CustomerProvider>
  );
}
