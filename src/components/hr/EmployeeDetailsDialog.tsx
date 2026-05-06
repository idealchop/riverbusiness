'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AppUser } from '@/lib/types';
import { 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  UserCircle 
} from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeDetailsDialogProps {
  employee: AppUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailsDialog({ employee, isOpen, onOpenChange }: EmployeeDetailsDialogProps) {
  if (!employee) return null;

  const profile = employee.hrProfile;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl border-none">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
             <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400">
                {employee.name.split(' ').map(n => n[0]).join('')}
             </div>
             <div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">{employee.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-50 text-green-600 border-none uppercase text-[8px] font-black">
                        {profile?.status || 'Active'}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {profile?.position} • {profile?.department}
                    </span>
                </div>
             </div>
          </div>
          <DialogDescription className="sr-only">Detailed employment information for {employee.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <UserCircle className="h-3 w-3" /> Contact Information
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-slate-300" />
                            <p className="text-sm font-bold text-slate-600">{employee.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-slate-300" />
                            <p className="text-sm font-bold text-slate-600">{employee.contactNumber || 'No number set'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <DollarSign className="h-3 w-3" /> Compensation
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                            <span className="text-xs font-bold text-slate-400 uppercase">Rate (PHP)</span>
                            <span className="text-sm font-black text-slate-900">₱{profile?.rate.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                            <span className="text-xs font-bold text-slate-400 uppercase">Type</span>
                            <span className="text-sm font-black text-slate-900 capitalize">{profile?.salaryType}</span>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Briefcase className="h-3 w-3" /> Employment History
                </h4>
                <div className="p-5 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900">Hired On</p>
                            <p className="text-xs font-bold text-slate-400">{profile?.startDate ? format(new Date(profile.startDate), 'MMMM do, yyyy') : 'N/A'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Permanent</Badge>
                    </div>
                </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-green-400 shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight text-white/70">
                    This profile is encrypted and isolated by company protocol. only authorized personnel can modify this data.
                </p>
            </div>
        </div>

        <DialogFooter className="pt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest">Close Profile</Button>
          <Button className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[10px] bg-slate-900">
            Edit Information
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
