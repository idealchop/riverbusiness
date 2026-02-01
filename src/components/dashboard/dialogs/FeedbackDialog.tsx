
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function FeedbackDialog({ isOpen, onOpenChange }: FeedbackDialogProps) {
  const { toast } = useToast();
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);

  const handleFeedbackSubmit = () => {
    toast({
        title: 'Feedback Received',
        description: 'Thank you for your valuable input. We appreciate it!',
    });
    onOpenChange(false);
    setFeedbackMessage('');
    setFeedbackRating(0);
    setHoverRating(0);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            We value your opinion. Let us know how we can improve.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-8 w-8 cursor-pointer transition-colors",
                  (hoverRating || feedbackRating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                )}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setFeedbackRating(star)}
              />
            ))}
          </div>
          <Textarea
            placeholder="Tell us more about your experience..."
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleFeedbackSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
