'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hourglass } from 'lucide-react';
import Image from 'next/image';

interface AttachmentViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  attachmentUrl: string | null;
}

export function AttachmentViewerDialog({ isOpen, onOpenChange, attachmentUrl }: AttachmentViewerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Attachment Viewer</DialogTitle>
        </DialogHeader>
        {attachmentUrl && attachmentUrl !== 'pending' ? (
          <div className="py-4 flex justify-center">
            <Image src={attachmentUrl} alt="Attachment" width={400} height={600} className="rounded-md object-contain max-h-[70vh]" />
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-4">
            <Hourglass className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Attachment Not Yet Available</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Our team is processing the attachment. It will be available here shortly. Thank you for your patience.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
