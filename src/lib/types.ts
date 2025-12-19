

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
  reportType: 'DOH Bacteriological Test (Monthly)' | 'DOH Bacteriological Test (Semi-Annual)' | 'Sanitary Permit' | 'Business Permit';
  resultId: string;
  date: any;
  status: 'Passed' | 'Failed' | 'Pending Review';
  reportUrl?: string;
  results?: string;
}

export interface SanitationChecklistItem {
    item: string;
    checked: boolean;
    remarks: string;
}

export interface SanitationVisit {
  id: string;
  userId: string;
  scheduledDate: string;
  status: 'Completed' | 'Scheduled' | 'Cancelled';
  assignedTo: string;
  reportUrl?: string;
  checklist?: SanitationChecklistItem[];
}

export interface WaterStation {
  id:string;
  name: string;
  location: string;
  partnershipAgreementUrl?: string;
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
    currentContractUrl?: string;
    photoURL?: string;
    contractStatus?: string;
    contractUploadedDate?: any;
    lastDeliveryStatus?: 'Delivered' | 'In Transit' | 'Pending' | 'No Delivery';
    pendingPlan?: any;
    planChangeEffectiveDate?: any;
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

export type RefillRequestStatus = 'Requested' | 'In Production' | 'Out for Delivery' | 'Completed' | 'Cancelled';

export interface StatusHistoryEntry {
    status: RefillRequestStatus;
    timestamp: FieldValue | Timestamp;
}

export interface RefillRequest {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  clientId: string;
  requestedAt: FieldValue | Timestamp;
  status: RefillRequestStatus;
  statusHistory?: StatusHistoryEntry[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'delivery' | 'compliance' | 'sanitation' | 'payment' | 'general';
  title: string;
  description: string;
  date: FieldValue | Timestamp;
  isRead: boolean;
  data?: any;
}
    