export interface ConsumptionRecord {
  date: string;
  consumptionGallons: number;
}

export interface Delivery {
  id: string;
  date: string;
  volumeGallons: number;
  status: 'Delivered' | 'In Transit' | 'Pending';
  attachment?: string;
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
  id: string;
  name: string;
  location: string;
  permitUrl: string;
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
    password?: string;
    totalConsumptionLiters: number;
    accountStatus: 'Active' | 'Inactive';
    lastLogin: string;
    permissions?: Permission[];
    role?: 'Admin' | 'Member';
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
}
