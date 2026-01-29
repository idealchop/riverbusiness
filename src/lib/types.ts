




import {FieldValue, Timestamp} from 'firebase/firestore';

export interface ConsumptionRecord {
  date: string;
  consumptionContainers: number;
}

export interface Delivery {
  id: string;
  userId: string;
  parentId?: string;
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

export interface DispenserReport {
    dispenserId: string;
    dispenserName: string;
    dispenserCode?: string;
    checklist: SanitationChecklistItem[];
}

export interface SanitationVisit {
  id: string;
  userId: string;
  scheduledDate: string;
  status: 'Completed' | 'Scheduled' | 'Cancelled';
  assignedTo: string;
  reportUrl?: string; // This might be a summary report URL now
  dispenserReports?: DispenserReport[]; // Replaces single checklist
  shareableLink?: string;
  officerSignature?: string;
  clientSignature?: string;
  clientRepName?: string;
  officerSignatureDate?: string;
  clientSignatureDate?: string;
}

export interface WaterStation {
  id:string;
  name: string;
  location: string;
  partnershipAgreementUrl?: string;
  status: 'Operational' | 'Under Maintenance';
  statusMessage?: string;
}

export type Permission = 
  | 'view_dashboard' 
  | 'view_payments' 
  | 'manage_deliveries' 
  | 'view_quality_reports' 
  | 'manage_users' 
  | 'access_admin_panel';

export type AccountType = 'Single' | 'Parent' | 'Branch';

export interface ManualCharge {
  id: string;
  description: string;
  amount: number;
  dateAdded: FieldValue | Timestamp;
}

export interface AppUser {
    id: string; // This is the Firebase Auth UID
    clientId?: string; // This is the manually entered client ID
    name: string;
    email: string; // Login email
    businessEmail?: string; // Contact email
    businessName: string;
    address?: string;
    contactNumber?: string;
    // For fixed plans, this is the running balance. For Parent/Prepaid, this is deprecated.
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
    isPrepaid?: boolean;
    customPlanDetails?: {
        litersPerMonth?: number;
        bonusLiters?: number;
        gallonQuantity?: number;
        gallonPrice?: number;
        gallonPaymentType?: 'Monthly' | 'One-Time';
        dispenserQuantity?: number;
        dispenserPrice?: number;
        dispenserPaymentType?: 'Monthly' | 'One-Time';
        sanitationPrice?: number;
        sanitationPaymentType?: 'Monthly' | 'One-Time';
        deliveryFrequency?: string;
        deliveryDay?: string;
        deliveryTime?: string;
        autoRefillEnabled?: boolean;
        lastMonthRollover?: number;
    };
    currentContractUrl?: string;
    photoURL?: string;
    contractStatus?: string;
    contractUploadedDate?: any;
    lastDeliveryStatus?: 'Delivered' | 'In Transit' | 'Pending' | 'No Delivery';
    pendingPlan?: any;
    planChangeEffectiveDate?: any;
    lastChatMessage?: string;
    lastChatTimestamp?: FieldValue | Timestamp;
    hasUnreadAdminMessages?: boolean;
    hasUnreadUserMessages?: boolean;
    supportDisplayName?: string;
    supportDescription?: string;
    supportPhotoURL?: string;
    // New fields for multi-branch feature
    accountType?: AccountType;
    parentId?: string;
    topUpBalanceCredits?: number;
    pendingCharges?: ManualCharge[];
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
  status: 'Paid' | 'Upcoming' | 'Overdue' | 'Pending Review' | 'Covered by Parent Account';
  proofOfPaymentUrl?: string;
  rejectionReason?: string;
  manualCharges?: ManualCharge[];
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
  volumeContainers?: number;
  requestedDate?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'delivery' | 'compliance' | 'sanitation' | 'payment' | 'general' | 'top-up';
  title: string;
  description: string;
  date: FieldValue | Timestamp;
  isRead: boolean;
  data?: any;
}
    
export interface ChatMessage {
  id: string;
  text?: string;
  role: 'user' | 'admin';
  timestamp: FieldValue | Timestamp;
  attachmentUrl?: string;
  attachmentType?: string;
}

export interface Transaction {
    id: string;
    date: FieldValue | Timestamp;
    type: 'Credit' | 'Debit';
    amountCredits: number;
    description: string;
    branchId?: string;
    branchName?: string;
}

export interface TopUpRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Approved (Initial Balance)';
  requestedAt: FieldValue | Timestamp;
  proofOfPaymentUrl?: string;
  rejectionReason?: string;
}
    

    
export interface PublicSanitationLink {
    id: string;
    userId: string;
    visitId: string;
    createdAt: FieldValue | Timestamp;
}
    

    


    
