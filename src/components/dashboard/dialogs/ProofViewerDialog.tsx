'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

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
            <div className="relative w-full aspect-[9/16] max-h-[70vh]">
              <Image src={proofUrl} alt="Proof of delivery" fill className="rounded-md object-contain" />
            </div>
          </div>
        ) : (
           <div className="py-10 text-center">
             <p className="text-muted-foreground">No proof available.</p>
           </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
