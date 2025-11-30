
import {FieldValue, Timestamp} from 'firebase/firestore';

export interface ConsumptionRecord {
  date: string;
  consumptionGallons: number;
}

export interface Delivery {
  id: string;
  userId: string;
  date: string;
  volumeGallons: number;
  status: 'Delivered' | 'In Transit' | 'Pending';
  proofOfDeliveryUrl?: string;
}

export interface ComplianceReport {
  id: string;
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
    id: string;
    name: string;
    email: string;
    businessName: string;
    address?: string;
    contactNumber?: string;
    totalConsumptionLiters: number;
    accountStatus: 'Active' | 'Inactive';
    lastLogin: string;
    permissions?: Permission[];
    role: 'Admin' | 'User';
    assignedWaterStationId?: string;
    createdAt: Timestamp | FieldValue;
    onboardingComplete?: boolean;
    plan?: any;
    clientType?: string | null;
    customPlanDetails?: any;
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

    