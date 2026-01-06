
// This file can be used to define types that are shared between your client and functions.

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
}
