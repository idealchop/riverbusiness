'use client';

import React, { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
    Globe, 
    Copy, 
    CheckCircle2, 
    Lock, 
    Clock, 
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { CollabPage } from '@/lib/types';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { addDays, addHours } from 'date-fns';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  page: CollabPage;
}

export function ShareDialog({ isOpen, onOpenChange, page }: ShareDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(!!page.sharePassword);
  const [password, setPassword] = useState(page.sharePassword || '');

  const shareUrl = `${window.location.origin}/public/${page.shareToken || page.id}`;

  const updateSecuritySettings = async (updates: Partial<CollabPage>) => {
    if (!firestore || !page.id) return;
    setIsUpdating(true);
    try {
        const pageRef = doc(firestore, 'collaboration_pages', page.id);
        await updateDoc(pageRef, updates);
        toast({ title: 'Security updated' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Update failed' });
    } finally {
        setIsUpdating(false);
    }
  };

  const togglePublicAccess = async (enabled: boolean) => {
    const shareToken = page.shareToken || Math.random().toString(36).substring(2, 15);
    updateSecuritySettings({
        isPublic: enabled,
        shareToken: enabled ? shareToken : deleteField()
    });
  };

  const handleExpiryChange = (value: string) => {
    let expiresAt: any = deleteField();
    const now = new Date();

    if (value === '24h') expiresAt = Timestamp.fromDate(addHours(now, 24));
    if (value === '7d') expiresAt = Timestamp.fromDate(addDays(now, 7));

    updateSecuritySettings({ expiresAt });
  };

  const togglePassword = (enabled: boolean) => {
    setIsPasswordEnabled(enabled);
    if (!enabled) {
        setPassword('');
        updateSecuritySettings({ sharePassword: deleteField() });
    }
  };

  const savePassword = () => {
    if (!password.trim()) {
        toast({ variant: 'destructive', title: 'Key required', description: 'Please enter a password key.' });
        return;
    }
    updateSecuritySettings({ sharePassword: password });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast({ title: 'Link copied' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl">
        <div className="p-8 space-y-8">
            <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 rounded-2xl bg-primary/10">
                        <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Share Document</DialogTitle>
                </div>
                <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    Collaborative Access Protocol
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Public Access</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shareable via URL</p>
                    </div>
                    <Switch 
                        checked={page.isPublic || false} 
                        onCheckedChange={togglePublicAccess}
                        disabled={isUpdating}
                    />
                </div>

                {page.isPublic && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        {/* URL Section */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Live shareable link</Label>
                            <div className="flex gap-2">
                                <Input 
                                    readOnly 
                                    value={shareUrl} 
                                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-mono text-[10px] shadow-inner truncate"
                                />
                                <Button 
                                    onClick={copyLink} 
                                    variant="outline"
                                    className={cn(
                                        "h-11 px-4 rounded-xl border-slate-100 shadow-sm font-bold text-xs shrink-0 transition-all",
                                        hasCopied ? "bg-green-50 text-green-600 border-green-100" : "bg-white"
                                    )}
                                >
                                    {hasCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Security Tools */}
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Security Layer</h4>
                            
                            {/* Expiry Selector */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-600">Link Expiry</p>
                                </div>
                                <Select onValueChange={handleExpiryChange} defaultValue={page.expiresAt ? "active" : "never"}>
                                    <SelectTrigger className="w-[120px] h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest border-slate-100 shadow-none">
                                        <SelectValue placeholder="Expires" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="never" className="text-[10px] font-bold uppercase">Never</SelectItem>
                                        <SelectItem value="24h" className="text-[10px] font-bold uppercase">24 Hours</SelectItem>
                                        <SelectItem value="7d" className="text-[10px] font-bold uppercase">7 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Password Toggle */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-600">Encryption</p>
                                    </div>
                                    <Switch checked={isPasswordEnabled} onCheckedChange={togglePassword} disabled={isUpdating} />
                                </div>
                                
                                {isPasswordEnabled && (
                                    <div className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
                                        <Input 
                                            placeholder="Enter access key..." 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-10 rounded-xl bg-slate-50 border-slate-100 text-xs font-bold px-4"
                                            disabled={isUpdating}
                                        />
                                        <Button 
                                            size="sm" 
                                            onClick={savePassword} 
                                            className="h-10 rounded-xl px-4 font-bold text-[10px] uppercase tracking-widest"
                                            disabled={isUpdating}
                                        >
                                            Set Key
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
