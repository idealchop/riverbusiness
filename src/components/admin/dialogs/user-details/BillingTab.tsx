
'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppUser, Payment } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { PlusCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
    const PAYMENTS_PER_PAGE = 5;

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
        if (payment.status !== 'Pending Review') {
            toast({
                title: 'No action needed',
                description: `This payment is already marked as '${payment.status}'.`,
            });
            return;
        }
        if (!payment.proofOfPaymentUrl) {
            toast({
                variant: 'destructive',
                title: 'No Proof Available',
                description: 'There is no proof of payment uploaded for this invoice.',
            });
            return;
        }
        onSetPaymentToReview(payment);
        onSetIsPaymentReviewOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Billing & Invoices</CardTitle>
                    <CardDescription>Manage invoices and charges.</CardDescription>
                </div>
                {user.accountType === 'Parent' ? (
                    <Button onClick={() => onSetIsTopUpOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Top-up Credits</Button>
                ) : (
                    <Button onClick={() => onSetIsManualChargeOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add Manual Charge</Button>
                )}
            </CardHeader>
            <CardContent>
                {user.accountType === 'Parent' && (
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Current Credit Balance</p>
                        <p className="text-2xl font-bold">₱{(user.topUpBalanceCredits || 0).toLocaleString()}</p>
                    </div>
                )}
                <Table>
                    <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {paginatedPayments.map(payment => {
                            const isEstimated = payment.id.startsWith('INV-EST');
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
                    </TableBody>
                </Table>
                <div className="flex items-center justify-end space-x-2 pt-4">
                    <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(p => Math.max(1, p - 1))} disabled={paymentsCurrentPage === 1}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {paymentsCurrentPage} of {totalPaymentPages > 0 ? totalPaymentPages : 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(p => Math.min(totalPaymentPages, p + 1))} disabled={paymentsCurrentPage === totalPaymentPages || totalPaymentPages === 0}>Next</Button>
                </div>
            </CardContent>
        </Card>
    );
}
