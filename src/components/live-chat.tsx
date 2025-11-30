
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, UserCog } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'admin';
  content: string;
}

interface LiveChatProps {
    setHasNewMessage: (hasNewMessage: boolean) => void;
}

export function LiveChat({ setHasNewMessage }: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'admin', content: "Hello! How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    // Simulate an admin response for demonstration purposes
    setTimeout(() => {
        const adminResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: 'admin',
            content: "Thanks for your message. An admin will be with you shortly."
        };
        setMessages((prev) => [...prev, adminResponse]);
        setHasNewMessage(true);
    }, 1500)
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live Support
        </CardTitle>
        <CardDescription>
          Chat with a support agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-3 text-sm", m.role === 'user' ? 'justify-end' : '')}>
                 {m.role === 'admin' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback>
                      <UserCog />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    "flex-1 max-w-[80%] p-3 rounded-lg",
                    m.role === 'user' ? 'bg-secondary text-secondary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                )}>
                  <div className="prose-sm max-w-full">{m.content}</div>
                </div>
                {m.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
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
