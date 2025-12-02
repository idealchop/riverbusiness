

import {FieldValue, Timestamp} from 'firebase/firestore';

export interface ConsumptionRecord {
  date: string;
  consumptionContainers: number;
}

export interface Delivery {
  id: string;
  userId: string;
  date: string;
  volumeContainers: number;
  status: 'Delivered' | 'In Transit' | 'Pending';
  proofOfDeliveryUrl?: string;
  adminNotes?: string;
}

export interface ComplianceReport {
  id:string;
  name: string;
  date: string;
  status: 'Compliant' | 'Non-compliant' | 'Pending Review';
  reportUrl: string;
}

export interface SanitationVisit {
  id: string;
  scheduledDate: string;
  status: 'Completed' | 'Scheduled' | 'Cancelled';
  assignedTo: string;
  reportUrl?: string;
}

export interface WaterStation {
  id:string;
  name: string;
  location: string;
  permits: {
      businessPermitUrl?: string;
      sanitationPermitUrl?: string;
      engineersReportUrl?: string;
      waterTestResultsUrl?: string;
      cprUrl?: string;
      lguPermitUrl?: string;
      healthCertsUrl?: string;
      pestControlContractUrl?: string;
      bacteriologicalTestUrl?: string;
      physicalChemicalTestUrl?: string;
      annualMonitoringUrl?: string;
      partnershipAgreementUrl?: string;
  };
}

export type Permission = 
  | 'view_dashboard' 
  | 'view_payments' 
  | 'manage_deliveries' 
  | 'view_quality_reports' 
  | 'manage_users' 
  | 'access_admin_panel';

export interface AppUser {
    id: string; // This is the Firebase Auth UID
    clientId?: string; // This is the manually entered client ID
    name: string;
    email: string; // Login email
    businessEmail?: string; // Contact email
    businessName: string;
    address?: string;
    contactNumber?: string;
    totalConsumptionLiters: number;
    accountStatus: 'Active' | 'Inactive';
    lastLogin: string;
    permissions?: Permission[];
    role: 'Admin' | 'User';
    assignedWaterStationId?: string;
    createdAt: any;
    onboardingComplete?: boolean;
    plan?: any;
    clientType?: string | null;
    customPlanDetails?: any;
    contractUrl?: string;
    photoURL?: string;
}

export interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress: string;
  status: 'Success' | 'Failure';
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  feedback: string;
  rating: number;
  read: boolean;
}

export interface Payment {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Upcoming' | 'Overdue' | 'Pending Review';
  proofOfPaymentUrl?: string;
}

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export type PaymentOption = {
    name: string;
    qr?: ImagePlaceholder | null;
    details?: {
        bankName?: string;
        accountName: string;
        accountNumber: string;
    }
}

export interface Schedule {
  deliveryDate: string;
  cutOffTime: string;
  notes: string;
}

export interface ConsumptionHistory {
  date: FieldValue;
  amountLiters: number;
  metric: 'liters' | 'gallons';
}
