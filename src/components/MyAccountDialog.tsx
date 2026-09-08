'use client';

import React, { useReducer, useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, Timestamp, deleteField, addDoc, serverTimestamp, query, orderBy, where, limit } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, User as AuthUser } from 'firebase/auth';
import type { AppUser, Payment, Delivery, SanitationVisit, ComplianceReport, Transaction, PaymentOption, TopUpRequest, ImagePlaceholder } from '@/lib/types';
import { format, startOfMonth, addMonths, isWithinInterval, subMonths, endOfMonth, isAfter, isSameDay, endOfDay, getYear, getMonth, addDays } from 'date-fns';
import { User as UserIcon, KeyRound, Edit, Trash2, Upload, FileText, Receipt, EyeOff, Eye, Pencil, Shield, LayoutGrid, Wrench, ShieldCheck, Repeat, Package, FileX, CheckCircle, AlertCircle, Download, Copy, Wallet, Info, ArrowRightLeft, Plus, DollarSign, Droplets, Undo2, Mail, CreditCard, LogOut, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';
import { enterprisePlans, familyPlans, smePlans, commercialPlans, corporatePlans, clientTypes } from '@/lib/plans';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { generateMonthlySOA, generateInvoicePDF } from '@/lib/pdf-generator';
import { Logo } from '@/components/icons';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { LandingGlowBackdrop } from '@/components/landing-glow';
import { PaymentPanel } from '@/components/dashboard/PaymentPanel';


// State Management with useReducer
type State = {
  isPasswordDialogOpen: boolean;
  isEmailDialogOpen: boolean;
  isEmailConfirmOpen: boolean;
  isPhotoPreviewOpen: boolean;
  isChangePlanDialogOpen: boolean;
  isInvoiceDetailOpen: boolean;
  isBreakdownDialogOpen: boolean;
  isTopUpDialogOpen: boolean;
  selectedNewPlan: any | null;
  profilePhotoFile: File | null;
  profilePhotoPreview: string | null;
  editableFormData: Partial<AppUser>;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  newLoginEmail: string;
  selectedInvoiceForDetail: Payment | null;
  invoiceForBreakdown: Payment | null;
};

type Action =
  | { type: 'SET_PASSWORD_DIALOG'; payload: boolean }
  | { type: 'SET_EMAIL_DIALOG'; payload: boolean }
  | { type: 'SET_EMAIL_CONFIRM_DIALOG'; payload: boolean }
  | { type: 'SET_PHOTO_PREVIEW_DIALOG'; payload: boolean }
  | { type: 'SET_CHANGE_PLAN_DIALOG'; payload: boolean }
  | { type: 'SET_INVOICE_DETAIL_DIALOG'; payload: boolean }
  | { type: 'SET_BREAKDOWN_DIALOG'; payload: boolean }
  | { type: 'SET_TOPUP_DIALOG'; payload: boolean }
  | { type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: Payment | null }
  | { type: 'SET_INVOICE_FOR_BREAKDOWN', payload: Payment | null }
  | { type: 'SET_SELECTED_NEW_PLAN'; payload: any | null }
  | { type: 'SET_PHOTO_FILE'; payload: { file: File | null, preview: string | null } }
  | { type: 'SET_FORM_DATA'; payload: Partial<AppUser> }
  | { type: 'UPDATE_FORM_DATA'; payload: { name: keyof AppUser, value: string } }
  | { type: 'SET_PASSWORD_FIELD'; payload: { field: 'current' | 'new' | 'confirm', value: string } }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY'; payload: 'current' | 'new' | 'confirm' }
  | { type: 'SET_EMAIL_FIELD'; payload: { field: 'newEmail', value: string } }
  | { type: 'RESET_PASSWORD_FORM' }
  | { type: 'RESET_EMAIL_FORM' }
  | { type: 'RESET_UPLOAD' };

const initialState: State = {
  isPasswordDialogOpen: false,
  isEmailDialogOpen: false,
  isEmailConfirmOpen: false,
  isPhotoPreviewOpen: false,
  isChangePlanDialogOpen: false,
  isInvoiceDetailOpen: false,
  isBreakdownDialogOpen: false,
  isTopUpDialogOpen: false,
  selectedNewPlan: null,
  profilePhotoFile: null,
  profilePhotoPreview: null,
  editableFormData: {},
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  showCurrentPassword: false,
  showNewPassword: false,
  showConfirmPassword: false,
  newLoginEmail: '',
  selectedInvoiceForDetail: null,
  invoiceForBreakdown: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PASSWORD_DIALOG': return { ...state, isPasswordDialogOpen: action.payload };
    case 'SET_EMAIL_DIALOG': return { ...state, isEmailDialogOpen: action.payload };
    case 'SET_EMAIL_CONFIRM_DIALOG': return { ...state, isEmailConfirmOpen: action.payload };
    case 'SET_PHOTO_PREVIEW_DIALOG': return { ...state, isPhotoPreviewOpen: action.payload };
    case 'SET_CHANGE_PLAN_DIALOG': return { ...state, isChangePlanDialogOpen: action.payload };
    case 'SET_INVOICE_DETAIL_DIALOG': return { ...state, isInvoiceDetailOpen: action.payload };
    case 'SET_BREAKDOWN_DIALOG': return { ...state, isBreakdownDialogOpen: action.payload };
    case 'SET_TOPUP_DIALOG': return { ...state, isTopUpDialogOpen: action.payload };
    case 'SET_SELECTED_INVOICE_FOR_DETAIL': return { ...state, selectedInvoiceForDetail: action.payload };
    case 'SET_INVOICE_FOR_BREAKDOWN': return { ...state, invoiceForBreakdown: action.payload };
    case 'SET_SELECTED_NEW_PLAN': return { ...state, selectedNewPlan: action.payload };
    case 'SET_PHOTO_FILE': return { ...state, profilePhotoFile: action.payload.file, profilePhotoPreview: action.payload.preview };
    case 'SET_FORM_DATA': return { ...state, editableFormData: action.payload };
    case 'UPDATE_FORM_DATA': return { ...state, editableFormData: { ...state.editableFormData, [action.payload.name]: action.payload.value } };
    case 'SET_PASSWORD_FIELD':
      if (action.payload.field === 'current') return { ...state, currentPassword: action.payload.value };
      if (action.payload.field === 'new') return { ...state, newPassword: action.payload.value };
      if (action.payload.field === 'confirm') return { ...state, confirmPassword: action.payload.value };
      return state;
    case 'TOGGLE_PASSWORD_VISIBILITY':
      if (action.payload === 'current') return { ...state, showCurrentPassword: !state.showCurrentPassword };
      if (action.payload === 'new') return { ...state, showNewPassword: !state.showNewPassword };
      if (action.payload === 'confirm') return { ...state, showConfirmPassword: !state.showConfirmPassword };
      return state;
    case 'SET_EMAIL_FIELD':
      if (action.payload.field === 'newEmail') return { ...state, newLoginEmail: action.payload.value };
      return state;
    case 'RESET_PASSWORD_FORM': return { ...state, currentPassword: '', newPassword: '', confirmPassword: '', isPasswordDialogOpen: false };
    case 'RESET_EMAIL_FORM': return { ...state, newLoginEmail: '', isEmailDialogOpen: false, isEmailConfirmOpen: false };
    case 'RESET_UPLOAD':
      if (state.profilePhotoPreview) URL.revokeObjectURL(state.profilePhotoPreview);
      return { ...state, profilePhotoFile: null, profilePhotoPreview: null, isPhotoPreviewOpen: false };
    default: return state;
  }
}

const includedFeatures = [
    {
        icon: LayoutGrid,
        title: 'Smart Client Portal',
        description: 'Monitor consumption, compliance, water providers, and payments in real time.',
    },
    {
        icon: Wrench,
        title: 'Monthly Sanitation Visit',
        description: 'Regular cleaning and compliance check for your dispensers and reusable gallons.',
    },
    {
        icon: ShieldCheck,
        title: 'Guaranteed Water Compliance',
        description: 'All partner stations meet strict sanitation and quality standards.',
    },
    {
        icon: Repeat,
        title: 'Switch Water Providers',
        description: 'Flexibility to switch between our network of trusted providers.',
    },
];

function subscriptionMeta(status?: AppUser['subscriptionStatus'], variant: 'dark' | 'light' = 'dark') {
  const isDark = variant === 'dark';
  switch (status) {
    case 'activated':
      return { label: 'Active', className: isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'discovery_call':
      return { label: 'Discovery call', className: isDark ? 'bg-amber-500/15 text-amber-200 border-amber-400/20' : 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'pending_activation':
      return { label: 'Pending activation', className: isDark ? 'bg-sky-500/15 text-sky-200 border-sky-400/20' : 'bg-sky-50 text-sky-800 border-sky-200' };
    default:
      return { label: 'Not activated', className: isDark ? 'bg-white/10 text-white/70 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

const toSafeDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  return null;
};


function invoiceStatusClass(status: string, isCurrentEst?: boolean) {
  if (status === 'Covered by Parent Account') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (isCurrentEst) return 'bg-primary/10 text-primary border-primary/10';
  if (status === 'Paid') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'Overdue') return 'bg-red-50 text-red-700 border-red-100';
  if (status === 'Pending Review') return 'bg-amber-50 text-amber-800 border-amber-100';
  if (status === 'Upcoming') return 'bg-sky-50 text-sky-700 border-sky-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function invoiceAction(invoice: any, isCurrentEst: boolean, onPayNow: (invoice: any) => void, handleViewInvoice: (invoice: any) => void) {
  if (invoice.status === 'Covered by Parent Account') {
    return <Button size="sm" variant="outline" className="w-full h-10 rounded-xl font-bold" onClick={() => handleViewInvoice(invoice)}>View invoice</Button>;
  }
  if (isCurrentEst || invoice.status === 'Upcoming' || invoice.status === 'Overdue') {
    const isPrimary = isCurrentEst || invoice.status === 'Overdue';
    return (
      <Button size="sm" variant={isPrimary ? 'default' : 'outline'} className="w-full h-10 rounded-xl font-bold" onClick={() => onPayNow(invoice)}>
        Pay now
      </Button>
    );
  }
  if (invoice.status === 'Paid') {
    return <Button size="sm" variant="outline" className="w-full h-10 rounded-xl font-bold" onClick={() => handleViewInvoice(invoice)}>View invoice</Button>;
  }
  return null;
}

const AccountTab = ({ user, state, dispatch, handleSaveChanges, isEditingDetails, setIsEditingDetails, copyToClipboard, workspaceBusinessName }: any) => {
  const { toast } = useToast();
  const isEmployee = user?.hrRole === 'employee';
  const isOwner = user?.hrRole === 'owner';

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Profile</p>
              <h4 className="text-lg font-black tracking-tight text-slate-900 mt-1">Your details</h4>
            </div>
            {!isEditingDetails && (
              <Button variant="outline" size="sm" className="rounded-full h-9 font-bold" onClick={() => setIsEditingDetails(true)}>
                <Edit className="mr-2 h-3.5 w-3.5" />Edit
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'fullName', label: 'Full name', name: 'name', value: state.editableFormData.name || '', disabled: !isEditingDetails },
              { id: 'email', label: 'Login email', name: 'email', value: state.editableFormData.email || '', disabled: true, type: 'email' },
              { id: 'businessEmail', label: 'Business email', name: 'businessEmail', value: state.editableFormData.businessEmail || '', disabled: !isEditingDetails, type: 'email' },
              { id: 'businessName', label: 'Business name', name: 'businessName', value: isEmployee ? workspaceBusinessName : (state.editableFormData.businessName || ''), disabled: !isEditingDetails || isEmployee },
              { id: 'address', label: 'Address', name: 'address', value: state.editableFormData.address || '', disabled: !isEditingDetails },
              { id: 'contactNumber', label: 'Contact number', name: 'contactNumber', value: state.editableFormData.contactNumber || '', disabled: !isEditingDetails, type: 'tel' },
            ].map((field) => (
              <div key={field.id} className="space-y-1.5 group">
                <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-primary">{field.label}</Label>
                <Input
                  id={field.id}
                  name={field.name}
                  type={field.type || 'text'}
                  value={field.value}
                  disabled={field.disabled}
                  onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: field.name as keyof AppUser, value: e.target.value}})}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-4"
                />
              </div>
            ))}
          </div>
          {isEditingDetails && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="rounded-full font-bold" onClick={() => { setIsEditingDetails(false); dispatch({type: 'SET_FORM_DATA', payload: user || {}}) }}>Cancel</Button>
              <Button className="rounded-full font-bold" onClick={handleSaveChanges}>Save changes</Button>
            </div>
          )}
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security</p>
          <div className="flex flex-col gap-2">
            <Button className="justify-start rounded-2xl h-12 font-bold" onClick={() => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: true })}><KeyRound className="mr-2 h-4 w-4" />Update password</Button>
            <Button variant="outline" className="justify-start rounded-2xl h-12 font-bold" onClick={() => dispatch({ type: 'SET_EMAIL_DIALOG', payload: true })}><Mail className="mr-2 h-4 w-4" />Update login email</Button>
            <Button variant="outline" className="justify-start rounded-2xl h-12 font-bold" onClick={() => toast({ title: "Coming soon!" })}><Shield className="mr-2 h-4 w-4" />Enable 2FA</Button>
            {isOwner && user?.workspaceKind !== 'individual' && (
              <Button variant="outline" className="justify-start rounded-2xl h-12 font-bold" onClick={() => window.dispatchEvent(new CustomEvent('open-office-settings'))}>
                <MapPin className="mr-2 h-4 w-4" />Office location
              </Button>
            )}
          </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identifiers</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="uid" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">User ID</Label>
              <div className="flex items-center gap-2">
                <Input id="uid" value={user?.id || ''} readOnly className="font-mono text-xs h-11 bg-slate-50 border-slate-200 rounded-2xl"/>
                <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0 rounded-2xl" onClick={() => user?.id && copyToClipboard(user.id, 'User ID')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientId" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client ID</Label>
              <div className="flex items-center gap-2">
                <Input id="clientId" value={isEmployee ? user.companyId : (user?.clientId || 'N/A')} readOnly className="font-mono text-xs h-11 bg-slate-50 border-slate-200 rounded-2xl"/>
                <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0 rounded-2xl" onClick={() => (isEmployee ? user.companyId : user.clientId) && copyToClipboard(isEmployee ? user.companyId : user.clientId, 'Client ID')} disabled={isEmployee ? !user.companyId : !user?.clientId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
      </section>
    </div>
  );
}

const PlanTab = ({ user, dispatch, setIsSoaDialogOpen }: any) => {
  const status = subscriptionMeta(user?.subscriptionStatus, 'light');
  const priceLabel = user?.plan?.isConsumptionBased
    ? `₱${user?.plan?.price?.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}/liter`
    : user?.plan?.price != null
      ? `₱${user.plan.price.toLocaleString()}/month`
      : 'No plan selected';

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current plan</p>
              <h3 className="text-2xl font-black tracking-tight mt-1 text-slate-900">{user?.plan?.name || 'No subscription'}</h3>
              <p className="text-sm font-bold text-slate-400 mt-0.5">{user?.clientType || 'Not assigned'}</p>
            </div>
            <Badge className={cn('border rounded-full px-3 py-1 font-bold', status.className)}>
              {status.label}
            </Badge>
          </div>
          <p className="text-3xl font-black tracking-tight text-slate-900">{priceLabel}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allocation</p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {user?.plan?.isConsumptionBased ? 'Pay per use' : `${user?.customPlanDetails?.litersPerMonth?.toLocaleString() || 0} L / mo`}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bonus</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{user?.customPlanDetails?.bonusLiters?.toLocaleString() || 0} L</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipment</p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {user?.customPlanDetails?.gallonQuantity || 0} jugs · {user?.customPlanDetails?.dispenserQuantity || 0} dispensers
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery</p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {user?.customPlanDetails?.deliveryDay || '—'} · {user?.customPlanDetails?.deliveryTime || '—'}
              </p>
            </div>
          </div>
          {(user?.customPlanDetails?.autoRefillEnabled && user?.customPlanDetails?.deliveryDay) && (
            <p className="text-xs font-bold text-primary">Auto-refill scheduled for {user.customPlanDetails.deliveryDay} at {user.customPlanDetails.deliveryTime}</p>
          )}
      </section>
      <div className="grid grid-cols-1 gap-2">
        {user?.currentContractUrl ? (
          <Button variant="outline" className="rounded-2xl h-12 justify-start font-bold" asChild>
            <a href={user.currentContractUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" />View contract
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="rounded-2xl h-12 justify-start font-bold" disabled>
            <FileX className="mr-2 h-4 w-4" />No contract on file
          </Button>
        )}
        <Button variant="outline" className="rounded-2xl h-12 justify-start font-bold" onClick={() => dispatch({type: 'SET_CHANGE_PLAN_DIALOG', payload: true})}>
          <Repeat className="mr-2 h-4 w-4" />Change plan
        </Button>
        <Button className="rounded-2xl h-12 justify-start font-bold" onClick={() => setIsSoaDialogOpen(true)}>
          <Download className="mr-2 h-4 w-4" />Download SOA
        </Button>
      </div>
      <section className="rounded-[1.75rem] bg-white p-5 shadow-sm border border-slate-100 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Included</p>
            <h3 className="font-black text-slate-900 mt-1">In every plan</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {includedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{feature.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
      </section>
    </div>
  );
};

const InvoicesTab = ({ user, paymentsLoading, paginatedInvoices, allInvoices, showCurrentMonthInvoice, currentMonthInvoice, getInvoiceDisplayDate, handleViewBreakdown, onPayNow, handleViewInvoice, invoiceCurrentPage, setInvoiceCurrentPage, totalInvoicePages }: any) => (
    <div className="space-y-4">
    {user?.accountType === 'Branch' && (
        <div className="flex items-center gap-3 p-4 text-sm font-medium text-sky-800 bg-sky-50 border border-sky-100 rounded-2xl">
            <Info className="h-5 w-5 shrink-0" />
            <p>Invoices are covered by your parent account. This history is for your records.</p>
        </div>
    )}
    <div className="space-y-3">
        {paymentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-inv-${i}`} className="rounded-[1.75rem] bg-white p-5 border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between"><Skeleton className="h-5 w-32" /><Skeleton className="h-6 w-20 rounded-full" /></div>
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            ))
        ) : paginatedInvoices.length > 0 ? (
            paginatedInvoices.map((invoice: any) => {
                if (!invoice) return null;
                const isCurrentEst = showCurrentMonthInvoice && invoice.id === currentMonthInvoice?.id;
                return (
                <div key={invoice.id} className={cn("rounded-[1.75rem] bg-white p-5 border shadow-sm space-y-4", isCurrentEst ? "border-primary/20" : "border-slate-100")}>
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                            <p className="font-black text-slate-900 truncate">{invoice.description}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1">{getInvoiceDisplayDate(invoice)}</p>
                        </div>
                        <Badge className={cn('whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide', invoiceStatusClass(invoice.status, isCurrentEst))}>
                          {isCurrentEst ? 'This cycle' : invoice.status}
                        </Badge>
                    </div>
                    <div className="flex items-end justify-between">
                        <p className="text-2xl font-black tracking-tight text-slate-900">₱{Number(invoice.amount || 0).toFixed(2)}</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold" onClick={() => handleViewBreakdown(invoice)}>View details</Button>
                    </div>
                    {invoiceAction(invoice, isCurrentEst, onPayNow, handleViewInvoice)}
                </div>
            )})
        ) : (
           <div className="rounded-[1.75rem] bg-white border border-slate-100 py-14 text-center">
             <p className="text-sm font-bold text-slate-400">No statements yet.</p>
           </div>
        )}
    </div>
    <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Showing {paginatedInvoices.length} of {allInvoices.length}</p>
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-full font-bold text-xs"
                onClick={() => setInvoiceCurrentPage(p => Math.max(1, p - 1))}
                disabled={invoiceCurrentPage === 1}
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-full font-bold text-xs"
                onClick={() => setInvoiceCurrentPage(p => Math.min(totalInvoicePages, p + 1))}
                disabled={invoiceCurrentPage === totalInvoicePages || totalInvoicePages === 0}
            >
                Next
            </Button>
        </div>
    </div>
  </div>
);

const TransactionsTab = ({ paginatedTransactions, transactionCurrentPage, setTransactionCurrentPage, totalTransactionPages, calculatedBalances }: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4"/>Credit Balance</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className={cn("text-2xl font-bold", calculatedBalances.displayedCreditBalance < 0 && "text-destructive")}>
                    {calculatedBalances.displayedCreditBalance < 0 ? '-' : ''}
                    ₱{Math.abs(calculatedBalances.displayedCreditBalance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Droplets className="h-4 w-4" />Available Liter Credits</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className={cn("text-2xl font-bold", calculatedBalances.displayedAvailableLiters < 0 && "text-destructive")}>
                    {calculatedBalances.displayedAvailableLiters.toLocaleString(undefined, {maximumFractionDigits: 0})} L
                  </p>
                  <p className="text-xs text-muted-foreground">Consumed: {calculatedBalances.totalDebitLiters.toLocaleString(undefined, {maximumFractionDigits: 1})} L</p>
              </CardContent>
          </Card>
      </div>
      <div className="space-y-4">
          {!paginatedTransactions ? (
            <p className="text-center py-10 text-muted-foreground">Loading...</p>
          ) : paginatedTransactions.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {paginatedTransactions.map((tx: any) => (
                <Card key={tx.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{toSafeDate(tx.date) ? format(toSafeDate(tx.date)!, 'PP') : 'N/A'}</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: {tx.id}</p>
                      </div>
                      <Badge variant={tx.type === 'Credit' ? 'default' : 'secondary'} className={cn('text-xs', tx.type === 'Credit' ? 'bg-green-100 text-green-800' : '')}>
                        {tx.type === 'Debit' ? 'Deducted' : tx.type}
                      </Badge>
                    </div>
                    <p className={cn("text-lg font-bold text-right", tx.type === 'Credit' ? 'text-green-600' : 'text-red-600')}>
                      {tx.type === 'Credit' ? '+' : '-'}{`₱${(tx.amountCredits ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        {(paginatedTransactions?.length || 0) > 0 && (
          <div className="flex items-center justify-end space-x-2 pt-4">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTransactionCurrentPage((p: number) => Math.max(1, p - 1))}
                  disabled={transactionCurrentPage === 1}
              >
                  Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                  Page {transactionCurrentPage} of {totalTransactionPages > 0 ? totalTransactionPages : 1}
              </span>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTransactionCurrentPage((p: number) => Math.min(totalTransactionPages, p + 1))}
                  disabled={transactionCurrentPage === totalTransactionPages || totalTransactionPages === 0}
              >
                  Next
              </Button>
          </div>
        )}
   </div>
);

const TopUpsTab = ({ topUpRequestsData, dispatch, handleViewInvoice }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>Top-Up History</CardTitle>
             <CardDescription>
                A log of all credit top-ups for your parent account.
             </CardDescription>
           </div>
           <Button variant="default" onClick={() => dispatch({type: 'SET_TOPUP_DIALOG', payload: true})}>
              <Plus className="mr-2 h-4 w-4" /> Top-Up
           </Button>
       </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount (PHP)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topUpRequestsData && topUpRequestsData.length > 0 ? (
                        topUpRequestsData.map((req: any) => {
                            const asPayment: Payment = {
                                id: req.id,
                                date: (req.requestedAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
                                description: `Top-Up Request`,
                                amount: req.amount,
                                status: req.status as any,
                                proofOfPaymentUrl: req.proofOfPaymentUrl,
                            };
                            return (
                                <TableRow key={req.id}>
                                    <TableCell>{toSafeDate(req.requestedAt) ? format(toSafeDate(req.requestedAt)!, 'PP') : 'N/A'}</TableCell>
                                    <TableCell>₱{req.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                          req.status === 'Approved' || req.status === 'Approved (Initial Balance)' ? 'default' :
                                          req.status === 'Pending Review' ? 'secondary' :
                                          'destructive'
                                        } className={cn(
                                            (req.status === 'Approved' || req.status === 'Approved (Initial Balance)') && 'bg-green-100 text-green-800'
                                        )}>
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                     <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(asPayment)} disabled={!req.proofOfPaymentUrl}>
                                            View Receipt
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No top-up requests yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

interface MyAccountDialogProps {
  user: AppUser | null;
  authUser: AuthUser | null;
  planImage: ImagePlaceholder | null;
  paymentHistory: Payment[];
  paymentsLoading: boolean;
  onLogout: () => void;
  children?: React.ReactNode;
  onPayNow?: (invoice: Payment) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTab?: string;
  startPaymentInvoice?: Payment | null;
}

export function MyAccountDialog({ user, authUser, paymentHistory, paymentsLoading, onLogout, children, isOpen, onOpenChange, initialTab, startPaymentInvoice }: MyAccountDialogProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [topUpAmount, setTopUpAmount] = useState<number | ''>('');
  const [topUpProof, setTopUpProof] = useState<File | null>(null);
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [paymentProofPreview, setPaymentProofPreview] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Payment | null>(null);

  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
  const INVOICES_PER_PAGE = 5;

  const [transactionCurrentPage, setTransactionCurrentPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 5;
  const [isSoaDialogOpen, setIsSoaDialogOpen] = useState(false);
  const [selectedSoaPeriod, setSelectedSoaPeriod] = useState('full');
  
  const gcashQr = PlaceHolderImages.find((p) => p.id === 'gcash-qr-payment');
  const bankQr = PlaceHolderImages.find((p) => p.id === 'bpi-qr-payment');
  const paymayaQr = PlaceHolderImages.find((p) => p.id === 'maya-qr-payment');
  const cardQr = PlaceHolderImages.find((p) => p.id === 'card-payment-qr');

  const paymentOptions: PaymentOption[] = [
      { name: 'GCash', qr: gcashQr, details: { accountName: 'Jamie Camille Liongson', accountNumber: '09989811596' } },
      { name: 'BPI', qr: bankQr, details: { accountName: 'Jimboy Regalado', accountNumber: '3489145013' } },
      { name: 'Maya', qr: paymayaQr, details: { accountName: 'Jimboy Regalado', accountNumber: '09557750188' } },
  ];

  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  
  const deliveriesQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'users', user.id, 'deliveries'), orderBy('date', 'desc')) : null, [firestore, user]);
  const { data: deliveries, isLoading: deliveriesLoading } = useCollection<Delivery>(deliveriesQuery);

  const sanitationVisitsQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'users', authUser.uid, 'sanitationVisits'), orderBy('scheduledDate', 'desc')) : null, [firestore, authUser]);
  const { data: sanitationVisits } = useCollection<SanitationVisit>(sanitationVisitsQuery);

  const complianceReportsQuery = useMemoFirebase(() => (firestore && user?.assignedWaterStationId) ? query(collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports'), orderBy('date', 'desc')) : null, [firestore, user?.assignedWaterStationId]);
  const { data: complianceReports } = useCollection<ComplianceReport>(complianceReportsQuery);

  const transactionsQuery = useMemoFirebase(() => (firestore && user?.accountType === 'Parent') ? query(collection(firestore, 'users', user.id, 'transactions'), orderBy('date', 'desc')) : null, [firestore, user]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const branchDeliveriesQuery = useMemoFirebase(() => (firestore && user?.accountType === 'Parent') ? query(collection(firestore, 'users', user.id, 'branchDeliveries'), orderBy('date', 'desc')) : null, [firestore, user]);
  const { data: branchDeliveries } = useCollection<Delivery>(branchDeliveriesQuery);

  const topUpRequestsQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'users', user.id, 'topUpRequests'), orderBy('requestedAt', 'desc')) : null, [firestore, user]);
  const { data: topUpRequestsData } = useCollection<TopUpRequest>(topUpRequestsQuery);

  const isParent = user?.accountType === 'Parent';
  
  const branchUsersQuery = useMemoFirebase(() => (firestore && user?.accountType === 'Parent') ? query(collection(firestore, 'users'), where('parentId', '==', user.id)) : null, [firestore, user]);
  const { data: branchUsers } = useCollection<AppUser>(branchUsersQuery);

  // Lookup the Workspace Owner's Business Name if user is an employee
  const companyOwnerQuery = useMemoFirebase(() => {
    if (!firestore || !user?.companyId || user?.hrRole !== 'employee') return null;
    return query(collection(firestore, 'users'), where('clientId', '==', user.companyId), where('hrRole', '==', 'owner'), limit(1));
  }, [firestore, user?.companyId, user?.hrRole]);
  const { data: companyOwners } = useCollection<AppUser>(companyOwnerQuery);
  const workspaceBusinessName = useMemo(() => companyOwners?.[0]?.businessName || user?.businessName, [companyOwners, user?.businessName]);

  const currentMonthInvoice = useMemo(() => {
    if (!user || deliveriesLoading) return null;

    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    let cycleStart: Date;
    let cycleEnd: Date;
    let monthsToBill = 1;
    let description: string;
    let invoiceIdSuffix: string;

    // Rule: Cycle is 2nd of Month to 1st of Next Month
    if (currentYear === 2025 && currentMonth === 11 || currentYear === 2026 && currentMonth === 0) {
        cycleStart = new Date(2025, 11, 2); // Dec 2, 2025
        cycleEnd = endOfDay(new Date(2026, 1, 1)); // Feb 1, 2026
        monthsToBill = 2;
        description = 'Bill for December 2025 - January 2026';
        invoiceIdSuffix = '202512-202601';
    } else {
        cycleStart = addDays(startOfMonth(now), 1); // e.g. Oct 2
        cycleEnd = endOfDay(startOfMonth(addMonths(now, 1))); // e.g. Nov 1
        description = `Bill for ${format(now, 'MMMM yyyy')}`;
        invoiceIdSuffix = format(now, 'yyyyMM');
    }
    
    const deliveriesThisCycle = (deliveries || []).filter(d => {
        const deliveryDate = toSafeDate(d.date);
        return deliveryDate ? isWithinInterval(deliveryDate, { start: cycleStart, end: cycleEnd }) : false;
    });
    
    let estimatedCost = 0;
    
    const userCreationDate = toSafeDate(user.createdAt);
    const isFirstMonth = userCreationDate ? getYear(userCreationDate) === getYear(now) && getMonth(userCreationDate) === getMonth(now) : false;

    if (isFirstMonth && user.customPlanDetails) {
        if (user.customPlanDetails.gallonPaymentType === 'One-Time') {
            estimatedCost += user.customPlanDetails.gallonPrice || 0;
        }
        if (user.customPlanDetails.dispenserPaymentType === 'One-Time') {
            estimatedCost += user.customPlanDetails.dispenserPrice || 0;
        }
    }

    let monthlyEquipmentCost = 0;
    if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
    }
    if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
        monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
    }
    
    const equipmentCostForPeriod = monthlyEquipmentCost * monthsToBill;
    estimatedCost += equipmentCostForPeriod;

    if (user.plan?.isConsumptionBased) {
        const consumptionCost = deliveriesThisCycle.reduce((acc, d) => {
            return acc + (d.amount ?? (d.liters ?? containerToLiter(d.volumeContainers)) * (user.plan?.price || 0));
        }, 0);
        estimatedCost += consumptionCost;
    } else {
        const planCost = user.plan?.price || 0;
        estimatedCost += planCost;
    }

    const pendingChargesTotal = (user.pendingCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
    estimatedCost += pendingChargesTotal;

    
    return {
        id: `INV-${user.id.substring(0, 5)}-${invoiceIdSuffix}`,
        date: new Date().toISOString(),
        description: isFirstMonth ? `${description} + One-Time Fees` : description,
        amount: estimatedCost,
        status: user.accountType === 'Branch' ? 'Covered by Parent Account' : 'Upcoming',
    };
}, [user, deliveries, deliveriesLoading]);


    const breakdownDetails = useMemo(() => {
        const emptyDetails = { planCost: 0, gallonCost: 0, dispenserCost: 0, consumptionCost: 0, consumedLiters: 0, consumedContainers: 0, isCurrent: false, isFirstInvoice: false, manualCharges: [], pendingCharges: [] };
        if (!user || !state.invoiceForBreakdown || !deliveries) {
            return emptyDetails;
        }

        const invoiceDate = toSafeDate(state.invoiceForBreakdown.date);
        if (!invoiceDate) return emptyDetails;
        
        const userCreationDate = toSafeDate(user.createdAt);
        
        const isFirstInvoice = userCreationDate
            ? getYear(invoiceDate) === getYear(userCreationDate) && getMonth(invoiceDate) === getMonth(userCreationDate)
            : false;
        
        const isCurrent = currentMonthInvoice ? state.invoiceForBreakdown.id === currentMonthInvoice.id : false;

        const gallonPrice = user.customPlanDetails?.gallonPrice || 0;
        const dispenserPrice = user.customPlanDetails?.dispenserPrice || 0;

        let planCost = 0;
        let consumptionCost = 0;
        let consumedLiters = 0;
        let consumedContainers = 0;
        let gallonCost = 0;
        let dispenserCost = 0;

        let cycleStart: Date;
        let cycleEnd: Date;
        let monthsToBill = 1;

        if (state.invoiceForBreakdown.description.includes('December 2025 - January 2026')) {
            cycleStart = new Date(2025, 11, 2); // Dec 2, 2025
            cycleEnd = endOfDay(new Date(2026, 1, 1)); // Feb 1, 2026
            monthsToBill = 2;
        } else {
            const billingMonth = isCurrent ? new Date() : subMonths(invoiceDate, 1);
            cycleStart = addDays(startOfMonth(billingMonth), 1); // 2nd of Month
            cycleEnd = endOfDay(startOfMonth(addMonths(billingMonth, 1))); // 1st of Next Month
        }

        const deliveriesInPeriod = deliveries.filter(d => {
            const dDate = toSafeDate(d.date);
            return dDate ? isWithinInterval(dDate, { start: cycleStart, end: cycleEnd }) : false;
        });
        consumedContainers = deliveriesInPeriod.reduce((sum, d) => sum + d.volumeContainers, 0);
        consumedLiters = deliveriesInPeriod.reduce((sum, d) => sum + (d.liters || containerToLiter(d.volumeContainers)), 0);
        
        if (user.plan?.isConsumptionBased) {
            consumptionCost = deliveriesInPeriod.reduce((acc, d) => {
                return acc + (d.amount ?? (d.liters ?? containerToLiter(d.volumeContainers)) * (user.plan?.price || 0));
            }, 0);
        } else {
            planCost = user.plan?.price || 0;
        }

        if (isFirstInvoice) {
            if (user.customPlanDetails?.gallonPaymentType === 'One-Time') gallonCost += gallonPrice;
            if (user.customPlanDetails?.dispenserPaymentType === 'One-Time') dispenserCost += dispenserPrice;
        }
        
        if (user.customPlanDetails?.gallonPaymentType === 'Monthly') gallonCost += (gallonPrice * monthsToBill);
        if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') dispenserCost += (dispenserPrice * monthsToBill);

        const manualCharges = state.invoiceForBreakdown.manualCharges || [];
        const pendingCharges = (isCurrent && user.pendingCharges) ? user.pendingCharges : [];

        return {
            planCost,
            gallonCost,
            dispenserCost,
            consumptionCost,
            consumedLiters,
            consumedContainers,
            isCurrent,
            isFirstInvoice,
            manualCharges,
            pendingCharges
        };
    }, [user, state.invoiceForBreakdown, currentMonthInvoice, deliveries]);

    const totalBreakdownAmount = useMemo(() => {
        const manualChargeTotal = (breakdownDetails.manualCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        const pendingChargeTotal = (breakdownDetails.pendingCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        return (breakdownDetails.planCost || 0) +
               (breakdownDetails.consumptionCost || 0) +
               (breakdownDetails.gallonCost || 0) +
               (breakdownDetails.dispenserCost || 0) +
               manualChargeTotal +
               pendingChargeTotal;
    }, [breakdownDetails]);

    const selectedInvoiceContainers = useMemo(() => {
        if (!state.selectedInvoiceForDetail || !deliveries) return 0;
        
        const invoiceDate = toSafeDate(state.selectedInvoiceForDetail.date);
        if (!invoiceDate) return 0;

        let cycleStart: Date;
        let cycleEnd: Date;

        if (state.selectedInvoiceForDetail.description.includes('December 2025 - January 2026')) {
            cycleStart = new Date(2025, 11, 2);
            cycleEnd = endOfDay(new Date(2026, 1, 1));
        } else {
            const isCurrent = currentMonthInvoice?.id === state.selectedInvoiceForDetail.id;
            const billingMonth = isCurrent ? new Date() : subMonths(invoiceDate, 1);
            cycleStart = addDays(startOfMonth(billingMonth), 1);
            cycleEnd = endOfDay(startOfMonth(addMonths(billingMonth, 1)));
        }

        return deliveries.filter(d => {
            const dDate = toSafeDate(d.date);
            return dDate ? isWithinInterval(dDate, { start: cycleStart, end: cycleEnd }) : false;
        }).reduce((sum, d) => sum + d.volumeContainers, 0);
    }, [state.selectedInvoiceForDetail, deliveries, currentMonthInvoice]);

  const showCurrentMonthInvoice = useMemo(() => {
    if (!currentMonthInvoice) return false;
    return !paymentHistory.some(inv => inv.id === currentMonthInvoice.id);
  }, [currentMonthInvoice, paymentHistory]);

  const allInvoices = useMemo(() => {
    const invoices = [...paymentHistory];
    if (showCurrentMonthInvoice && currentMonthInvoice) {
      invoices.unshift(currentMonthInvoice);
    }
    return invoices
      .filter((invoice): invoice is Payment => {
        if (!invoice) return false;
        const date = toSafeDate(invoice.date);
        return date instanceof Date && !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const dateA = toSafeDate(a.date)!;
        const dateB = toSafeDate(b.date)!;
        return dateB.getTime() - dateA.getTime();
      });
  }, [paymentHistory, showCurrentMonthInvoice, currentMonthInvoice]);

  const totalInvoicePages = Math.ceil(allInvoices.length / INVOICES_PER_PAGE);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (invoiceCurrentPage - 1) * INVOICES_PER_PAGE;
    return allInvoices.slice(startIndex, startIndex + INVOICES_PER_PAGE);
  }, [allInvoices, invoiceCurrentPage]);
  
  const combinedTransactions = useMemo(() => {
    const credits = (transactions || []).map(t => ({...t, type: 'Credit' as const}));

    const debits = (branchDeliveries || []).map(delivery => ({
      id: delivery.id,
      date: delivery.date,
      type: 'Debit' as const,
      amountCredits: delivery.amount || 0,
      description: `Delivery to ${branchUsers?.find(b => b.id === delivery.userId)?.businessName || 'Unknown Branch'}`,
      branchId: delivery.userId,
      branchName: branchUsers?.find(b => b.id === delivery.userId)?.businessName
    }));

    const all = [...credits, ...debits];

    all.sort((a, b) => {
      const dateA = toSafeDate(a.date);
      const dateB = toSafeDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });

    return all;
  }, [transactions, branchDeliveries, branchUsers]);

  const totalTransactionPages = Math.ceil((combinedTransactions?.length || 0) / TRANSACTIONS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    if (!combinedTransactions) return [];
    const startIndex = (transactionCurrentPage - 1) * TRANSACTIONS_PER_PAGE;
    return combinedTransactions.slice(startIndex, startIndex + TRANSACTIONS_PER_PAGE);
  }, [combinedTransactions, transactionCurrentPage]);
  
  const calculatedBalances = useMemo(() => {
    if (!isParent || !user) return { displayedCreditBalance: 0, displayedAvailableLiters: 0, totalDebitLiters: 0 };
    
    const totalCredits = (transactions || []).filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amountCredits, 0);
    const pricePerLiter = user.plan?.price || 1;
    const totalPotentialLiters = totalCredits > 0 ? totalCredits / pricePerLiter : 0;
    
    const totalDebitLiters = (branchDeliveries || []).reduce((sum, d) => sum + (d.liters ?? containerToLiter(d.volumeContainers)), 0);
    const totalDebitAmount = (branchDeliveries || []).reduce((sum, d) => sum + (d.amount ?? (d.liters ?? containerToLiter(d.volumeContainers)) * pricePerLiter), 0);

    const displayedCreditBalance = totalCredits - totalDebitAmount;
    const displayedAvailableLiters = totalPotentialLiters - totalDebitLiters;

    return {
      displayedCreditBalance,
      displayedAvailableLiters: displayedAvailableLiters,
      totalDebitLiters
    };

  }, [isParent, transactions, branchDeliveries, user]);

  const TABS_CONFIG = useMemo(() => {
    const hideWaterBilling = user?.hrRole === 'employee' || user?.workspaceKind === 'individual';
    return [
    { value: 'invoices', label: 'Payments', icon: CreditCard, condition: !hideWaterBilling && user?.accountType !== 'Parent' },
    { value: 'plan', label: 'Subscription', icon: FileText, condition: !hideWaterBilling },
    { value: 'transactions', label: 'Transactions', icon: ArrowRightLeft, condition: !hideWaterBilling && user?.accountType === 'Parent' },
    { value: 'top-ups', label: 'Top-ups', icon: DollarSign, condition: !hideWaterBilling && user?.accountType === 'Parent' },
    { value: 'accounts', label: 'Profile', icon: UserIcon, condition: true },
  ].filter(tab => tab.condition);
  }, [user]);

  const defaultTab = useMemo(() => {
    if (user?.hrRole === 'employee' || user?.workspaceKind === 'individual') return 'accounts';
    if (user?.accountType === 'Parent') return 'transactions';
    return 'invoices';
  }, [user]);


  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab || defaultTab);
        if (startPaymentInvoice) {
          setPayingInvoice(startPaymentInvoice);
        }
    } else {
        setPayingInvoice(null);
    }
  }, [isOpen, initialTab, defaultTab, startPaymentInvoice]);


  const flowPlan = React.useMemo(() => enterprisePlans.find(p => p.name === 'Flow Plan (P3/L)'), []);

  const literConversionRate = useMemo(() => {
    if (user?.accountType === 'Parent' && user?.plan?.price > 0) {
        return user.plan.price;
    }
    if (user?.plan?.isConsumptionBased && user.plan.price > 0) {
        return user.plan.price;
    }
    return 3; // Default rate
  }, [user]);

  const literEquivalent = useMemo(() => {
    if (typeof topUpAmount === 'number' && topUpAmount > 0) {
      return (topUpAmount / literConversionRate).toFixed(0);
    }
    return '0';
  }, [topUpAmount, literConversionRate]);
  
  const tabsGridClass = useMemo(() => {
    const numTabs = TABS_CONFIG.length;
    if (numTabs === 2) return 'grid-cols-2';
    if (numTabs === 3) return 'grid-cols-3';
    if (numTabs === 4) return 'grid-cols-4';
    return 'grid-cols-2 sm:grid-cols-3';
  }, [TABS_CONFIG]);

  const soaDateOptions = useMemo(() => {
    if (!user?.createdAt) return [];
    
    const options: { label: string; value: string }[] = [];
    const now = new Date();
    let startDate = toSafeDate(user.createdAt);

    if (!startDate || isNaN(startDate.getTime())) {
        startDate = startOfMonth(now);
    }
    
    let currentDate = startOfMonth(now);
    
    // Add months from current back to signup month
    while (isAfter(currentDate, startDate) || isSameDay(currentDate, startDate)) {
        options.push({
            label: format(currentDate, 'MMMM yyyy'),
            value: format(currentDate, 'yyyy-MM'),
        });
        currentDate = subMonths(currentDate, 1);
    }
    
    // Insert special period for Dec 2025 - Jan 2026
    options.push({ label: 'December 2025 - January 2026', value: '2025-12_2026-01' });

    // Add Full History option at the start
    options.unshift({ label: 'Full History', value: 'full' });

    // Remove duplicates
    const uniqueValues = new Set();
    return options.filter(option => {
        if (uniqueValues.has(option.value)) {
            return false;
        }
        uniqueValues.add(option.value);
        return true;
    });
  }, [user?.createdAt]);

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_FORM_DATA', payload: user });
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_PHOTO_FILE', payload: { file, preview: previewUrl } });
      dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: true });
    }
    e.target.value = '';
  };

  const handleSaveChanges = async () => {
    if (!authUser || !firestore) return;
    const userDocRef = doc(firestore, 'users', authUser.uid);
    try {
      await updateDoc(userDocRef, state.editableFormData);
      setIsEditingDetails(false);
      toast({ title: "Changes Saved", description: "Your account details have been updated." });
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save your changes." });
    }
  };

  const handlePasswordChange = async () => {
    if (!authUser?.email) return;
    if (state.newPassword !== state.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }
    if (state.newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters long." });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(authUser.email, state.currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, state.newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      dispatch({ type: 'RESET_PASSWORD_FORM' });
    } catch (error) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "The current password you entered is incorrect or the new password is too weak." });
    }
  };

  const handleEmailChange = async () => {
    const emailToSet = state.newLoginEmail?.trim();
    if (!firestore || !authUser || !emailToSet) return;
    
    // Check for basic email format
    if (!emailToSet.includes('@')) {
        toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please provide a valid recipient email address.' });
        return;
    }

    try {
      const userDocRef = doc(firestore, 'users', authUser.uid);
      await updateDoc(userDocRef, { email: emailToSet });

      toast({ 
        title: "Update Requested", 
        description: `Your login email is being updated to ${emailToSet}. Please allow a few moments for synchronization.` 
      });
      dispatch({ type: 'RESET_EMAIL_FORM' });
    } catch (error: any) {
      console.error("Email update failed:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not initiate email change." });
    }
  };
  
  const handleProfilePhotoUpload = async () => {
    if (!state.profilePhotoFile || !authUser || !storage || !auth || !firestore) return;

    const filePath = `users/${authUser.uid}/profile/profile-photo-${Date.now()}`;
    
    startTransition(async () => {
      try {
        const downloadURL = await uploadFileWithProgress(storage, auth, filePath, state.profilePhotoFile, {}, setUploadProgress);
        
        // Manual update for immediate UI sync
        const userRef = doc(firestore, 'users', authUser.uid);
        await updateDoc(userRef, { photoURL: downloadURL });
        
        toast({ title: 'Profile Photo Uploaded!', description: 'Your new photo has been saved successfully.' });
      } catch (error) {
        console.error("Profile photo upload failed:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not upload your profile photo." });
      } finally {
        dispatch({ type: 'RESET_UPLOAD' });
        setUploadProgress(0);
      }
    });
  };
  
  const handleProfilePhotoDelete = async () => {
    if (!authUser || !user || !firestore) return;
    
    startTransition(async () => {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        try {
            await updateDoc(userDocRef, { photoURL: null });
            toast({ title: 'Profile Photo Removed' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove photo.' });
        }
    });
  };

  const handleConfirmPlanChange = async () => {
    if (!authUser || !firestore || !state.selectedNewPlan) return;
    
    const now = new Date();
    const firstDayOfNextMonth = startOfMonth(addMonths(now, 1));

    const userDocRef = doc(firestore, 'users', authUser.uid);

    await updateDoc(userDocRef, {
        pendingPlan: state.selectedNewPlan,
        planChangeEffectiveDate: firstDayOfNextMonth,
    });

    toast({
        title: 'Plan Change Scheduled',
        description: `Your plan will switch to ${state.selectedNewPlan.name} on ${format(firstDayOfNextMonth, 'MMMM d, yyyy')}.`,
    });

    dispatch({type: 'SET_CHANGE_PLAN_DIALOG', payload: false});
    dispatch({type: 'SET_SELECTED_NEW_PLAN', payload: null});
  };

  const handleUndoPlanChange = async () => {
    if (!authUser || !firestore) return;
    
    const userDocRef = doc(firestore, 'users', authUser.uid);
    await updateDoc(userDocRef, {
      pendingPlan: deleteField(),
      planChangeEffectiveDate: deleteField(),
    });
    
    toast({
        title: 'Request Cancelled',
        description: 'Your scheduled plan change has been cancelled.',
    });
  };

  const handleDownloadMonthlySOA = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User data not available.' });
      return;
    }
    
    let filteredDeliveries = deliveries || [];
    let filteredSanitation = sanitationVisits || [];
    let billingPeriod = 'Full History';
    
    if (selectedSoaPeriod !== 'full') {
        let cycleStart, cycleEnd;
        if (selectedSoaPeriod === '2025-12_2026-01') {
            cycleStart = new Date(2025, 11, 2); // Dec 2nd
            cycleEnd = endOfDay(new Date(2026, 1, 1)); // Feb 1st inclusive
            billingPeriod = 'December 2025 - January 2026';
        } else {
            const [year, month] = selectedSoaPeriod.split('-').map(Number);
            const date = new Date(year, month - 1);
            cycleStart = addDays(startOfMonth(date), 1); // 2nd of Month
            cycleEnd = endOfDay(startOfMonth(addMonths(date, 1))); // 1st of Next Month
            billingPeriod = format(date, 'MMMM yyyy');
        }

        filteredDeliveries = (deliveries || []).filter(d => {
            const dDate = toSafeDate(d.date);
            return dDate ? isWithinInterval(dDate, { start: cycleStart, end: cycleEnd }) : false;
        });
        
        filteredSanitation = (sanitationVisits || []).filter(v => {
            const vDate = toSafeDate(v.scheduledDate);
            return vDate ? isWithinInterval(vDate, { start: cycleStart, end: cycleEnd }) : false;
        });
    }
    
    const totalInvoicedAmount = (paymentHistory || []).reduce((sum, inv) => sum + inv.amount, 0);

    toast({
      title: 'Processing Download',
      description: `Your Statement of Account for ${billingPeriod} is being prepared...`,
    });

    try {
        await generateMonthlySOA({
          user,
          deliveries: filteredDeliveries,
          sanitationVisits: filteredSanitation,
          complianceReports: complianceReports || [],
          totalAmount: totalInvoicedAmount,
          billingPeriod,
          branches: branchUsers,
          transactions: transactions,
        });
        
        setIsSoaDialogOpen(false);
    } catch (error) {
        console.error("SOA generation failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
    }
  };

  const handleViewInvoice = (invoice: Payment) => {
    dispatch({ type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: invoice });
    dispatch({ type: 'SET_INVOICE_DETAIL_DIALOG', payload: true });
  };
  
  const handleDownloadInvoice = async (invoice: Payment) => {
    if (!user) return;
    toast({ title: 'Preparing Invoice', description: `Generating invoice ${invoice.id}...` });
    try {
        await generateInvoicePDF({ user, invoice, totalContainers: selectedInvoiceContainers });
    } catch (error) {
        console.error("Invoice generation failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate invoice PDF.' });
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} Copied!`, description: 'The ID has been copied to your clipboard.' });
    });
  };
  
  const handleViewBreakdown = (invoice: Payment) => {
    dispatch({ type: 'SET_INVOICE_FOR_BREAKDOWN', payload: invoice });
    dispatch({ type: 'SET_BREAKDOWN_DIALOG', payload: true });
  };

  const getInvoiceDisplayDate = (invoice: Payment) => {
    if (invoice.description.includes('December 2025 - January 2026')) {
        return 'Dec 2025 - Jan 2026';
    }
    const safeDate = toSafeDate(invoice.date);
    if (!safeDate) return 'Invalid Date';
    
    if (currentMonthInvoice && invoice.id === currentMonthInvoice.id) {
        return format(new Date(), 'MMMM yyyy');
    }

    return format(subMonths(safeDate, 1), 'MMMM yyyy');
  };
  
  const handleTopUpSubmit = async () => {
    if (!topUpProof || !topUpAmount || !user || !storage || !auth || !firestore) return;
    
    setIsSubmittingTopUp(true);
    try {
        const filePath = `users/${user.id}/topup_proofs/${Date.now()}-${topUpProof.name}`;
        const proofUrl = await uploadFileWithProgress(storage, auth, filePath, topUpProof, {}, setUploadProgress);

        const requestData: Omit<TopUpRequest, 'id' | 'rejectionReason'> = {
            userId: user.id,
            amount: Number(topUpAmount),
            status: 'Pending Review',
            requestedAt: serverTimestamp(),
            proofOfPaymentUrl: proofUrl,
        };

        const requestsCollection = collection(firestore, 'users', user.id, 'topUpRequests');
        await addDoc(requestsCollection, requestData);

        toast({
            title: 'Top-Up Request Submitted',
            description: "Your request is now pending review by our admin team.",
        });

        dispatch({type: 'SET_TOPUP_DIALOG', payload: false});
        setTopUpAmount('');
        setTopUpProof(null);

    } catch (error) {
        console.error('Top-up submission failed:', error);
        toast({ variant: 'destructive', title: 'Top-up Failed' });
    } finally {
        setIsSubmittingTopUp(false);
    }
  };

  const displayPhoto = user?.photoURL;
  const displayName = user?.businessName || user?.name || 'My account';
  const heroStatus = subscriptionMeta(user?.subscriptionStatus, 'dark');
  const dueInvoice = allInvoices.find((inv: Payment) =>
    inv.status === 'Upcoming' || inv.status === 'Overdue' || (showCurrentMonthInvoice && inv.id === currentMonthInvoice?.id)
  );
  
  return (
    <AlertDialog>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        {children && <SheetTrigger asChild>{children}</SheetTrigger>}
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-xl md:max-w-2xl p-0 gap-0 flex flex-col bg-slate-50",
            payingInvoice
              ? "[&>button]:text-slate-900 [&>button]:right-4 [&>button]:top-4"
              : "[&>button]:text-white [&>button]:right-5 [&>button]:top-5 [&>button]:opacity-90"
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{payingInvoice ? 'Payment' : 'My Account'}</SheetTitle>
            <SheetDescription>Manage your subscription, payments, and profile.</SheetDescription>
          </SheetHeader>

          {payingInvoice ? (
            <PaymentPanel invoice={payingInvoice} onBack={() => setPayingInvoice(null)} />
          ) : (
            <>
          <div className="relative bg-[#020617] text-white px-6 pt-8 pb-8 overflow-hidden">
            <LandingGlowBackdrop />
            <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-6">My account</p>
            <div className="flex flex-col items-center text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="relative group rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                    <Avatar className="h-36 w-36 sm:h-40 sm:w-40 border-4 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                      <AvatarImage src={displayPhoto ?? undefined} alt={displayName} className="object-cover" />
                      <AvatarFallback className="text-4xl font-black bg-white/10 text-white">{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {(isPending) && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="h-7 w-7 border-2 border-dashed rounded-full animate-spin border-white"></div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-6 w-6 text-white" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="rounded-xl">
                  <DropdownMenuLabel>Profile photo</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Label htmlFor="photo-upload-input-user" className="w-full cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" /> Upload new photo
                    </Label>
                  </DropdownMenuItem>
                  {displayPhoto && (
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Remove photo
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Input id="photo-upload-input-user" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={isPending} />
              <h2 className="mt-4 text-2xl font-black tracking-tight leading-tight">{displayName}</h2>
              <p className="text-sm text-white/60 mt-1">{user?.email}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Badge className={cn('border', heroStatus.className)}>{heroStatus.label}</Badge>
                {user?.plan?.name && (
                  <Badge className="bg-white/10 text-white border-white/10">{user.plan.name}</Badge>
                )}
              </div>
            </div>

            {user?.accountType !== 'Parent' && dueInvoice && (
              <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 text-left backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Amount due</p>
                    <p className="text-2xl font-black mt-1">₱{Number(dueInvoice.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-white/50 mt-1">{dueInvoice.description}</p>
                  </div>
                  {(Number(dueInvoice.amount || 0) > 0 && (dueInvoice.status === 'Upcoming' || dueInvoice.status === 'Overdue' || (showCurrentMonthInvoice && dueInvoice.id === currentMonthInvoice?.id)) && user.accountType !== 'Branch') && (
                    <Button size="sm" className="rounded-full bg-white text-slate-900 hover:bg-white/90 font-black" onClick={() => setPayingInvoice(dueInvoice)}>
                      Pay now
                    </Button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={defaultTab} className="flex-1 min-h-0 flex flex-col">
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 bg-slate-50/90 backdrop-blur-md sticky top-0 z-10">
              <TabsList className={cn("grid w-full h-auto rounded-2xl p-1 bg-slate-200/60", tabsGridClass)}>
                {TABS_CONFIG.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] sm:text-xs rounded-xl px-1 py-2.5 gap-1.5 font-black data-[state=active]:shadow-sm">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 pb-8">
                <TabsContent value="invoices" className="mt-0 space-y-4">
                  <InvoicesTab
                    user={user}
                    paymentsLoading={paymentsLoading}
                    paginatedInvoices={paginatedInvoices}
                    allInvoices={allInvoices}
                    showCurrentMonthInvoice={showCurrentMonthInvoice}
                    currentMonthInvoice={currentMonthInvoice}
                    getInvoiceDisplayDate={getInvoiceDisplayDate}
                    handleViewBreakdown={handleViewBreakdown}
                    onPayNow={setPayingInvoice}
                    handleViewInvoice={handleViewInvoice}
                    invoiceCurrentPage={invoiceCurrentPage}
                    setInvoiceCurrentPage={setInvoiceCurrentPage}
                    totalInvoicePages={totalInvoicePages}
                  />
                </TabsContent>
                <TabsContent value="plan" className="mt-0">
                  <PlanTab
                    user={user}
                    dispatch={dispatch}
                    setIsSoaDialogOpen={setIsSoaDialogOpen}
                  />
                </TabsContent>
                <TabsContent value="transactions" className="mt-0 space-y-4">
                  <TransactionsTab
                    paginatedTransactions={paginatedTransactions}
                    transactionCurrentPage={transactionCurrentPage}
                    setTransactionCurrentPage={setTransactionCurrentPage}
                    totalTransactionPages={totalTransactionPages}
                    calculatedBalances={calculatedBalances}
                  />
                </TabsContent>
                <TabsContent value="top-ups" className="mt-0 space-y-4">
                  <TopUpsTab
                    topUpRequestsData={topUpRequestsData}
                    dispatch={dispatch}
                    handleViewInvoice={handleViewInvoice}
                  />
                </TabsContent>
                <TabsContent value="accounts" className="mt-0">
                  <AccountTab
                    user={user}
                    state={state}
                    dispatch={dispatch}
                    handleSaveChanges={handleSaveChanges}
                    isEditingDetails={isEditingDetails}
                    setIsEditingDetails={setIsEditingDetails}
                    copyToClipboard={copyToClipboard}
                    workspaceBusinessName={workspaceBusinessName}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
          <SheetFooter className="p-4 border-t border-slate-100 bg-slate-50">
            <Button variant="outline" className="w-full rounded-2xl h-12 font-bold text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Breakdown Dialog */}
      <Dialog open={state.isBreakdownDialogOpen} onOpenChange={(open) => { if (!open) { dispatch({type: 'SET_INVOICE_FOR_BREAKDOWN', payload: null}); } dispatch({type: 'SET_BREAKDOWN_DIALOG', payload: open}); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Invoice Breakdown</DialogTitle>
            <DialogDescription>
               This is a breakdown of your charges for {state.invoiceForBreakdown ? getInvoiceDisplayDate(state.invoiceForBreakdown) : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {breakdownDetails.planCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Plan ({user?.plan?.name})</span>
                    <span className="font-medium">P{breakdownDetails.planCost.toFixed(2)}</span>
                  </div>
                )}
                 {breakdownDetails.consumptionCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Water Consumption ({breakdownDetails.consumedLiters.toLocaleString()} L / {breakdownDetails.consumedContainers.toLocaleString()} Containers)</span>
                    <span className="font-medium">P{breakdownDetails.consumptionCost.toFixed(2)}</span>
                  </div>
                )}
                {user?.customPlanDetails?.gallonQuantity > 0 &&
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Container Rental ({user.customPlanDetails?.gallonQuantity || 0} units)
                            <span className="text-xs ml-1">({user.customPlanDetails.gallonPaymentType})</span>
                        </span>
                        <span className="font-medium">P{(breakdownDetails.gallonCost || 0).toFixed(2)}</span>
                    </div>
                }
                {user?.customPlanDetails?.dispenserQuantity > 0 &&
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Dispenser Rental ({user.customPlanDetails?.dispenserQuantity || 0} units)
                             <span className="text-xs ml-1">({user.customPlanDetails.dispenserPaymentType})</span>
                        </span>
                        <span className="font-medium">P{(breakdownDetails.dispenserCost || 0).toFixed(2)}</span>
                    </div>
                }
                {(breakdownDetails.manualCharges || []).map((charge: any, index: number) => (
                  <div className="flex justify-between" key={`manual-${index}`}>
                    <span className="text-muted-foreground">
                      {charge.description}
                      <span className="text-xs ml-1">({charge.amount < 0 ? 'Deduction' : 'Adjustment'})</span>
                    </span>
                    <span className={cn("font-medium", charge.amount < 0 && "text-green-600")}>
                        {charge.amount < 0 ? '-' : ''}P{Math.abs(charge.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                {(breakdownDetails.pendingCharges || []).map((charge: any, index: number) => (
                  <div className="flex justify-between" key={`pending-${index}`}>
                    <span className="text-muted-foreground italic">
                      {charge.description}
                      <span className="text-xs ml-1">({charge.amount < 0 ? 'Pending Deduction' : 'Pending Charge'})</span>
                    </span>
                    <span className={cn("font-medium italic", charge.amount < 0 && "text-green-600")}>
                        {charge.amount < 0 ? '-' : ''}P{Math.abs(charge.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span>P{totalBreakdownAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            {breakdownDetails.isCurrent && (
              <p className="text-xs text-muted-foreground text-center">
                This is a live estimate for the current billing period. Final amount may vary.
              </p>
            )}
          </div>
           <DialogFooter>
             <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Invoice Detail Dialog */}
        <Dialog open={state.isInvoiceDetailOpen} onOpenChange={(open) => {
            dispatch({ type: 'SET_INVOICE_DETAIL_DIALOG', payload: open });
            if (!open) {
                dispatch({ type: 'SET_SELECTED_INVOICE_FOR_DETAIL', payload: null });
            }
        }}>
            <DialogContent className="sm:max-w-2xl bg-background p-0 border-0">
                 <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="sr-only">Invoice Receipt</DialogTitle>
                    <DialogDescription className="sr-only">Details for invoice {state.selectedInvoiceForDetail?.id}</DialogDescription>
                </DialogHeader>
                <div className="p-8 pt-0">
                    <div className="flex items-center gap-2 mb-8">
                        <Logo className="h-8 w-8" />
                        <h3 className="font-semibold text-foreground">River Tech Inc.</h3>
                    </div>

                    <Card className="mb-4">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-muted-foreground">Receipt from River Tech Inc.</p>
                                    <p className="text-4xl font-bold mt-1">₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">Paid {state.selectedInvoiceForDetail ? format(toSafeDate(state.selectedInvoiceForDetail.date) || new Date(), 'PP') : ''}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-secondary">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </div>
                            <Separator className="my-6" />
                            <div className="space-y-3 text-sm">
                                <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-primary" 
                                    onClick={() => state.selectedInvoiceForDetail && handleDownloadInvoice(state.selectedInvoiceForDetail)}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download Invoice
                                </Button>
                                {state.selectedInvoiceForDetail?.proofOfPaymentUrl && (
                                     <Button 
                                        variant="link" 
                                        className="p-0 h-auto text-primary" 
                                        onClick={() => window.open(state.selectedInvoiceForDetail?.proofOfPaymentUrl, '_blank')}
                                    >
                                        <Eye className="mr-2 h-4 w-4" /> View Proof of Payment
                                    </Button>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipt number</span>
                                    <span className="font-medium font-mono">{state.selectedInvoiceForDetail?.id.split('-').pop()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Invoice number</span>
                                    <span className="font-medium font-mono">{state.selectedInvoiceForDetail?.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Volume</span>
                                    <span className="font-medium">{selectedInvoiceContainers} Containers</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment method</span>
                                    <span className="font-medium">Online</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Receipt #{state.selectedInvoiceForDetail?.id.split('-').pop()}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{state.selectedInvoiceForDetail?.description}</span>
                                    <span className="font-medium">₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</span>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tax (inclusive)</span>
                                    <span>₱0.00</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold">
                                    <span>Amount Paid</span>
                                    <span>₱{state.selectedInvoiceForDetail?.amount.toFixed(2)}</span>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>


      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently remove your profile photo.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleProfilePhotoDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Photo Preview Dialog */}
      <Dialog open={state.isPhotoPreviewOpen} onOpenChange={(isOpen) => { if (!isPending) dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: isOpen }); }}>
        <DialogContent onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Preview Profile Photo</DialogTitle>
          </DialogHeader>
          <div className="my-4 flex justify-center">
            {state.profilePhotoPreview && <Image src={state.profilePhotoPreview} alt="Preview" width={200} height={200} className="rounded-full aspect-square object-cover" />}
          </div>
          {isPending && <Progress value={uploadProgress} className="w-full" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({type: 'RESET_UPLOAD'})} disabled={isPending}>Cancel</Button>
            <Button onClick={handleProfilePhotoUpload} disabled={isPending}>
              {isPending ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={state.isPasswordDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type={state.showCurrentPassword ? 'text' : 'password'} value={state.currentPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'current', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'current'})}>
                    {state.showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type={state.showNewPassword ? 'text' : 'password'} value={state.newPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'new', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'new'})}>
                    {state.showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type={state.showConfirmPassword ? 'text' : 'password'} value={state.confirmPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'confirm', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'confirm'})}>
                    {state.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: false })}>Cancel</Button>
            <Button onClick={handlePasswordChange}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Dialog */}
      <Dialog open={state.isEmailDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_EMAIL_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Login Email</DialogTitle>
            <DialogDescription>Enter your new email address. This will be your new primary login identity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input 
                  id="new-email" 
                  type="email" 
                  placeholder="name@company.com" 
                  value={state.newLoginEmail} 
                  onChange={(e) => dispatch({type: 'SET_EMAIL_FIELD', payload: {field: 'newEmail', value: e.target.value}})} 
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => dispatch({ type: 'SET_EMAIL_DIALOG', payload: false })}>Cancel</Button>
            <Button onClick={() => dispatch({ type: 'SET_EMAIL_CONFIRM_DIALOG', payload: true })} disabled={!state.newLoginEmail}>Update Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Update Confirmation Popup */}
      <AlertDialog open={state.isEmailConfirmOpen} onOpenChange={(open) => dispatch({ type: 'SET_EMAIL_CONFIRM_DIALOG', payload: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your login email to <span className="font-bold">{state.newLoginEmail}</span>? 
              This will immediately update your login credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmailChange}>Confirm and Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Change Plan Dialog */}
      <Dialog open={state.isChangePlanDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_CHANGE_PLAN_DIALOG', payload: isOpen })}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Your Plan</DialogTitle>
            <DialogDescription>
              {user?.pendingPlan ? "A change to your plan is already scheduled." : "Compare your current plan with our Flow Plan and schedule the change."}
            </DialogDescription>
          </DialogHeader>
            {user?.pendingPlan ? (
                <div className="py-4 text-center">
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2">
                                <AlertCircle className="h-6 w-6 text-blue-500" />
                                Plan Change Scheduled
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-muted-foreground">Your plan is scheduled to switch to</p>
                            <p className="font-bold text-lg">{user.pendingPlan.name}</p>
                            <p className="text-muted-foreground">on</p>
                            <p className="font-bold text-lg">{user.planChangeEffectiveDate ? format(user.planChangeEffectiveDate.toDate(), 'MMMM d, yyyy') : ''}</p>
                            <p className="text-xs text-muted-foreground pt-4">Hi there, you can undo this request anytime before the effective date if you change your mind.</p>
                        </CardContent>
                         <CardFooter className="flex flex-col gap-2">
                            <Button variant="outline" onClick={handleUndoPlanChange}>
                                <Undo2 className="mr-2 h-4 w-4"/>
                                No, I'm good with my current plan
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            ) : (
                <ScrollArea className="max-h-[70vh]">
                  <div className="pr-6 py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card 
                            className="flex flex-col cursor-default border-primary border-2"
                        >
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                  Your Current Plan
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                </CardTitle>
                                <CardDescription>{user?.plan?.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {user?.plan?.isConsumptionBased ? (
                                    <>
                                      <p className="font-bold text-lg">P{user.plan?.price.toLocaleString()}/liter</p>
                                      <Separator className="my-2" />
                                      <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li><strong>Billing:</strong> Your monthly bill is not fixed.</li>
                                        <li><strong>Flexibility:</strong> Pay only for what you consume.</li>
                                      </ul>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold text-lg">P{user?.plan?.price.toLocaleString()}/month</p>
                                        <Separator className="my-2" />
                                        <ul className="text-sm space-y-1 text-muted-foreground">
                                            <li><strong>Billing:</strong> Fixed monthly bill.</li>
                                            <li><strong>Liters/Month:</strong> {user?.customPlanDetails?.litersPerMonth?.toLocaleString() || 0} L</li>
                                        </ul>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        {flowPlan && !user?.plan?.isConsumptionBased && (
                            <Card 
                                onClick={() => dispatch({type: 'SET_SELECTED_NEW_PLAN', payload: flowPlan})}
                                className={cn(
                                    "cursor-pointer hover:border-primary flex flex-col",
                                    state.selectedNewPlan?.name === flowPlan.name && "border-primary border-2"
                                )}
                            >
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                      {flowPlan.name}
                                      {state.selectedNewPlan?.name === flowPlan.name && <CheckCircle className="h-5 w-5 text-primary" />}
                                    </CardTitle>
                                    <CardDescription>{flowPlan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="font-bold text-lg">P{flowPlan.price}/liter</p>
                                    <Separator className="my-2" />
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li><strong>Billing:</strong> Your monthly bill is not fixed.</li>
                                        <li><strong>Flexibility:</strong> Pay only for what you consume.</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                          <div>
                              <h3 className="font-semibold">Included in Every Plan</h3>
                              <p className="text-sm text-muted-foreground">All subscription plans include full access to our growing network of partner perks.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                              {includedFeatures.map((feature, index) => {
                                  const Icon = feature.icon;
                                  return (
                                      <div key={index} className="flex items-start gap-3">
                                          <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                                          <div>
                                              <h4 className="font-medium text-sm">{feature.title}</h4>
                                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
                  <DialogFooter className="pr-6 pb-4 pt-2">
                    <Button variant="outline" onClick={() => dispatch({type: 'SET_CHANGE_PLAN_DIALOG', payload: false})}>Cancel</Button>
                    <Button onClick={handleConfirmPlanChange} disabled={!state.selectedNewPlan || state.selectedNewPlan.name === user?.plan?.name || user?.plan?.isConsumptionBased}>
                      Confirm and Switch Plan
                    </Button>
                  </DialogFooter>
                </ScrollArea>
            )}
        </DialogContent>
      </Dialog>
      
       {/* Top-Up Dialog */}
      <Dialog open={state.isTopUpDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_TOPUP_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Top-Up Your Balance</DialogTitle>
            <DialogDescription>Add credits to your account to cover your deliveries.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="top-up-amount">Amount (PHP)</Label>
                <Input id="top-up-amount" type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value) || '')} placeholder="Enter amount to top-up" disabled={isSubmittingTopUp}/>
                 {topUpAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Approximately {literEquivalent} liters (based on a ₱{literConversionRate.toFixed(2)}/liter rate)
                  </p>
                )}
              </div>
               <div className="space-y-2">
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-xs text-muted-foreground">You may send your payment through any of our accredited payment channels below.</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {paymentOptions.map(option => (
                        <Card key={option.name}>
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm">{option.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 text-xs">
                                {option.details ? (
                                    <>
                                        <p className="font-semibold">{option.details.accountName}</p>
                                        <p>{option.details.accountNumber}</p>
                                    </>
                                ) : (
                                    <p>Scan QR in payment app.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="top-up-proof">Upload Proof of Payment</Label>
                <Input id="top-up-proof" type="file" onChange={(e) => setTopUpProof(e.target.files?.[0] || null)} disabled={isSubmittingTopUp}/>
                 {isSubmittingTopUp && <Progress value={uploadProgress} className="h-1" />}
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({type: 'SET_TOPUP_DIALOG', payload: false})} disabled={isSubmittingTopUp}>Cancel</Button>
            <Button onClick={handleTopUpSubmit} disabled={!topUpAmount || !topUpProof || isSubmittingTopUp}>
              {isSubmittingTopUp ? "Submitting..." : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Download SOA Dialog */}
      <Dialog open={isSoaDialogOpen} onOpenChange={setIsSoaDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Download Statement of Account</DialogTitle>
                <DialogDescription>Select the billing period you would like to generate a statement for.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select value={selectedSoaPeriod} onValueChange={setSelectedSoaPeriod}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a period..." />
                    </SelectTrigger>
                    <SelectContent>
                        {soaDateOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsSoaDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleDownloadMonthlySOA}>Download</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Image Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {paymentProofPreview && (
            <div className="py-4 flex justify-center">
              <Image src={paymentProofPreview} alt="Payment Proof Preview" width={400} height={600} className="rounded-md object-contain max-h-[70vh]" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
}
