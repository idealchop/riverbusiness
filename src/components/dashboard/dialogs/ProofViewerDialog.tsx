'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

interface ProofViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  proofUrl: string | null;
}

export function ProofViewerDialog({ isOpen, onOpenChange, proofUrl }: ProofViewerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proof of Delivery</DialogTitle>
        </DialogHeader>
        {proofUrl && (
          <div className="py-4 flex justify-center">
            <Image src={proofUrl} alt="Proof of delivery" width={400} height={600} className="rounded-md object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
