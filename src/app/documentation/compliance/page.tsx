'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShieldCheck, 
  FileText, 
  Wrench, 
  ClipboardCheck,
  Microscope,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ComplianceDocumentationPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-green-500" />
          Quality & Compliance
        </h1>
        <p className="text-muted-foreground text-lg">Radical transparency for every drop of water we deliver.</p>
      </div>

      <Card className="overflow-hidden shadow-xl border-none">
        <div className="grid md:grid-cols-3">
          <div className="p-10 bg-green-600 text-white md:col-span-1 flex flex-col justify-center">
            <Microscope className="h-16 w-16 mb-6 opacity-80" />
            <h2 className="text-3xl font-extrabold mb-4">Certified Quality</h2>
            <p className="text-green-50/90 text-sm leading-relaxed mb-6">
              We ensure your workplace water equipment is not just functional, but sanitary. Every partner station is held to DOH standards.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest bg-black/10 p-2 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                DOH Certified
              </div>
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest bg-black/10 p-2 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                Monthly Sanitation
              </div>
            </div>
          </div>
          
          <div className="p-8 md:col-span-2 bg-background">
            <div className="grid gap-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-50 text-green-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Station Permits</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Access the latest <strong>DOH Bacteriological Tests</strong>, Sanitary Permits, and Business Permits for your assigned water station. 
                  These documents are updated monthly and semi-annually to ensure continuous compliance.
                </p>
                <div className="p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground italic">
                  Find these in the <span className="font-bold text-foreground">Compliance & Sanitation</span> → <span className="font-bold text-foreground">Water Quality Reports</span> tab.
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Professional Sanitation</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Our Quality Officers visit your office monthly to perform high-grade sanitation on your dispensers. 
                  Every visit generates a digital report including:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <li className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-500" />
                    10-Point Checklist per unit
                  </li>
                  <li className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-500" />
                    Officer & Client Signatures
                  </li>
                  <li className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-500" />
                    Inspection Pass Rate Score
                  </li>
                  <li className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-500" />
                    Proof of Service Photos
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
