'use client';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { AppUser, Payment } from '@/lib/types';
import { MapPin, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


// Helper to safely convert different timestamp formats to a Date object
const toSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000);
    }
    return null;
};

// New Sub-component for showing a branch's invoices
function BranchInvoicesDialog({ branch, isOpen, onOpenChange }: { branch: AppUser | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const firestore = useFirestore();

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !branch) return null;
    return query(collection(firestore, 'users', branch.id, 'payments'), orderBy('date', 'desc'));
  }, [firestore, branch]);

  const { data: invoices, isLoading } = useCollection<Payment>(invoicesQuery);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoices for {branch?.businessName}</DialogTitle>
          <DialogDescription>Viewing invoice history for this location.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p>Loading invoices...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices && invoices.length > 0 ? (
                  invoices.map(invoice => {
                    const invoiceDate = toSafeDate(invoice.date);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoiceDate ? format(invoiceDate, 'PP') : 'N/A'}</TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell>₱{invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">{invoice.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No invoices found for this location.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


interface BranchesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  branchUsers: AppUser[] | null;
}

export function BranchesDialog({ isOpen, onOpenChange, branchUsers }: BranchesDialogProps) {
  const [viewingBranch, setViewingBranch] = useState<AppUser | null>(null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin /> Managed Locations
            </DialogTitle>
            <DialogDescription>
              A list of all business locations linked to this parent account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {/* Desktop Table View */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Location ID</TableHead>
                  <TableHead>Location Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchUsers && branchUsers.length > 0 ? (
                  branchUsers.map(branch => (
                    <TableRow key={branch.id}>
                      <TableCell>{branch.clientId}</TableCell>
                      <TableCell>{branch.businessName}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setViewingBranch(branch)}>
                          <Receipt className="mr-2 h-4 w-4" />
                          View Invoices
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      No locations linked to this parent account.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
               {branchUsers && branchUsers.length > 0 ? (
                  branchUsers.map(branch => (
                      <Card key={branch.id}>
                          <CardContent className="p-4 space-y-3">
                               <div>
                                  <p className="font-semibold">{branch.businessName}</p>
                                  <p className="text-xs text-muted-foreground">ID: {branch.clientId}</p>
                              </div>
                              <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingBranch(branch)}>
                                <Receipt className="mr-2 h-4 w-4" />
                                View Invoices
                              </Button>
                          </CardContent>
                      </Card>
                  ))
               ) : (
                  <div className="text-center text-muted-foreground py-10">
                      <p>No locations linked to this parent account.</p>
                  </div>
               )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <BranchInvoicesDialog 
        branch={viewingBranch}
        isOpen={!!viewingBranch}
        onOpenChange={() => setViewingBranch(null)}
      />
    </>
  );
}
