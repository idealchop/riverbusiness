'use client';
import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import type { AppUser, Notification as NotificationType, ChatMessage, Payment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, updateDoc, serverTimestamp, addDoc, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMounted } from '@/hooks/use-mounted';
import { MyAccountDialog } from '@/components/MyAccountDialog';
import { FullScreenLoader } from '@/components/ui/loader';
import { LiveSupportDialog } from '@/components/dashboard/dialogs/LiveSupportDialog';
import { NotificationPopover } from '@/components/dashboard/layout/NotificationPopover';
import { MobileNav } from '@/components/dashboard/layout/MobileNav';
import { PaymentDialog } from '@/components/dashboard/dialogs/PaymentDialog';

export default function DashboardLayout({
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

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);
  
  const paymentsQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'users', authUser.uid, 'payments') : null, [firestore, authUser]);
  const { data: paymentHistoryFromDb, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  
  const notificationsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'notifications'), orderBy('date', 'desc')) : null, [firestore, authUser]);
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

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Payment | null>(null);
  const [isLiveSupportOpen, setIsLiveSupportOpen] = React.useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [initialAccountDialogTab, setInitialAccountDialogTab] = React.useState<string | undefined>(undefined);
  
  useEffect(() => {
    const handleOpenMyAccount = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.tab) {
            setInitialAccountDialogTab(customEvent.detail.tab);
        } else {
            setInitialAccountDialogTab(undefined);
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
  
    if (!authUser) {
      router.push('/login');
      return;
    }
  
    if (user === null && !isUserDocLoading) {
      router.push('/claim-account');
    }
  }, [authUser, user, isUserLoading, isUserDocLoading, router]);

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

  if (isUserLoading || isUserDocLoading || !isMounted || !auth || !authUser || !user) {
    return <FullScreenLoader />;
  }
  
  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => {
      router.push('/login');
    })
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
      setSelectedInvoice(invoice);
      setIsPaymentDialogOpen(true);
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

  const handleComplianceClick = () => {
      window.dispatchEvent(new CustomEvent('open-compliance', { detail: { tab: 'compliance' } }));
  }

  const displayPhoto = user?.photoURL;
  const userFirstName = user?.name?.split(' ')[0] || 'friend';

  return (
      <div className="flex flex-col h-full">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <div className="flex items-center"><span className="font-bold">River Business</span></div>
            </Link>
            <div className="flex-1" />
            
            <LiveSupportDialog 
                isOpen={isLiveSupportOpen}
                onOpenChange={setIsLiveSupportOpen}
                user={user}
                chatMessages={chatMessages || []}
                onMessageSubmit={handleMessageSubmit}
            />
            
            <Button asChild variant="outline" size="icon" className="relative rounded-full">
              <Link href="/documentation" target="_blank"><FileText className="h-4 w-4" /></Link>
            </Button>

            <NotificationPopover 
                notifications={notifications || []}
                onNotificationClick={handleNotificationClick}
            />

            <Button variant="outline" size="icon" className="sm:hidden rounded-full" onClick={handleComplianceClick}>
              <ShieldCheck className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-8 mx-2 hidden sm:block" />

            <MyAccountDialog
              user={user}
              authUser={authUser}
              planImage={planImage}
              paymentHistory={paymentHistoryFromDb || []}
              paymentsLoading={paymentsLoading}
              onLogout={handleLogout}
              onPayNow={handlePayNow}
              isOpen={isAccountDialogOpen}
              onOpenChange={setIsAccountDialogOpen}
              initialTab={initialAccountDialogTab}
            >
              <div className="items-center gap-3 cursor-pointer hidden sm:flex">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                        <AvatarImage src={displayPhoto ?? undefined} alt={user?.name || ''} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <p className="font-semibold text-sm">{user?.businessName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
            </MyAccountDialog>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 sm:pb-6">
            <div className="container mx-auto">
              {children}
            </div>
          </main>

          <MobileNav
            userFirstName={userFirstName}
            onRefillClick={handleMobileRefillClick}
            onHistoryClick={() => window.dispatchEvent(new CustomEvent('open-delivery-history'))}
            onAccountClick={() => setIsAccountDialogOpen(true)}
          />

          <footer className="p-4 text-center text-xs text-muted-foreground border-t hidden sm:block">
              v1.0.0 - Smart Refill is a trademark and product name of{' '}
              <a href="https://riverph.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  River Philippines
              </a>.
          </footer>

          <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            selectedInvoice={selectedInvoice}
          />
      </div>
  );
}
