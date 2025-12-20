// This file can be used to define types that are shared between your client and functions.

import { FieldValue, Timestamp } from "firebase-admin/firestore";

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
