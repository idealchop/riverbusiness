'use client';

import React, { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter, 
    DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Tag, 
    TrendingUp, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Save, 
    Loader2, 
    History,
    ArrowRight,
    ShieldCheck
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, writeBatch, doc, collectionGroup, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth } from 'date-fns';
import type { AppUser, PricingHistory } from '@/lib/types';
import { cn } from '@/lib/utils';

const LITER_RATIO = 19.5;

interface GlobalPricingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allActiveUsers: AppUser[];
  currentGlobalPrice: number;
  adminUser: AppUser | null;
}

export function GlobalPricingDialog({ isOpen, onOpenChange, allActiveUsers, currentGlobalPrice, adminUser }: GlobalPricingDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [newPrice, setNewPrice] = useState(currentGlobalPrice.toString());
    const [isUpdating, setIsUpdating] = useState(false);

    const pricingHistoryQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'pricing_history'), orderBy('updatedAt', 'desc'), limit(15)) : null, 
        [firestore, isOpen]
    );
    const { data: pricingHistory, isLoading: historyLoading } = useCollection<PricingHistory>(pricingHistoryQuery);

    const handleApplyPricing = async () => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price <= 0 || !firestore || !adminUser) {
            toast({ variant: 'destructive', title: 'Invalid amount' });
            return;
        }

        setIsUpdating(true);
        const literPrice = price / LITER_RATIO;
        
        try {
            const batch = writeBatch(firestore);

            // 1. Log to history
            const historyRef = collection(firestore, 'pricing_history');
            await addDoc(historyRef, {
                containerPrice: price,
                literPrice: literPrice,
                updatedAt: serverTimestamp(),
                updatedBy: adminUser.id,
                updatedByName: adminUser.name
            });

            // 2. Push to all active users (Future pricing)
            allActiveUsers.forEach(user => {
                const userRef = doc(firestore, 'users', user.id);
                batch.update(userRef, { 'plan.price': literPrice });
            });

            // 3. Retroactive Sync: Update current month deliveries
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            
            // Search across the entire system for deliveries this month
            const deliveriesQuery = query(
                collectionGroup(firestore, 'deliveries'),
                where('date', '>=', startOfCurrentMonth.toISOString())
            );
            
            const deliveriesSnap = await getDocs(deliveriesQuery);
            
            deliveriesSnap.docs.forEach(deliveryDoc => {
                const deliveryData = deliveryDoc.data();
                const liters = deliveryData.liters || (deliveryData.volumeContainers * LITER_RATIO);
                const newAmount = liters * literPrice;
                
                batch.update(deliveryDoc.ref, {
                    amount: newAmount,
                    updatedAt: serverTimestamp(),
                    adminPricingSync: true
                });
            });

            await batch.commit();
            
            toast({ 
                title: 'Pricing Protocol Synchronized', 
                description: `Applied ₱${price.toFixed(2)} rate to ${allActiveUsers.length} clients and updated ${deliveriesSnap.docs.length} current-month delivery records.` 
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Pricing update error:", error);
            toast({ variant: 'destructive', title: 'Action failed', description: 'Could not propagate pricing update.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl rounded-[2rem] border-none shadow-3xl p-0 overflow-hidden bg-white h-[85vh] flex flex-col">
                <div className="bg-slate-900 text-white p-8 shrink-0">
                    <DialogHeader>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                                <Tag className="h-6 w-6 text-primary-light" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Global Pricing Control</DialogTitle>
                                <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                    Strategic rate synchronization protocol
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                    <ScrollArea className="flex-1">
                        <div className="p-8 space-y-10">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Active rate protocol</h4>
                                <Card className="border-none shadow-sm rounded-3xl bg-slate-50 p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active container price</p>
                                        <p className="text-3xl font-black text-slate-900 tabular-nums">₱{currentGlobalPrice.toFixed(2)}</p>
                                    </div>
                                    <Badge variant="outline" className="h-8 px-4 rounded-xl border-slate-200 bg-white text-primary font-black text-[10px] uppercase">
                                        ≈ ₱{(currentGlobalPrice / LITER_RATIO).toFixed(2)} / L
                                    </Badge>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Adjust pricing tier</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-600 ml-1">New price per container (PHP)</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">₱</span>
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                className="h-14 rounded-2xl bg-slate-50 border-slate-100 pl-8 font-black text-lg focus:ring-primary shadow-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 space-y-3">
                                        <div className="flex items-center gap-2 text-primary">
                                            <TrendingUp className="h-4 w-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Retroactive Sync Protocol</p>
                                        </div>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                            Authorizing this change will instantly update the rate for **{allActiveUsers.length} active clients** and automatically recalculate all delivery overhead for the **current month**.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <aside className="w-full md:w-72 bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col shrink-0">
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                                <History className="h-3.5 w-3.5" /> Rate History
                            </h4>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-3">
                                {historyLoading ? (
                                    <div className="py-20 text-center opacity-30 animate-pulse">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        <p className="text-[10px] font-bold uppercase">Reading ledger...</p>
                                    </div>
                                ) : pricingHistory?.map(entry => (
                                    <div key={entry.id} className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-2 group transition-all hover:border-primary/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-black text-slate-900 tabular-nums">₱{entry.containerPrice.toFixed(2)}</p>
                                            <Badge variant="ghost" className="h-4 px-1.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest">Fixed</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">By {entry.updatedByName?.split(' ')[0] || 'Admin'}</p>
                                            <p className="text-[8px] font-medium text-slate-300 uppercase tracking-widest">
                                                {entry.updatedAt ? format(entry.updatedAt.toDate(), 'MMM d, HH:mm') : 'Recently'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </aside>
                </div>

                <DialogFooter className="p-8 pt-4 bg-white border-t flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="hidden md:flex items-center gap-2 opacity-30">
                        <ShieldCheck className="h-3 w-3" />
                        <p className="text-[8px] font-black uppercase tracking-[0.4em]">Authorized protocol</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <DialogClose asChild>
                            <Button variant="ghost" className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest text-slate-400">Cancel</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleApplyPricing} 
                            disabled={isUpdating || newPrice === currentGlobalPrice.toString()}
                            className="flex-1 md:flex-none rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                        >
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Authorize & Sync
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
