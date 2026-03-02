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
  ArrowLeft,
  Droplets,
  ShieldCheck,
  KeyRound,
  History,
  Truck,
  Wrench,
  Settings,
  Mail,
  Smartphone,
  Calendar as CalendarIcon
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DocumentationPage() {
  const { user } = useUser();

  const sections = [
    { id: 'payments', title: 'Payments', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'refills', title: 'Refill Requests', icon: Droplets, color: 'bg-cyan-500' },
    { id: 'compliance', title: 'Quality & Compliance', icon: ShieldCheck, color: 'bg-green-500' },
    { id: 'security', title: 'Security', icon: KeyRound, color: 'bg-purple-500' },
    { id: 'account', title: 'Account Management', icon: User, color: 'bg-slate-500' },
  ];

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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Documentation & Resources</h1>
            <p className="text-muted-foreground">Everything you need to manage your smart water service.</p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href={user ? "/dashboard" : "/login"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {user ? "Back to Dashboard" : "Back to Login"}
            </Link>
          </Button>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-12">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="group">
              <Card className="hover:border-primary transition-colors text-center p-4 h-full flex flex-col items-center justify-center gap-2">
                <div className={cn("p-2 rounded-lg text-white", section.color)}>
                  <section.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">{section.title}</span>
              </Card>
            </a>
          ))}
        </div>

        <div className="space-y-16 pb-20">
          {/* Payment Guide Section */}
          <section id="payments" className="scroll-mt-20">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground p-8">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-8 w-8" />
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">Billing</Badge>
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
                      <h4 className="font-bold text-blue-900">Verification Process</h4>
                      <p className="text-sm text-blue-800/80 leading-relaxed">
                        Uploading your receipt allows our finance team to manually validate your transaction. Once verified, 
                        your invoice status will change to <span className="font-bold underline decoration-dotted">Paid</span> and your available water credits will be updated.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 md:p-12 border-t">
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold">Interactive Walkthrough</h3>
                    <p className="text-muted-foreground">Watch how to submit proof of payment.</p>
                  </div>
                  
                  <div className="rounded-xl overflow-hidden shadow-2xl bg-black max-w-4xl mx-auto">
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
          </section>

          {/* Refill Requests Section */}
          <section id="refills" className="scroll-mt-20">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <Droplets className="h-8 w-8 text-cyan-500 mb-2" />
                  <CardTitle>ASAP vs. Scheduled Refills</CardTitle>
                  <CardDescription>Get water exactly when you need it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border bg-cyan-50/50">
                    <h4 className="font-bold text-cyan-900 flex items-center gap-2">
                      <Truck className="h-4 w-4" /> ASAP Refill
                    </h4>
                    <p className="text-sm text-cyan-800/80 mt-1">
                      Need water immediately? Use the main "Request Refill" button on your dashboard. 
                      This places you in the immediate queue for the next available delivery team in your area.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-bold flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" /> Scheduled Refill
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Planning ahead? You can schedule a specific date and container quantity. 
                      Useful for office events or preparing for expected high-consumption days.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <History className="h-8 w-8 text-cyan-500 mb-2" />
                  <CardTitle>Tracking Status</CardTitle>
                  <CardDescription>Know exactly where your water is.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <div>
                      <p className="text-sm font-semibold">Requested</p>
                      <p className="text-xs text-muted-foreground">Your request has hit our system and the fulfillment team is alerted.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <div>
                      <p className="text-sm font-semibold">In Production</p>
                      <p className="text-xs text-muted-foreground">Your specific containers are being filled and quality-checked at the station.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <div>
                      <p className="text-sm font-semibold">Out for Delivery</p>
                      <p className="text-xs text-muted-foreground">The delivery truck has left the station and is navigating to your address.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Quality & Compliance Section */}
          <section id="compliance" className="scroll-mt-20">
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-3">
                <div className="p-8 bg-green-500 text-white md:col-span-1">
                  <ShieldCheck className="h-12 w-12 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Quality & Compliance</h2>
                  <p className="text-green-50/80 text-sm leading-relaxed">
                    We believe in radical transparency. Every drop of water delivered is backed by rigorous testing and regular sanitation of your equipment.
                  </p>
                </div>
                <div className="p-8 md:col-span-2 grid gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" /> Station Permits
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Access DOH Bacteriological Tests, Sanitary Permits, and Business Permits for your assigned water station directly in the Compliance tab.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-green-600" /> Office Sanitation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Our Quality Officers visit your office monthly to clean dispensers. You can view high-resolution proof photos and officer signatures for every visit.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Security Section */}
          <section id="security" className="scroll-mt-20">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <KeyRound className="h-8 w-8 text-purple-500 mb-2" />
                  <CardTitle>Changing Password</CardTitle>
                  <CardDescription>Keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
                    <li>Open <strong>My Account</strong> via the header.</li>
                    <li>Navigate to the <strong>Accounts</strong> tab.</li>
                    <li>Click <strong>Update Password</strong>.</li>
                    <li>Enter your current password followed by your new one.</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Mail className="h-8 w-8 text-purple-500 mb-2" />
                  <CardTitle>Frictionless Email Update</CardTitle>
                  <CardDescription>Updating your login identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Need to change the primary email address used for login? Our system handles this with zero friction.
                  </p>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-purple-900 font-medium">
                    Simply update the email in your account settings and confirm. Our backend will automatically sync your login credentials without requiring verification links.
                  </div>
                </CardContent>
              </div>
            </section>

          {/* Account Management Section */}
          <section id="account" className="scroll-mt-20">
            <Card>
              <CardHeader>
                <Settings className="h-8 w-8 text-slate-500 mb-2" />
                <CardTitle>Managing Business Details</CardTitle>
                <CardDescription>Update your contact info and profile appearance.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Business Info</h4>
                  <p className="text-xs text-muted-foreground">Update your address, contact number, and business email anytime to ensure deliveries and invoices reach the right people.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Profile Photo</h4>
                  <p className="text-xs text-muted-foreground">Upload your company logo or a profile photo. This helps our delivery team and support staff identify your account quickly.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Live Support</h4>
                  <p className="text-xs text-muted-foreground">Facing issues? Use the "Live Support" button to chat with our team directly. We can assist with plan changes or provider switches.</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Footer Contact */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-lg font-bold">Still have questions?</h3>
                <p className="text-sm text-muted-foreground">Our support team is available Mon-Fri, 9am - 6pm.</p>
              </div>
              <div className="flex gap-3">
                <Button asChild className="rounded-full">
                  <a href="mailto:customers@riverph.com">Email Support</a>
                </Button>
                <Button variant="outline" asChild className="rounded-full">
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
