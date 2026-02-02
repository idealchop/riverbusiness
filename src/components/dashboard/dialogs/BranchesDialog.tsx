'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AppUser } from '@/lib/types';
import { UserCheck } from 'lucide-react';

interface BranchesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  branchUsers: AppUser[] | null;
}

export function BranchesDialog({ isOpen, onOpenChange, branchUsers }: BranchesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck /> Linked Branch Accounts
          </DialogTitle>
          <DialogDescription>
            These accounts consume from your central credit balance.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Contact Person</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchUsers && branchUsers.length > 0 ? (
                branchUsers.map(branch => (
                  <TableRow key={branch.id}>
                    <TableCell>{branch.clientId}</TableCell>
                    <TableCell>{branch.businessName}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No branches linked to this parent account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
