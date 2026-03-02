'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  CreditCard, 
  User, 
  Receipt, 
  MousePointer2, 
  CheckCircle2, 
  Upload, 
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';

export default function DocumentationPage() {
  const { user } = useUser();

  const paymentSteps = [
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
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Documentation & Resources</h1>
            <p className="text-muted-foreground">Helpful guides to help you manage your water more efficiently.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={user ? "/dashboard" : "/login"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {user ? "Back to Dashboard" : "Back to Login"}
            </Link>
          </Button>
        </div>

        <div className="grid gap-8">
          {/* Payment Guide Section */}
          <section id="payments">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground p-8">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-8 w-8" />
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">Step-by-Step Guide</Badge>
                </div>
                <CardTitle className="text-2xl">Settling Your Invoices</CardTitle>
                <CardDescription className="text-primary-foreground/80 text-base">
                  Follow this simple process to settle your water bills and keep your account in good standing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-8">
                  <div className="grid gap-6">
                    {paymentSteps.map((step, index) => (
                      <div key={index} className="flex gap-4 relative">
                        {index !== paymentSteps.length - 1 && (
                          <div className="absolute left-6 top-12 bottom-[-24px] w-0.5 bg-muted hidden md:block" />
                        )}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary z-10">
                          <step.icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1 pt-1.5">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-mono">Step {index + 1}:</span>
                            {step.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed max-w-2xl">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-6 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-blue-900">Why upload proof?</h4>
                      <p className="text-sm text-blue-800/80 leading-relaxed">
                        Uploading your receipt allows our finance team to manually validate your transaction. Once verified, 
                        your invoice status will change to <span className="font-bold underline decoration-dotted">Paid</span> and your available water credits (for fixed plans) will be updated accordingly.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Arcade Interactive Video Embed */}
                <div className="bg-muted/50 p-4 md:p-12 border-t">
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold">Interactive Walkthrough</h3>
                    <p className="text-muted-foreground">Click through this interactive demo to see the payment process in action.</p>
                  </div>
                  
                  <div className="rounded-xl overflow-hidden shadow-2xl bg-black">
                    {/* ARCADE EMBED START */}
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
                    {/* ARCADE EMBED END */}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Footer Contact */}
          <Card className="bg-accent/50 border-none">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-lg font-bold">Still have questions?</h3>
                <p className="text-sm text-muted-foreground">Our support team is here to help you with any billing or platform inquiries.</p>
              </div>
              <div className="flex gap-3">
                <Button asChild>
                  <a href="mailto:customers@riverph.com">Email Support</a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "secondary" | "outline" }) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-input bg-background"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
