'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Chatbot } from '@/components/chatbot';

export default function SupportPage() {

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                Reach out to us through any of the channels below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-md border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Phone Support</p>
                  <a href="tel:1-800-555-1234" className="text-sm text-muted-foreground hover:text-primary">1-800-555-1234</a>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-md border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Email Support</p>
                  <a href="mailto:support@riverbusiness.com" className="text-sm text-muted-foreground hover:text-primary">support@riverbusiness.com</a>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground pt-4">
                Our support team is available Monday to Friday, 9:00 AM to 5:00 PM.
              </div>
            </CardContent>
          </Card>
      </div>
       <div className="md:col-span-1">
        <Chatbot />
      </div>
    </div>
  );
}
