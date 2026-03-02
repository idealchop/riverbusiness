'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CreditCard, 
  User, 
  Receipt, 
  MousePointer2, 
  Upload, 
  CheckCircle2,
  BadgeInfo
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PaymentsDocumentationPage() {
  const steps = [
    {
      icon: User,
      title: "Go to Profile Account",
      description: "Click on your profile avatar or business name in the top right corner of the dashboard."
    },
    {
      icon: Receipt,
      title: "Navigate to Invoices Tab",
      description: "In the account dialog, select the 'Invoices' tab to view your billing history."
    },
    {
      icon: MousePointer2,
      title: "Click 'Pay Now'",
      description: "Locate your current or upcoming bill and click the 'Pay Now' button to start the process."
    },
    {
      icon: CreditCard,
      title: "Choose Payment Option",
      description: "Select your preferred payment channel, such as GCash, BPI, or Maya."
    },
    {
      icon: Upload,
      title: "Upload Proof of Payment",
      description: "Settle the amount via your chosen app, then upload a screenshot of the receipt and click 'Submit Proof'."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-500" />
          Payments & Billing
        </h1>
        <p className="text-muted-foreground text-lg">Follow this guide to settle your invoices and keep your service flowing.</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-none">Step-by-Step Guide</Badge>
          </div>
          <CardTitle className="text-2xl">How to Pay Your Bill</CardTitle>
          <CardDescription className="text-primary-foreground/80 text-base">
            Our automated billing system provides a transparent way to track and pay for your water consumption.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-8">
            <div className="grid gap-8">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-6 relative">
                  {index !== steps.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-[-32px] w-0.5 bg-muted hidden md:block" />
                  )}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary z-10 border shadow-sm">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <h3 className="font-bold text-lg flex items-center gap-3">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Step {index + 1}</span>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900">Verification Process</h4>
                <p className="text-sm text-blue-800/80 leading-relaxed">
                  Once you upload your receipt, our finance team manually validates the transaction. 
                  Once verified, your invoice status will change to <span className="font-bold">Paid</span> and your available water credits will be updated.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Video Embed */}
          <div className="bg-muted/50 p-6 md:p-12 border-t">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                <BadgeInfo className="h-3 w-3" />
                Interactive Walkthrough
              </div>
              <h3 className="text-xl font-bold">Watch the Payment Process</h3>
              <p className="text-muted-foreground">See exactly how to navigate the dashboard to submit your proof of payment.</p>
            </div>
            
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-black max-w-4xl mx-auto border-4 border-white">
              <div style={{ position: 'relative', paddingBottom: 'calc(53.8889% + 41px)', height: '0px', width: '100%' }}>
                <iframe 
                  src="https://demo.arcade.software/0Jp6X9WfGOWPdc48LKB8?embed&embed_mobile=inline&embed_desktop=inline&squared=true&show_copy_link=true" 
                  title="Submit Proof of Payment for Water Bill Invoice" 
                  frameBorder="0" 
                  loading="lazy" 
                  webkitallowfullscreen="true" 
                  mozallowfullscreen="true" 
                  allowFullScreen 
                  allow="clipboard-write" 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', colorScheme: 'light' }} 
                ></iframe>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
