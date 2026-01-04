
'use client';

import React, { useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, UserCog } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import type { AppUser, ChatMessage } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

interface LiveChatProps {
    chatMessages: ChatMessage[];
    onMessageSubmit: (content: string) => void;
    user: AppUser | null;
    agent: AppUser | null;
}

export function LiveChat({ chatMessages, onMessageSubmit, user, agent }: LiveChatProps) {
  const [input, setInput] = React.useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;
    onMessageSubmit(input);
    setInput('');
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [chatMessages]);

  return (
    <Card className="flex flex-col h-full border-0 shadow-none">
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden pt-6">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {(chatMessages || []).map((m) => {
              const isUserMessage = m.role === 'user';
              const sender = isUserMessage ? user : agent;
              const FallbackIcon = isUserMessage ? User : UserCog;
              const messageContent = m.text;
              const messageDate = m.timestamp instanceof Timestamp ? m.timestamp.toDate() : new Date();

              return (
              <div key={m.id} className={cn("flex items-start gap-3 text-sm", isUserMessage ? 'justify-end' : 'justify-start')}>
                 {!isUserMessage && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                     <AvatarImage src={sender?.photoURL ?? undefined} alt={sender?.name || 'Agent'} />
                    <AvatarFallback>
                      <FallbackIcon />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    "flex-1 max-w-[80%]",
                    isUserMessage ? 'flex items-end flex-col' : ''
                )}>
                  {!isUserMessage && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs">{sender?.name || 'Admin'}</span>
                      <span className="text-xs text-muted-foreground">Customer Support</span>
                    </div>
                  )}
                  <div className={cn(
                      "p-3 rounded-lg",
                      isUserMessage ? 'bg-secondary text-secondary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                  )}>
                    <div className="prose-sm max-w-full break-words">{messageContent}</div>
                  </div>
                   <div className="text-xs text-muted-foreground mt-1 px-1">
                        {formatDistanceToNow(messageDate, { addSuffix: true })}
                    </div>
                </div>
                {isUserMessage && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={sender?.photoURL ?? undefined} alt={sender?.name || 'User'} />
                    <AvatarFallback>
                      <FallbackIcon />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )})}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
