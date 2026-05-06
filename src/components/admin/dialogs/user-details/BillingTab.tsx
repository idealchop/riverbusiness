'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AppUser, Payment } from '@/lib/types';
import { Timestamp, collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { PlusCircle, Copy, Send, FileText, Receipt, CheckCircle, Wallet, History, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, subMonths, isAfter, isSameDay } from 'date-fns';

const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
};

interface BillingTabProps {
    user: AppUser;
    userPaymentsData: Payment[] | null;
    currentMonthInvoice: Payment | null;
    onSetIsManualChargeOpen: (isOpen: boolean) => void;
    onSetIsTopUpOpen: (isOpen: boolean) => void;
    onSetPaymentToReview: (payment: Payment | null) => void;
    onSetIsPaymentReviewOpen: (isOpen: boolean) => void;
}

export function BillingTab({
    user,
    userPaymentsData,
    currentMonthInvoice,
    onSetIsManualChargeOpen,
    onSetIsTopUpOpen,
    onSetPaymentToReview,
    onSetIsPaymentReviewOpen,
}: BillingTabProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
    const [isSending, setIsSending] = useState(false);
    const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
    const [docType, setDocType] = useState<'soa' | 'receipt'>('soa');
    const [selectedPeriod, setSelectedPeriod] = useState('full');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [customAmount, setCustomAmount] = useState<string>('');
    const [recipientType, setRecipientType] = useState<'default' | 'custom'>('default');
    const [customEmail, setCustomEmail] = useState('');
    const PAYMENTS_PER_PAGE = 5;

    const soaDateOptions = useMemo(() => {
        if (!user?.createdAt) return [];
        const options: { label: string; value: string }[] = [];
        const now = new Date();
        let startDate = toSafeDate(user.createdAt);
        if (!startDate || isNaN(startDate.getTime())) startDate = startOfMonth(now);
        let currentDate = startOfMonth(now);
        while (isAfter(currentDate, startDate) || isSameDay(currentDate, startDate)) {
            options.push({ label: format(currentDate, 'MMMM yyyy'), value: format(currentDate, 'yyyy-MM') });
            currentDate = subMonths(currentDate, 1);
        }
        options.push({ label: 'December 2025 - January 2026', value: '2025-12_2026-01' });
        options.unshift({ label: 'Full History', value: 'full' });
        const uniqueValues = new Set();
        return options.filter(o => !uniqueValues.has(o.value) && uniqueValues.add(o.value));
    }, [user?.createdAt]);

    const paidInvoices = useMemo(() => {
        return (userPaymentsData || []).filter(p => p.status === 'Paid');
    }, [userPaymentsData]);

    const showCurrentMonthInvoice = useMemo(() => {
        if (!currentMonthInvoice || !userPaymentsData) return false;
        return !userPaymentsData.some(inv => inv.description === currentMonthInvoice.description);
    }, [currentMonthInvoice, userPaymentsData]);

    const allPayments = useMemo(() => {
        const invoices = userPaymentsData ? [...userPaymentsData] : [];
        if (showCurrentMonthInvoice && currentMonthInvoice) {
            invoices.unshift(currentMonthInvoice);
        }
        return invoices.sort((a, b) => {
            const dateA = toSafeDate(a.date)!;
            const dateB = toSafeDate(b.date)!;
            return dateB.getTime() - dateA.getTime();
        });
    }, [userPaymentsData, showCurrentMonthInvoice, currentMonthInvoice]);

    const totalPaymentPages = Math.ceil(allPayments.length / PAYMENTS_PER_PAGE);

    const paginatedPayments = useMemo(() => {
        const startIndex = (paymentsCurrentPage - 1) * PAYMENTS_PER_PAGE;
        return allPayments.slice(startIndex, startIndex + PAYMENTS_PER_PAGE);
    }, [allPayments, paymentsCurrentPage]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: `${label} Copied!`, description: 'The ID has been copied to your clipboard.' });
        });
    };

    const handleOpenPaymentReview = (payment: Payment) => {
        onSetPaymentToReview(payment);
        onSetIsPaymentReviewOpen(true);
    };

    const handleInvoiceSelect = (id: string) => {
        setSelectedInvoiceId(id);
        const inv = paidInvoices.find(p => p.id === id);
        if (inv) {
            setCustomAmount(inv.amount.toString());
        }
    };

    const handleConfirmDispatch = async () => {
        if (!firestore || !user) return;
        
        if (recipientType === 'custom' && !customEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please provide a valid recipient email address.' });
            return;
        }

        if (docType === 'receipt' && !selectedInvoiceId) {
            toast({ variant: 'destructive', title: 'Invoice Required', description: 'Please select a paid invoice to generate a receipt.' });
            return;
        }

        setIsSending(true);
        try {
            const targetEmail = recipientType === 'custom' ? customEmail : user.email;

            if (docType === 'soa') {
                const remindersCol = collection(firestore, 'users', user.id, 'reminders');
                await addDoc(remindersCol, {
                    type: 'payment_follow_up',
                    triggeredAt: serverTimestamp(),
                    status: 'pending',
                    period: selectedPeriod,
                    recipientEmail: recipientType === 'custom' ? customEmail : null
                });
                toast({ 
                    title: 'SOA Reminder Dispatched!', 
                    description: `The Statement of Account for ${soaDateOptions.find(o => o.value === selectedPeriod)?.label} is being sent to ${targetEmail}.` 
                });
            } else {
                const receiptRequestsCol = collection(firestore, 'users', user.id, 'receiptRequests');
                await addDoc(receiptRequestsCol, {
                    invoiceId: selectedInvoiceId,
                    amount: parseFloat(customAmount) || 0,
                    requestedAt: serverTimestamp(),
                    status: 'pending',
                    recipientEmail: recipientType === 'custom' ? customEmail : null
                });
                toast({ 
                    title: 'Digital Receipt Dispatched!', 
                    description: `A customized receipt for P${parseFloat(customAmount).toFixed(2)} is being sent to ${targetEmail}.` 
                });
            }

            setIsDispatchDialogOpen(false);
            setCustomEmail('');
            setRecipientType('default');
            setSelectedInvoiceId('');
            setCustomAmount('');
        } catch (error) {
            console.error("Error triggering dispatch:", error);
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Action Header Card */}
            <Card className="border-none shadow-sm bg-muted/20">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
                    <div>
                        <CardTitle className="text-xl">Financial Command</CardTitle>
                        <CardDescription>Dispatch professional SOAs, customized receipts, or apply adjustments.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setIsDispatchDialogOpen(true)} className="flex-1 sm:flex-none h-9 bg-background shadow-sm text-xs font-bold uppercase tracking-wider">
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Dispatch Doc
                        </Button>
                        {user.accountType === 'Parent' ? (
                            <Button size="sm" onClick={() => onSetIsTopUpOpen(true)} className="flex-1 sm:flex-none h-9 shadow-md text-xs font-bold uppercase tracking-wider">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                Credit Wallet
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => onSetIsManualChargeOpen(true)} className="flex-1 sm:flex-none h-9 shadow-md text-xs font-bold uppercase tracking-wider">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                Adjustment
                            </Button>
                        )}
                    </div>
                </CardHeader>
                {user.accountType === 'Parent' && (
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-background/60 border border-white shadow-inner">
                            <div className="p-3 rounded-full bg-primary/10">
                                <Wallet className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Centralized Wallet Balance</Label>
                                <p className="text-2xl font-extrabold text-primary">₱{(user.topUpBalanceCredits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Billing Ledger</CardTitle>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest bg-white border-none shadow-sm">{allPayments.length} Documents</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table className="hidden md:table">
                        <TableHeader className="bg-muted/5">
                            <TableRow>
                                <TableHead className="pl-6 py-4">Reference</TableHead>
                                <TableHead>Statement Period</TableHead>
                                <TableHead className="text-right">Settlement Amount</TableHead>
                                <TableHead className="text-right pr-6">Current Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPayments.map(payment => {
                                const isEstimated = payment.id.startsWith('INV-EST');
                                return (
                                    <TableRow key={payment.id} onClick={() => handleOpenPaymentReview(payment)} className={cn("group cursor-pointer hover:bg-muted/30 transition-colors", isEstimated && 'bg-blue-50/30')}>
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{payment.id}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); copyToClipboard(payment.id, 'Invoice ID'); }}><Copy className="h-3 w-3" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm font-semibold">{payment.description}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{toSafeDate(payment.date)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <p className="font-extrabold text-sm">₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Badge
                                                    variant={isEstimated ? 'outline' : 'default'}
                                                    className={cn(
                                                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border shadow-sm",
                                                        isEstimated ? 'border-blue-300 text-blue-600 bg-blue-50/50' :
                                                        payment.status === 'Pending Review' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        payment.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        payment.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-gray-50 text-gray-700 border-gray-200'
                                                    )}
                                                >
                                                    {isEstimated ? 'Estimated' : payment.status}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                             {paginatedPayments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <Receipt className="h-10 w-10" />
                                            <p className="text-sm font-bold uppercase tracking-widest">Empty Ledger</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    
                    <div className="space-y-4 md:hidden p-4">
                        {paginatedPayments.map(payment => {
                            const isEstimated = payment.id.startsWith('INV-EST');
                            return (
                                <Card key={payment.id} onClick={() => handleOpenPaymentReview(payment)} className={cn("shadow-none border cursor-pointer transition-transform active:scale-[0.98]", isEstimated ? "bg-blue-50/30" : "bg-muted/10")}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{payment.id}</p>
                                                <p className="font-bold text-sm">{payment.description}</p>
                                            </div>
                                            <Badge
                                                variant={isEstimated ? 'outline' : 'default'}
                                                className={cn(
                                                    "text-[9px] uppercase font-bold",
                                                    isEstimated ? 'border-blue-300 text-blue-600' :
                                                    payment.status === 'Pending Review' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                    payment.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                                )}
                                            >
                                                {isEstimated ? 'Est.' : payment.status}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center pt-1 border-t">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Amount:</span>
                                            <p className="font-extrabold text-sm">₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/5 py-4 flex items-center justify-between border-t">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Ledger {allPayments.length} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setPaymentsCurrentPage(p => Math.max(1, p - 1))} disabled={paymentsCurrentPage === 1}>Prev</Button>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground px-2">{paymentsCurrentPage} / {totalPaymentPages || 1}</span>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setPaymentsCurrentPage(p => Math.min(totalPaymentPages, p + 1))} disabled={paymentsCurrentPage === totalPaymentPages || totalPaymentPages === 0}>Next</Button>
                    </div>
                </CardFooter>
            </Card>

            <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-primary" />
                            Dispatch Professional Document
                        </DialogTitle>
                        <DialogDescription>
                            Securely send Statement of Accounts or Receipts to client stakeholders.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">1. Workflow Selection</Label>
                            <Tabs value={docType} onValueChange={(v: any) => setDocType(v)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                                    <TabsTrigger value="soa" className="gap-2 text-[10px] font-bold uppercase tracking-widest"><FileText className="h-3.5 w-3.5" /> Statement</TabsTrigger>
                                    <TabsTrigger value="receipt" className="gap-2 text-[10px] font-bold uppercase tracking-widest"><Receipt className="h-3.5 w-3.5" /> Receipt</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {docType === 'soa' ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">2. Select Target Period</Label>
                                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                    <SelectTrigger className="bg-muted/10 h-10">
                                        <SelectValue placeholder="Select a period..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {soaDateOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value} className="text-xs font-medium uppercase tracking-tight">{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">2. Select Historical Payment</Label>
                                    <Select value={selectedInvoiceId} onValueChange={handleInvoiceSelect}>
                                        <SelectTrigger className="bg-muted/10 h-10">
                                            <SelectValue placeholder="Select an invoice..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paidInvoices.length > 0 ? paidInvoices.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="text-xs font-medium uppercase tracking-tight">{p.description} • ₱{p.amount.toLocaleString()}</SelectItem>
                                            )) : (
                                                <div className="p-4 text-[10px] font-bold text-muted-foreground text-center uppercase tracking-widest">No paid invoices found</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedInvoiceId && (
                                    <div className="space-y-2 pt-1">
                                        <Label htmlFor="receiptAmount" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">3. Final Amount for Receipt (PHP)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">₱</span>
                                            <Input 
                                                id="receiptAmount" 
                                                type="number" 
                                                value={customAmount} 
                                                onChange={(e) => setCustomAmount(e.target.value)}
                                                className="pl-7 h-10 font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2">
                                            <Info className="h-3 w-3" />
                                            Partial payments or adjustments can be manually entered here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {docType === 'soa' ? '3. Recipient Broadcast' : '4. Recipient Broadcast'}
                            </Label>
                            <RadioGroup value={recipientType} onValueChange={(val: any) => setRecipientType(val)} className="grid gap-2">
                                <div className={cn("flex items-center space-x-3 rounded-xl border p-4 cursor-pointer transition-all", recipientType === 'default' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/50')}>
                                    <RadioGroupItem value="default" id="r-default" className="border-muted-foreground/30" />
                                    <Label htmlFor="r-default" className="flex-1 cursor-pointer">
                                        <span className="block font-bold text-sm">Default Business Address</span>
                                        <span className="block text-xs text-muted-foreground font-medium">{user.email}</span>
                                    </Label>
                                </div>
                                <div className={cn("flex flex-col space-y-3 rounded-xl border p-4 cursor-pointer transition-all", recipientType === 'custom' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/50')}>
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="custom" id="r-custom" className="border-muted-foreground/30" />
                                        <Label htmlFor="r-custom" className="flex-1 font-bold text-sm cursor-pointer">Manual Email Entry</Label>
                                    </div>
                                    {recipientType === 'custom' && (
                                        <Input 
                                            placeholder="accounting@clientcompany.com" 
                                            value={customEmail}
                                            onChange={(e) => setCustomEmail(e.target.value)}
                                            className="h-9 text-xs bg-white/50"
                                            disabled={isSending}
                                        />
                                    )}
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter className="bg-muted/10 p-6 -mx-6 -mb-6 rounded-b-lg border-t">
                        <DialogClose asChild><Button variant="ghost" disabled={isSending} size="sm" className="text-[10px] uppercase font-bold tracking-widest">Dismiss</Button></DialogClose>
                        <Button onClick={handleConfirmDispatch} disabled={isSending || (docType === 'receipt' && !selectedInvoiceId)} size="sm" className="shadow-lg text-[10px] uppercase font-bold tracking-widest px-8">
                            {isSending ? <div className="h-4 w-4 border-2 border-dashed rounded-full animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            {isSending ? "Preparing PDF..." : `Authorize Dispatch`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
