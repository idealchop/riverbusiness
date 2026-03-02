'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  KeyRound, 
  Mail, 
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SecurityDocumentationPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-purple-500" />
          Security & Identity
        </h1>
        <p className="text-muted-foreground text-lg">How we protect your business account and manage your credentials.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Password Management</CardTitle>
            <CardDescription>Keep your account access secure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We recommend updating your password every 90 days. To change your password:
            </p>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">1</span>
                <span>Open <strong>My Account</strong> via the avatar menu in the header.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">2</span>
                <span>Navigate to the <strong>Accounts</strong> tab.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">3</span>
                <span>Click <strong>Update Password</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">4</span>
                <span>Enter your current password and your new secure password.</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Login Email Updates</CardTitle>
            <CardDescription>Frictionless identity migration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4" /> Zero-Friction Flow
              </h4>
              <p className="text-xs text-blue-800/80 leading-relaxed">
                If you need to change your primary login email, our system handles it without requiring complex verification handshakes.
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Updating the email in your account settings triggers a background synchronization with Firebase Authentication. 
              The change is usually reflected within seconds, allowing you to use your new email for your very next login session.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
              <ShieldAlert className="h-4 w-4" />
              Requires a confirmation popup for security.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 text-white overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-400" />
            Session Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm leading-relaxed">
            For sensitive actions like changing passwords or emails, Firebase may occasionally require you to log in again if your session has been active for a long time. 
            This is a standard security measure to ensure the person making the change is truly the account owner.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
