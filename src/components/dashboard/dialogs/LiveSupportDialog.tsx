
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { LiveChat, type ChatMessage } from '@/components/live-chat';
import { Mail, Phone, MessageSquare, FileUp } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { FeedbackDialog } from './FeedbackDialog';
import { SwitchProviderDialog } from './SwitchProviderDialog';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface LiveSupportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  chatMessages: ChatMessage[];
  onMessageSubmit: (messagePayload: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
}

// Hardcoded admin support profile for the user-facing chat
const adminAgent: Partial<AppUser> = {
    id: '93prD8hfn8a1AnA53aYf3i0543r2', // A fixed, non-sensitive ID for the agent
    supportDisplayName: 'River Support',
    supportDescription: 'Customer Service',
    supportPhotoURL: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c'
};


export function LiveSupportDialog({ isOpen, onOpenChange, user, chatMessages, onMessageSubmit }: LiveSupportDialogProps) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = React.useState(false);
  const [isSwitchProviderDialogOpen, setIsSwitchProviderDialogOpen] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open && user?.hasUnreadAdminMessages && authUser && firestore) {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        updateDoc(userDocRef, { hasUnreadAdminMessages: false });
    }
    onOpenChange(open);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-full relative">
            <span className="relative flex items-center mr-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </span>
            <span className="mr-2 hidden sm:inline">Live Support</span>
            {(user?.hasUnreadAdminMessages) && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">Hello, {user?.businessName}!</DialogTitle>
            <DialogDescription>
              Our team is ready to assist you. Please use the contact details below, and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <LiveChat
                chatMessages={chatMessages || []}
                onMessageSubmit={onMessageSubmit}
                user={user}
                agent={adminAgent as AppUser}
                currentUserRole="user"
              />
            </div>
            <div className="shrink-0 pt-4 mt-auto border-t">
              <p className="text-xs text-muted-foreground text-center mb-4">For urgent concerns, you may also reach us through these channels.</p>
              <div className="flex items-center gap-4 rounded-md p-3 md:p-4 justify-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Viber Support</p>
                    <p className="text-xs text-muted-foreground">09182719091</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Email Support</p>
                    <a href="mailto:jayvee@riverph.com" className="text-xs text-muted-foreground hover:text-primary">jayvee@riverph.com</a>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsFeedbackDialogOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsSwitchProviderDialogOpen(true)}>
                  <FileUp className="h-4 w-4 mr-2" />
                  Switch Provider
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FeedbackDialog isOpen={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
      <SwitchProviderDialog isOpen={isSwitchProviderDialogOpen} onOpenChange={setIsSwitchProviderDialogOpen} />
    </>
  );
}
