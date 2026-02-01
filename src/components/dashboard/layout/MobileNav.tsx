
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { History, Droplets, User } from 'lucide-react';

interface MobileNavProps {
  userFirstName: string;
  onRefillClick: () => void;
  onHistoryClick: () => void;
  onAccountClick: () => void;
}

export function MobileNav({ userFirstName, onRefillClick, onHistoryClick, onAccountClick }: MobileNavProps) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 h-20 bg-transparent z-20 flex justify-center px-2">
      <div className="relative bg-background border-t border-border rounded-t-2xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)] w-full max-w-md">
        <div className="absolute left-1/2 -translate-x-1/2 -top-[30px] w-[130px] h-[60px]">
          <div className="w-full h-full bg-transparent rounded-full border-[20px] border-transparent border-t-background transform rotate-180"></div>
        </div>
        <div className="flex justify-around items-center h-full">
          <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={onHistoryClick}>
            <History className="h-6 w-6" />
          </Button>
          <div className="relative">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-primary shadow-lg absolute -top-8 left-1/2 -translate-x-1/2"
              onClick={onRefillClick}
            >
              <Droplets className="h-8 w-8 text-primary-foreground" />
            </Button>
            <div className="absolute -top-16 left-1/2 -translate-x-1/2">
              <div className="tooltip-bubble">Refill now, {userFirstName}?</div>
            </div>
          </div>
          <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={onAccountClick}>
            <User className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
