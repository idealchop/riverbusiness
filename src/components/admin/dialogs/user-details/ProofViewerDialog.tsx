
'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

interface ProofViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  proofUrl: string | null;
}

export function ProofViewerDialog({ isOpen, onOpenChange, proofUrl }: ProofViewerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proof of Delivery</DialogTitle>
        </DialogHeader>
        {proofUrl && <div className="relative w-full aspect-auto h-[70vh]"><Image src={proofUrl} alt="Proof of delivery" layout="fill" className="object-contain rounded-md" /></div>}
      </DialogContent>
    </Dialog>
  );
}
