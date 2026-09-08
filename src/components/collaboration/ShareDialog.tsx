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
    Copy, 
    CheckCircle2, 
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
import { getCollabShareUrl } from '@/lib/workspace-access';

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

  const shareUrl = getCollabShareUrl(page);

  const updateSecuritySettings = async (updates: Record<string, any>) => {
    if (!firestore || !page.id) return;
    setIsUpdating(true);
    try {
        const pageRef = doc(firestore, 'collaboration_pages', page.id);
        await updateDoc(pageRef, updates);
        toast({ title: 'Security updated' });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Could not update sharing',
            description: error?.code === 'permission-denied' ? 'You do not have permission to share this document.' : (error?.message || 'Please try again.'),
        });
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
      <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 p-0 overflow-hidden bg-white shadow-xl">
        <div className="p-5 space-y-4">
            <DialogHeader className="space-y-1">
                <DialogTitle className="text-[17px] font-semibold tracking-tight text-slate-900">Share</DialogTitle>
                <DialogDescription className="text-[13px] text-slate-500">
                    People with the link can view this page.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900">Anyone with the link</p>
                        <p className="text-[12px] text-slate-500">{page.isPublic ? 'Can view' : 'Off — only your team'}</p>
                    </div>
                    <Switch 
                        checked={page.isPublic || false} 
                        onCheckedChange={togglePublicAccess}
                        disabled={isUpdating}
                    />
                </div>

                {page.isPublic && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input readOnly value={shareUrl} className="h-10 rounded-lg bg-slate-50 border-slate-200 font-mono text-[11px] truncate" />
                            <Button onClick={copyLink} className={cn("h-10 px-3 rounded-lg shrink-0 text-[13px] font-medium", hasCopied ? "bg-green-600 hover:bg-green-600" : "")}>
                                {hasCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                <span className="ml-1.5">{hasCopied ? 'Copied' : 'Copy'}</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-medium text-slate-500">Expires</Label>
                                <Select onValueChange={handleExpiryChange} defaultValue={page.expiresAt ? "active" : "never"}>
                                    <SelectTrigger className="h-9 rounded-lg text-[12px] border-slate-200">
                                        <SelectValue placeholder="Expires" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="never">Never</SelectItem>
                                        <SelectItem value="24h">24 hours</SelectItem>
                                        <SelectItem value="7d">7 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-medium text-slate-500">Password</Label>
                                    <Switch checked={isPasswordEnabled} onCheckedChange={togglePassword} disabled={isUpdating} className="scale-90" />
                                </div>
                                {isPasswordEnabled && (
                                    <div className="flex gap-1">
                                        <Input placeholder="Key" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-lg text-[12px]" disabled={isUpdating} />
                                        <Button size="sm" onClick={savePassword} className="h-9 rounded-lg px-2" disabled={isUpdating}>Set</Button>
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
