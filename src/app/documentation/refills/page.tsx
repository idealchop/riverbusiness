'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Droplets, 
  Truck, 
  Calendar as CalendarIcon, 
  History,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RefillsDocumentationPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Droplets className="h-8 w-8 text-cyan-500" />
          Refill Requests
        </h1>
        <p className="text-muted-foreground text-lg">Never run dry. Manage your water supply with automated and manual refill options.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg border-t-4 border-t-cyan-500">
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center mb-4">
              <Truck className="h-6 w-6 text-cyan-600" />
            </div>
            <CardTitle>ASAP vs. Scheduled Refills</CardTitle>
            <CardDescription>Get water exactly when you need it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-5 rounded-2xl border bg-cyan-50/30">
              <h4 className="font-bold text-cyan-900 flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" /> ASAP Refill
              </h4>
              <p className="text-sm text-cyan-800/80 leading-relaxed">
                Need water immediately? Use the main "Request Refill" button on your dashboard. 
                This places you in the immediate queue for the next available delivery team in your area.
              </p>
            </div>
            <div className="p-5 rounded-2xl border bg-slate-50/50">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <CalendarIcon className="h-4 w-4 text-slate-600" /> Scheduled Refill
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Planning ahead? You can schedule a specific date and container quantity. 
                Useful for office events or preparing for expected high-consumption days.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Tracking Your Delivery</CardTitle>
            <CardDescription>Know the status of your fresh water at every stage.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 px-6 pb-6">
            <div className="space-y-6 relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-muted" />
              
              <div className="flex gap-4 relative z-10">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md">1</div>
                <div>
                  <p className="font-bold">Requested</p>
                  <p className="text-sm text-muted-foreground">Your request is received and the fulfillment team is alerted.</p>
                </div>
              </div>

              <div className="flex gap-4 relative z-10">
                <div className="h-8 w-8 rounded-full bg-blue-400 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md">2</div>
                <div>
                  <p className="font-bold">In Production</p>
                  <p className="text-sm text-muted-foreground">Your specific containers are being sanitized and filled at the station.</p>
                </div>
              </div>

              <div className="flex gap-4 relative z-10">
                <div className="h-8 w-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0 shadow-md">3</div>
                <div>
                  <p className="font-bold">Out for Delivery</p>
                  <p className="text-sm text-muted-foreground">The delivery truck has left the station and is navigating to your address.</p>
                </div>
              </div>

              <div className="flex gap-4 relative z-10">
                <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold">Completed</p>
                  <p className="text-sm text-muted-foreground">Delivery is finalized and your Proof of Delivery (POD) is available.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <BadgeInfo className="h-6 w-6 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            <strong>Note:</strong> ASAP refills are prioritized based on the proximity of our delivery teams. On peak days, scheduling 24 hours in advance is recommended.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { BadgeInfo } from 'lucide-react';
