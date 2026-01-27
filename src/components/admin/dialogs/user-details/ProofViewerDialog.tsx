'use client';
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Download, Expand, Shrink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProofViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  proofUrl: string | null;
}

export function ProofViewerDialog({ isOpen, onOpenChange, proofUrl }: ProofViewerDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset zoom when dialog is closed or URL changes
    if (!isOpen) {
      setZoom(1);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (!proofUrl) return;
    const link = document.createElement('a');
    link.href = proofUrl;
    link.download = `proof-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullScreen = () => {
    if (!dialogContentRef.current) return;

    if (!document.fullscreenElement) {
      dialogContentRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className={cn("sm:max-w-2xl lg:max-w-4xl h-full w-full sm:h-[90vh] sm:w-[90vw] flex flex-col p-0 transition-all", isFullScreen && "max-w-full w-full h-full max-h-full sm:max-h-full rounded-none border-0")}>
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Proof of Delivery</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/40 relative min-h-0">
          {proofUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={proofUrl}
                alt="Proof of delivery"
                fill
                className="object-contain transition-transform duration-300"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : (
             <div className="py-10 text-center">
               <p className="text-muted-foreground">No proof available.</p>
             </div>
          )}
        </div>
        <DialogFooter className="p-2 border-t flex-shrink-0 bg-background flex-row justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} disabled={!proofUrl}>
              <ZoomOut />
              <span className="sr-only">Zoom Out</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.2))} disabled={!proofUrl}>
              <ZoomIn />
              <span className="sr-only">Zoom In</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="icon" onClick={handleDownload} disabled={!proofUrl}>
                <Download />
                <span className="sr-only">Download</span>
            </Button>
             <Button variant="outline" size="icon" onClick={toggleFullScreen} disabled={!proofUrl}>
                {isFullScreen ? <Shrink /> : <Expand />}
                <span className="sr-only">{isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
            </Button>
            <DialogClose asChild>
                <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
