'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Building, 
  UserCircle, 
  MessageSquare,
  FileEdit,
  Camera,
  Layout
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AccountDocumentationPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-500" />
          Account Management
        </h1>
        <p className="text-muted-foreground text-lg">Customize your business profile and support preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Building className="h-6 w-6 text-slate-600" />
            </div>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Keeping your contact information current.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your business details are used for billing and delivery scheduling. You can update these at any time in the <strong>Accounts</strong> tab:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <FileEdit className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold">Contact Number</p>
                  <p className="text-xs text-muted-foreground">Used by delivery teams to notify you of arrival.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileEdit className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold">Service Address</p>
                  <p className="text-xs text-muted-foreground">Ensure this matches your physical drop-off point.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileEdit className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold">Business Email</p>
                  <p className="text-xs text-muted-foreground">The primary recipient for automated SOAs and invoices.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileEdit className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold">Business Name</p>
                  <p className="text-xs text-muted-foreground">The name that appears on your official receipts.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-primary text-primary-foreground">
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription className="text-primary-foreground/80">Visual identification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              Uploading a company logo or a profile photo helps our delivery team and support staff identify your account instantly.
            </p>
            <div className="p-4 rounded-xl bg-black/10 border border-white/10 text-xs italic">
              Simply hover over your avatar in settings and click the camera icon to upload.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-none">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Support Agent Profiles</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you use <strong>Live Support</strong>, you are interacting with our dedicated team. 
                Each agent has a public-facing profile so you know exactly who is assisting you.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-primary" />
                  Agent Display Name
                </li>
                <li className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-primary" />
                  Role Description (e.g. Customer Success)
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl border bg-muted/30 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-slate-200 mb-4 animate-pulse" />
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-48 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
