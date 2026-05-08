'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, User as UserIcon, MapPin } from 'lucide-react';

interface UserMenuProps {
  user: any;
  onOpenSettings: () => void;
  onLogout: () => void;
  showOfficeSetup?: boolean;
}

export function UserMenu({ user, onOpenSettings, onLogout, showOfficeSetup = false }: UserMenuProps) {
  const displayName = user?.businessName || user?.name || 'User';
  const photo = user?.photoURL || user?.supportPhotoURL;
  const isOwner = user?.hrRole === 'owner';
  
  const handleOpenOfficeSettings = () => {
    window.dispatchEvent(new CustomEvent('open-office-settings'));
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center p-0.5 rounded-full hover:bg-slate-100 transition-all group outline-none">
          <Avatar className="h-8 w-8 border border-slate-200 shadow-sm transition-transform group-hover:scale-105">
            <AvatarImage src={photo} alt={displayName} />
            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
              {displayName.charAt(0) || <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-0 rounded-[1.5rem] shadow-2xl border-none overflow-hidden" align="end" sideOffset={8}>
        <div className="bg-[#f8faff] p-6 text-center border-b border-slate-100">
            <div className="flex justify-center mb-3">
                <Avatar className="h-16 w-16 border-4 border-white shadow-md">
                    <AvatarImage src={photo} alt={displayName} />
                    <AvatarFallback className="text-xl font-bold bg-muted">{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
            <div className="space-y-1">
                <p className="text-base font-bold text-slate-900 leading-tight truncate px-2">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate px-4">{user?.email}</p>
            </div>
            <div className="flex flex-col gap-2 mt-4">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full h-8 text-[10px] font-bold uppercase tracking-widest px-6 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                    onClick={onOpenSettings}
                >
                    Manage your account
                </Button>
                {isOwner && showOfficeSetup && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full h-8 text-[10px] font-bold uppercase tracking-widest px-6 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        onClick={handleOpenOfficeSettings}
                    >
                        Office Setup (GPS/QR)
                    </Button>
                )}
            </div>
        </div>
        
        <div className="p-2 bg-white">
            <DropdownMenuItem 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 focus:bg-slate-50 cursor-pointer transition-colors"
                onClick={onOpenSettings}
            >
                <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                    <Settings className="h-4 w-4" />
                </div>
                <span>Account Settings</span>
            </DropdownMenuItem>

            {isOwner && showOfficeSetup && (
                <DropdownMenuItem 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 focus:bg-slate-50 cursor-pointer transition-colors"
                    onClick={handleOpenOfficeSettings}
                >
                    <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                        <MapPin className="h-4 w-4" />
                    </div>
                    <span>Office Setup</span>
                </DropdownMenuItem>
            )}
            
            <DropdownMenuItem 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:text-red-700 focus:bg-red-50 cursor-pointer transition-colors"
                onClick={onLogout}
            >
                <div className="p-2 rounded-lg bg-red-50/50 text-red-400">
                    <LogOut className="h-4 w-4" />
                </div>
                <span>Sign out</span>
            </DropdownMenuItem>
        </div>
        
        <div className="bg-slate-50/50 p-3 text-center border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">River Command Center</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
