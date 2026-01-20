
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, orderBy, query, updateDoc, where } from 'firebase/firestore';
import type { AppUser, ChatMessage } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LiveChat } from '@/components/live-chat';
import { MessageSquare, Edit } from 'lucide-react';
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { AdminMyAccountDialog } from '@/components/AdminMyAccountDialog';
import { Button } from '@/components/ui/button';

export default function LiveChatPage() {
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [selectedChatUser, setSelectedChatUser] = useState<AppUser | null>(null);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

    const usersQuery = useMemoFirebase(() => (firestore) ? query(collection(firestore, 'users'), where('role', '==', 'User')) : null, [firestore]);
    const { data: appUsers, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

    const chatMessagesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedChatUser) return null;
        return query(collection(firestore, 'users', selectedChatUser.id, 'chatMessages'), orderBy('timestamp', 'asc'));
    }, [firestore, selectedChatUser]);
    const { data: chatMessages } = useCollection<ChatMessage>(chatMessagesQuery);
    
    const chatUsers = useMemo(() => {
        if (!appUsers) return [];
        return [...appUsers].sort((a, b) => {
            const timeA = a.lastChatTimestamp ? (a.lastChatTimestamp as any).toMillis() : 0;
            const timeB = b.lastChatTimestamp ? (b.lastChatTimestamp as any).toMillis() : 0;
            return timeB - timeA;
        });
    }, [appUsers]);

    const handleAdminMessageSubmit = async (messagePayload: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        if (!firestore || !selectedChatUser) return;
        
        const messagesCollection = collection(firestore, 'users', selectedChatUser.id, 'chatMessages');
        const finalPayload = {
          ...messagePayload,
          timestamp: serverTimestamp(),
        };
    
        try {
            await addDoc(messagesCollection, finalPayload);
            const userRef = doc(firestore, 'users', selectedChatUser.id);
            await updateDoc(userRef, {
                lastChatMessage: messagePayload.text || 'Attachment',
                lastChatTimestamp: serverTimestamp(),
                hasUnreadAdminMessages: true,
                // Admin has read the messages now
                hasUnreadUserMessages: false,
            });
        } catch(error) {
            console.error("Error sending admin chat message:", error);
            // Optionally, add a toast notification for the admin here
        }
    };

    if (isUserLoading || usersLoading) {
        return <AdminDashboardSkeleton />;
    }

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-10rem)]">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Live Chat</h1>
                <Button onClick={() => setIsAccountDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Support Profile
                </Button>
            </div>
             <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Client Conversations</CardTitle>
                    <CardDescription>Respond to user messages in real-time.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                     <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-full border rounded-lg">
                        <div className="border-r">
                            <ScrollArea className="h-full">
                                <div className="p-2">
                                    {chatUsers.map(user => (
                                        <div
                                            key={user.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted",
                                                selectedChatUser?.id === user.id && 'bg-muted'
                                            )}
                                            onClick={() => {
                                                setSelectedChatUser(user);
                                                if (user.hasUnreadUserMessages && firestore) {
                                                    updateDoc(doc(firestore, 'users', user.id), { hasUnreadUserMessages: false });
                                                }
                                            }}
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.photoURL || undefined} />
                                                <AvatarFallback>{user.businessName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 truncate">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold text-sm truncate">{user.businessName}</p>
                                                    {user.hasUnreadUserMessages && (
                                                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{user.clientId}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.lastChatMessage || 'No messages yet'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="flex flex-col">
                            {selectedChatUser ? (
                                <LiveChat
                                    chatMessages={chatMessages || []}
                                    onMessageSubmit={handleAdminMessageSubmit}
                                    user={selectedChatUser}
                                    agent={adminUser}
                                    currentUserRole="admin"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <MessageSquare className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">Select a conversation</p>
                                    <p className="text-sm">Choose a user from the left panel to start chatting.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <AdminMyAccountDialog
                adminUser={adminUser}
                isOpen={isAccountDialogOpen}
                onOpenChange={setIsAccountDialogOpen}
            />
        </div>
    )
}
