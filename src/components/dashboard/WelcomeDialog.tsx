'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart,
  Repeat,
  CreditCard,
  FileText,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WelcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}

const features = [
  {
    icon: BarChart,
    text: 'Monitor Usage: Track your real-time consumption and never run out again.',
  },
  {
    icon: Repeat,
    text: 'Flexible Ordering: Choose Set & Forget for auto-delivery or On-Demand for quick refills.',
  },
  {
    icon: CreditCard,
    text: 'Seamless Payments: Pay securely via GCash, Maya, or Card—no more searching for change.',
  },
  {
    icon: FileText,
    text: 'Billing & Records: View and download your SOA and Invoices instantly to stay organized.',
  },
  {
    icon: ShieldCheck,
    text: "Quality Guaranteed: See your provider's DOH permits and safety checks directly in the app.",
  },
  {
    icon: Truck,
    text: 'Track Progress: Get real-time updates from preparation to your doorstep.',
  },
];

export function WelcomeDialog({
  isOpen,
  onOpenChange,
  user,
}: WelcomeDialogProps) {
  const welcomeImage = PlaceHolderImages.find((p) => p.id === 'welcome-river');
  const userFirstName = user?.name.split(' ')[0] || 'there';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 grid-rows-[auto_1fr_auto] max-h-[90vh]">
        <div className="grid md:grid-cols-2 h-full">
          <div className="relative h-48 md:h-full">
            {welcomeImage && (
              <Image
                src={welcomeImage.imageUrl}
                alt={welcomeImage.description}
                fill
                className="object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                data-ai-hint={welcomeImage.imageHint}
              />
            )}
          </div>
          <div className="flex flex-col">
            <DialogHeader className="p-6 pb-0 md:p-8 md:pb-0">
              <DialogTitle className="text-2xl font-bold">
                Your Water, Now Smarter. 🌊
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Hi {userFirstName},
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="px-6 md:px-8">
              <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Welcome to the future of convenience! We’ve made water refills
                  effortless. Here’s what you can do:
                </p>
                <ul className="space-y-3">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <li key={index} className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {feature.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </ScrollArea>
             <DialogFooter className="p-6 pt-0 md:p-8 md:pt-4 mt-auto">
              <DialogClose asChild>
                <Button type="button" className="w-full">
                  Explore Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
