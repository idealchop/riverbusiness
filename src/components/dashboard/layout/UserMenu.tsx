'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from 'lucide-react';

interface UserMenuProps {
  user: any;
  onOpenSettings: () => void;
  onLogout: () => void;
  showOfficeSetup?: boolean;
}

export function UserMenu({ user, onOpenSettings }: UserMenuProps) {
  const displayName = user?.businessName || user?.name || 'User';
  const photo = user?.photoURL || user?.supportPhotoURL;

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      aria-label="Open my account"
      className="flex items-center p-0.5 rounded-full hover:bg-slate-100 transition-all group outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Avatar className="h-8 w-8 border border-slate-200 shadow-sm transition-transform group-hover:scale-105">
        <AvatarImage src={photo} alt={displayName} />
        <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
          {displayName.charAt(0) || <UserIcon className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}
