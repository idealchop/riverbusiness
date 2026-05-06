'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      console.error('[Firebase Permission Error]', error);
      
      toast({
        variant: 'destructive',
        title: 'Security Access Denied',
        description: `You do not have permission to ${error.context.operation} at ${error.context.path}. Please contact your administrator.`,
      });

      // In development, we want this to be very visible
      if (process.env.NODE_ENV === 'development') {
        // Throwing here will trigger the Next.js error overlay with contextual data
        // provided the agent has correctly implemented the error class.
        // throw error; 
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.removeListener('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
