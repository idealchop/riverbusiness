
'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, UserCog, Paperclip, XCircle, File as FileIcon, Download } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import type { AppUser, ChatMessage } from '@/lib/types';
import { Timestamp, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useAuth, useFirebase, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import Image from 'next/image';
import { Progress } from './ui/progress';

interface LiveChatProps {
    chatMessages: ChatMessage[];
    onMessageSubmit: (messagePayload: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    user: AppUser | null;
    agent: AppUser | null;
}

export function LiveChat({ chatMessages, onMessageSubmit, user, agent }: LiveChatProps) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: 'Please select a file smaller than 5MB.',
        });
        return;
      }
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        setAttachmentPreview(URL.createObjectURL(file));
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setAttachmentPreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '' && !attachment) return;

    let attachmentUrl: string | undefined = undefined;
    let attachmentType: string | undefined = undefined;

    const role = user?.role === 'Admin' ? 'admin' : 'user';

    const messagePayload: Omit<ChatMessage, 'id' | 'timestamp'> = {
      text: input.trim(),
      role: role,
    };

    if (attachment && auth && storage) {
        setIsUploading(true);
        setUploadProgress(0);
        const filePath = `chats/${user?.id || 'unknown'}/${Date.now()}-${attachment.name}`;
        try {
            attachmentUrl = await uploadFileWithProgress(storage, auth, filePath, attachment, {}, setUploadProgress);
            attachmentType = attachment.type;

            if (attachmentUrl) {
              messagePayload.attachmentUrl = attachmentUrl;
              messagePayload.attachmentType = attachmentType;
            }

        } catch(error) {
            console.error("Error uploading attachment:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your file.'});
            setIsUploading(false);
            return;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }
    
    onMessageSubmit(messagePayload);
    setInput('');
    removeAttachment();
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [chatMessages]);
  
  const isImage = (type: string | undefined) => type?.startsWith('image/');

  return (
    <Card className="flex flex-col h-full border-0 shadow-none">
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden pt-6">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {(chatMessages || []).map((m) => {
              const isUserMessage = m.role === 'user';
              const FallbackIcon = isUserMessage ? User : UserCog;
              const messageDate = m.timestamp instanceof Timestamp ? m.timestamp.toDate() : new Date();

              const displayName = !isUserMessage ? (agent?.supportDisplayName || agent?.name) : user?.name;
              const displayDescription = !isUserMessage ? (agent?.supportDescription || "Customer Support") : user?.businessName;
              const displayPhoto = !isUserMessage ? agent?.supportPhotoURL : user?.photoURL;

              return (
              <div key={m.id} className={cn("flex items-start gap-3 text-sm", isUserMessage ? 'justify-end' : 'justify-start')}>
                 {!isUserMessage && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                     <AvatarImage src={displayPhoto ?? undefined} alt={displayName || 'Agent'} />
                    <AvatarFallback>
                      <FallbackIcon />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    "flex flex-col max-w-[80%]",
                    isUserMessage ? 'items-end' : 'items-start'
                )}>
                    {isUserMessage ? (
                      <div className="flex items-center gap-2 mb-1 justify-end">
                        <span className="font-semibold text-xs">{displayName || 'User'}</span>
                        <span className="text-xs text-muted-foreground">{displayDescription}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-xs">{displayName || 'Admin'}</span>
                        <span className="text-xs text-muted-foreground">{displayDescription}</span>
                      </div>
                    )}
                  <div className={cn(
                      "p-3 rounded-lg break-words",
                      isUserMessage ? 'bg-secondary text-secondary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                  )}>
                     {m.attachmentUrl && (
                        <div className="mb-2">
                           {isImage(m.attachmentType) ? (
                            <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <Image src={m.attachmentUrl} alt="Attachment" width={200} height={200} className="rounded-md object-cover max-w-full h-auto"/>
                            </a>
                           ) : (
                             <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-md bg-background border hover:bg-accent">
                               <FileIcon className="h-6 w-6 text-muted-foreground" />
                               <div className="flex-1 truncate">
                                 <p className="text-sm font-medium">Attachment</p>
                                 <p className="text-xs text-muted-foreground">Click to download</p>
                               </div>
                               <Download className="h-4 w-4" />
                             </a>
                           )}
                        </div>
                     )}
                     {m.text && <div className="prose-sm max-w-full">{m.text}</div>}
                  </div>
                   <div className="text-xs text-muted-foreground mt-1 px-1">
                        {formatDistanceToNow(messageDate, { addSuffix: true })}
                    </div>
                </div>
                {isUserMessage && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayPhoto ?? undefined} alt={displayName || 'User'} />
                    <AvatarFallback>
                      <FallbackIcon />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )})}
          </div>
        </ScrollArea>
        {attachment && (
            <div className="relative p-2 border rounded-md">
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeAttachment}>
                    <XCircle className="h-4 w-4" />
                </Button>
                {attachmentPreview ? (
                     <Image src={attachmentPreview} alt="Preview" width={80} height={80} className="rounded-md object-cover"/>
                ): (
                    <div className="flex items-center gap-2">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                )}
                 {isUploading && <Progress value={uploadProgress} className="absolute bottom-0 left-0 right-0 h-1 rounded-b-md" />}
            </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="pl-10"
                disabled={isUploading}
              />
              <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Paperclip className="h-4 w-4" />
              </Button>
               <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          <Button type="submit" size="icon" disabled={isUploading || (!input.trim() && !attachment)}>
            {isUploading ? <div className="h-4 w-4 border-2 border-dashed rounded-full animate-spin"></div> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
