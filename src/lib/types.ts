import {FieldValue, Timestamp} from 'firebase/firestore';

export interface AppUser {
    id: string;
    clientId?: string;
    name: string;
    email: string;
    businessEmail?: string;
    businessName: string;
    address?: string;
    contactNumber?: string;
    notificationEmails?: string[];
    totalConsumptionLiters: number; 
    accountStatus: 'Active' | 'Inactive';
    lastLogin: string;
    role: 'Admin' | 'User';
    hrRole?: 'owner' | 'admin' | 'employee';
    companyId?: string;
    assignedWaterStationId?: string;
    createdAt: any;
    lastBilledDate?: any;
    onboardingComplete?: boolean;
    plan?: {
        name: string;
        price: number;
        isConsumptionBased: boolean;
    };
    customPlanDetails?: any;
    photoURL?: string;
    hrProfile?: HREmployeeProfile;
    pendingCharges?: any[];
    accountType?: 'Single' | 'Parent' | 'Branch';
    parentId?: string;
    topUpBalanceCredits?: number;
    hasUnreadAdminMessages?: boolean;
    hasUnreadUserMessages?: boolean;
    supportDisplayName?: string;
    supportDescription?: string;
    supportPhotoURL?: string;
}

export interface HREmployeeProfile {
    firstName: string;
    lastName: string;
    salaryType: 'daily' | 'monthly';
    rate: number;
    startDate: string;
    position: string;
    department: string;
    status: 'Active' | 'Terminated' | 'On Leave';
}

export interface HRAttendanceLog {
    id: string;
    companyId: string;
    employeeId: string;
    employeeName: string;
    date: string;
    timeIn: any;
    timeOut?: any;
    totalMinutes?: number;
    method: 'QR' | 'manual';
    status: 'present' | 'late' | 'absent' | 'leave';
}

export interface HRLeaveRequest {
    id: string;
    companyId: string;
    employeeId: string;
    employeeName: string;
    type: 'Vacation' | 'Sick' | 'Emergency' | 'Maternity/Paternity';
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: any;
}

export interface HRPayrollRun {
    id: string;
    companyId: string;
    periodStart: string;
    periodEnd: string;
    status: 'draft' | 'processed' | 'paid';
    totalNetSalary: number;
    createdAt: any;
}

export interface HRLearningModule {
    id: string;
    companyId: string;
    title: string;
    description: string;
    category: string;
    contentType: 'video' | 'image' | 'article';
    contentUrl?: string;
    textContent?: string;
    createdAt: any;
    updatedAt?: any;
    isPublished: boolean;
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
  liters?: number;
  amount?: number;
}

export interface Payment {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Upcoming' | 'Overdue' | 'Pending Review' | 'Covered by Parent Account';
  proofOfPaymentUrl?: string;
  rejectionReason?: string;
  manualCharges?: any[];
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
}

export interface WaterStation {
  id:string;
  name: string;
  location: string;
  partnershipAgreementUrl?: string;
  status: 'Operational' | 'Under Maintenance';
  statusMessage?: string;
}

export interface ComplianceReport {
  id:string;
  name: string;
  reportType: string;
  resultId: string;
  date: any;
  status: string;
  reportUrl?: string;
}

export interface SanitationVisit {
  id: string;
  userId: string;
  scheduledDate: string;
  status: string;
  assignedTo: string;
  dispenserReports?: any[];
  shareableLink?: string;
  officerSignature?: string;
  clientSignature?: string;
  clientRepName?: string;
  officerSignatureDate?: string;
  clientSignatureDate?: string;
  proofUrls?: string[];
}
