
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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

export interface Delivery {
  id: string;
  userId: string;
  parentId?: string;
  date: string | Timestamp;
  volumeContainers: number;
  status: 'Delivered' | 'In Transit' | 'Pending';
  proofOfDeliveryUrl?: string;
  adminNotes?: string;
  liters?: number;
  amount?: number;
}

export interface ManualCharge {
  id: string;
  description: string;
  amount: number;
  dateAdded: FieldValue | Timestamp;
}

export interface RefillRequest {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  clientId: string;
  requestedAt: FieldValue | Timestamp;
  status: 'Requested' | 'In Production' | 'Out for Delivery' | 'Completed' | 'Cancelled';
  statusHistory?: any[];
  volumeContainers?: number;
  requestedDate?: string;
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
  scheduledDate: string | Timestamp;
  status: 'Completed' | 'Scheduled' | 'Cancelled';
  assignedTo: string;
  reportUrl?: string;
  dispenserReports?: DispenserReport[];
  shareableLink?: string;
  officerSignature?: string;
  clientSignature?: string;
  clientRepName?: string;
  officerSignatureDate?: string | Timestamp;
  clientSignatureDate?: string | Timestamp;
}

export interface ComplianceReport {
  id:string;
  name: string;
  reportType: 'DOH Bacteriological Test (Monthly)' | 'DOH Bacteriological Test (Semi-Annual)' | 'Sanitary Permit' | 'Business Permit';
  resultId: string;
  date: string | Timestamp;
  status: 'Passed' | 'Failed' | 'Pending Review';
  reportUrl?: string;
  results?: string;
}

export interface ManualReceiptRequest {
    id: string;
    userId: string;
    invoiceId: string;
    amount: number;
    requestedAt: FieldValue | Timestamp;
    status: 'pending' | 'completed';
    recipientEmail?: string | null;
}
