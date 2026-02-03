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
