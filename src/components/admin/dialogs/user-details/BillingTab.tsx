
'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AppUser, Payment } from '@/lib/types';
import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Copy, Send, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
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
    onSetIsChangePlanOpen: (isOpen: boolean) => void;
}

export function BillingTab({
    user,
    userPaymentsData,
    currentMonthInvoice,
    onSetIsManualChargeOpen,
    onSetIsTopUpOpen,
    onSetPaymentToReview,
    onSetIsPaymentReviewOpen,
    onSetIsChangePlanOpen,
}: BillingTabProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
    const [isSendingReminder, setIsSendingReminder] = useState(false);
    const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('full');
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

    const handleConfirmSendReminder = async () => {
        if (!firestore || !user) return;
        
        if (recipientType === 'custom' && !customEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please provide a valid recipient email address.' });
            return;
        }

        setIsSendingReminder(true);
        try {
            const remindersCol = collection(firestore, 'users', user.id, 'reminders');
            await addDoc(remindersCol, {
                type: 'payment_follow_up',
                triggeredAt: serverTimestamp(),
                status: 'pending',
                period: selectedPeriod,
                recipientEmail: recipientType === 'custom' ? customEmail : null
            });
            const targetLabel = recipientType === 'custom' ? customEmail : user.email;
            toast({ 
                title: 'Reminder Dispatched!', 
                description: `A statement reminder for ${soaDateOptions.find(o => o.value === selectedPeriod)?.label} is being sent to ${targetLabel}.` 
            });
            setIsReminderDialogOpen(false);
            setCustomEmail('');
            setRecipientType('default');
        } catch (error) {
            console.error("Error triggering reminder:", error);
            toast({ variant: 'destructive', title: 'Action Failed' });
        } finally {
            setIsSendingReminder(false);
        }
    };

    return (
        <>
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Billing & Invoices</CardTitle>
                    <CardDescription>Manage invoices and charges.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onSetIsChangePlanOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Change Plan
                    </Button>
                    <Button variant="outline" onClick={() => setIsReminderDialogOpen(true)}>
                        <Send className="mr-2 h-4 w-4" />
                        Send Statement Reminder
                    </Button>
                    {user.accountType === 'Parent' ? (
                        <Button onClick={() => onSetIsTopUpOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Top-up Credits</Button>
                    ) : (
                        <Button onClick={() => onSetIsManualChargeOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add Adjustment</Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {user.accountType === 'Parent' && (
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Current Credit Balance</p>
                        <p className="text-2xl font-bold">₱{(user.topUpBalanceCredits || 0).toLocaleString()}</p>
                    </div>
                )}
                <Table className="hidden md:table">
                    <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {paginatedPayments.map(payment => {
                            const isEstimated = payment.id.startsWith('INV-EST') || payment.id.startsWith('INV-EST-');
                            return (
                                <TableRow key={payment.id} className={cn(isEstimated && 'bg-blue-50')}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs">{payment.id}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(payment.id, 'Invoice ID')}><Copy className="h-3 w-3" /></Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>{toSafeDate(payment.date)?.toLocaleDateString()}</TableCell>
                                    <TableCell>{payment.description}</TableCell>
                                    <TableCell>₱{payment.amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge
                                            onClick={() => handleOpenPaymentReview(payment)}
                                            variant={isEstimated ? 'outline' : 'default'}
                                            className={cn(
                                                "cursor-pointer",
                                                isEstimated ? 'border-blue-500 text-blue-600' :
                                                    payment.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                                        payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                            payment.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                            )}
                                        >
                                            {isEstimated ? 'Estimated' : payment.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                         {paginatedPayments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No invoices found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                <div className="space-y-4 md:hidden">
                    {paginatedPayments.map(payment => {
                        const isEstimated = payment.id.startsWith('INV-EST') || payment.id.startsWith('INV-EST-');
                        return (
                        <Card key={payment.id} onClick={() => handleOpenPaymentReview(payment)} className="cursor-pointer">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{payment.description}</p>
                                        <p className="text-xs text-muted-foreground">{toSafeDate(payment.date)?.toLocaleDateString()}</p>
                                        <p className="text-sm">₱{payment.amount.toLocaleString()}</p>
                                    </div>
                                    <Badge
                                        variant={isEstimated ? 'outline' : 'default'}
                                        className={cn(
                                            isEstimated ? 'border-blue-500 text-blue-600' :
                                                payment.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                                payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                payment.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        )}
                                    >
                                        {isEstimated ? 'Estimated' : payment.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground pt-1">ID: {payment.id}</p>
                            </CardContent>
                        </Card>
                    )})}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4">
                    <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(p => Math.max(1, p - 1))} disabled={paymentsCurrentPage === 1}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {paymentsCurrentPage} of {totalPaymentPages > 0 ? totalPaymentPages : 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(p => Math.min(totalPaymentPages, p + 1))} disabled={paymentsCurrentPage === totalPaymentPages || totalPaymentPages === 0}>Next</Button>
                </div>
            </CardContent>
        </Card>

        <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Send Statement Reminder
                    </DialogTitle>
                    <DialogDescription>
                        This will send a professional follow-up email with the <strong>Statement of Account (SOA)</strong> attached as a password-protected PDF.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">1. Select Billing Period</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a period..." />
                            </SelectTrigger>
                            <SelectContent>
                                {soaDateOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">2. Choose Recipient</Label>
                        <RadioGroup value={recipientType} onValueChange={(val: any) => setRecipientType(val)} className="grid gap-2">
                            <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
                                <RadioGroupItem value="default" id="r-default" />
                                <Label htmlFor="r-default" className="flex-1 cursor-pointer">
                                    <span className="block font-medium">Default Address</span>
                                    <span className="block text-xs text-muted-foreground">{user.email}</span>
                                </Label>
                            </div>
                            <div className="flex flex-col space-y-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="custom" id="r-custom" />
                                    <Label htmlFor="r-custom" className="flex-1 font-medium cursor-pointer">Custom Recipient Email</Label>
                                </div>
                                {recipientType === 'custom' && (
                                    <Input 
                                        placeholder="e.g. accounting@clientcompany.com" 
                                        value={customEmail}
                                        onChange={(e) => setCustomEmail(e.target.value)}
                                        className="h-8 text-sm mt-2"
                                        disabled={isSendingReminder}
                                    />
                                )}
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSendingReminder}>Cancel</Button></DialogClose>
                    <Button onClick={handleConfirmSendReminder} disabled={isSendingReminder}>
                        {isSendingReminder ? "Sending..." : "Send Reminder Email"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
