'use client';

import React, { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Globe, Copy, CheckCircle2, ShieldCheck, Mail, Send, Link as LinkIcon } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { CollabPage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
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

  const shareUrl = `${window.location.origin}/public/${page.shareToken || page.id}`;

  const togglePublicAccess = async (enabled: boolean) => {
    if (!firestore || !page.id) return;
    setIsUpdating(true);
    try {
        const pageRef = doc(firestore, 'collaboration_pages', page.id);
        const shareToken = page.shareToken || Math.random().toString(36).substring(2, 15);
        
        await updateDoc(pageRef, {
            isPublic: enabled,
            shareToken: shareToken
        });
        toast({ title: enabled ? 'Public sharing enabled' : 'Public access disabled' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action failed' });
    } finally {
        setIsUpdating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast({ title: 'Link copied to clipboard' });
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allow anyone with the link to view</p>
                    </div>
                    <Switch 
                        checked={page.isPublic || false} 
                        onCheckedChange={togglePublicAccess}
                        disabled={isUpdating}
                    />
                </div>

                {page.isPublic && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
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

                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold uppercase tracking-tight text-blue-900/60 leading-relaxed">
                                Security note: Public pages are read-only. External visitors cannot modify blocks or view internal workspace meta.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Invite Contributors</h4>
                <div className="flex gap-2">
                    <Input placeholder="name@company.com" className="h-11 rounded-xl bg-slate-50 border-slate-100 shadow-none text-xs font-medium" />
                    <Button size="icon" className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20"><Send className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>

        <DialogFooter className="p-8 pt-0 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Sync Active</p>
            </div>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
