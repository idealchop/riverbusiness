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

export interface AppUser {
    id: string;
    name: string;
    email: string;
    totalConsumptionLiters: number;
    accountStatus: 'Active' | 'Inactive' | 'Suspended';
    lastLogin: string;
}
