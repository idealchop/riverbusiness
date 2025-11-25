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
