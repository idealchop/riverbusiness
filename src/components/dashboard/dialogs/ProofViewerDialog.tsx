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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Proof of Delivery</DialogTitle>
        </DialogHeader>
        {proofUrl ? (
          <div className="py-4 flex justify-center">
            <Image src={proofUrl} alt="Proof of delivery" width={400} height={600} className="rounded-md object-contain max-h-[70vh]" />
          </div>
        ) : (
           <div className="py-10 text-center">
             <p className="text-muted-foreground">No proof available.</p>
           </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
