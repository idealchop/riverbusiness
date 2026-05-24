import {FieldValue, Timestamp} from 'firebase/firestore';

export interface AppUser {
    id: string;
    clientId?: string;
    name: string;
    email: string;
    businessEmail?: string;
    businessName: string;
    address?: string;
    industry?: string;
    interests?: string[];
    contactNumber?: string;
    notificationEmails?: string[];
    totalConsumptionLiters: number; 
    usedStorageBytes?: number; // Quota tracking
    accountStatus: 'Active' | 'Inactive';
    lastLogin: string;
    role: 'Admin' | 'User';
    hrRole?: 'owner' | 'admin' | 'employee';
    companyId: string; // Mandatory for multi-tenancy
    assignedWaterStationId?: string;
    createdAt: any;
    lastBilledDate?: any;
    onboardingComplete?: boolean;
    subscriptionStatus?: 'pending_activation' | 'discovery_call' | 'activated';
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
    currentContractUrl?: string;
    contractUploadedDate?: any;
    contractStatus?: string;
}

export interface PricingHistory {
    id: string;
    containerPrice: number;
    literPrice: number;
    updatedAt: any;
    updatedBy: string;
    updatedByName: string;
}

export interface CloudFile {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    folderId: string | null;
    ownerId: string;
    ownerName?: string;
    ownerPhoto?: string;
    companyId: string;
    isFavorite: boolean;
    isTrashed: boolean;
    trashedAt?: any;
    createdAt: any;
    updatedAt: any;
}

export interface CloudFolder {
    id: string;
    name: string;
    parentId: string | null;
    ownerId: string;
    ownerName?: string;
    ownerPhoto?: string;
    companyId: string;
    isFavorite: boolean;
    isTrashed: boolean;
    trashedAt?: any;
    createdAt: any;
    updatedAt: any;
}

export interface HREmployeeProfile {
    firstName: string;
    lastName: string;
    employeeNumber: string; // Unique within company
    salaryType: 'daily' | 'weekly' | 'monthly' | 'bimonthly';
    rate: number;
    startDate: string;
    position: string;
    department: string;
    status: 'Active' | 'Terminated' | 'On Leave';
    sssNumber?: string;
    philhealthNumber?: string;
    pagibigNumber?: string;
    tinNumber?: string;
    sssDeduction?: number;
    philhealthDeduction?: number;
    pagibigDeduction?: number;
    taxDeduction?: number;
}

export interface CollabWorkspace {
    id: string;
    companyId: string;
    name: string;
    createdBy: string;
    createdAt: any;
}

export type CollabPageType = 'doc' | 'sheet' | 'board';

export interface BoardElement {
    id: string;
    type: 'note' | 'rect' | 'circle' | 'diamond' | 'text' | 'image' | 'path' | 'icon';
    x: number;
    y: number;
    text: string;
    color: string;
    width: number;
    height: number;
    fontSize?: number;
    fontColor?: string;
    bold?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    url?: string; // For images
    path?: string; // For freehand drawing (Pen tool)
    strokeWidth?: number; // Size for path elements
    iconName?: string; // For icon type
}

export interface BoardConnection {
    id: string;
    fromId: string;
    toId: string;
    type: 'straight' | 'curved' | 'step';
    color?: string;
    label?: string;
}

// --- Sheet Specific Types ---

export type SheetFieldType = 
  | 'text' 
  | 'longtext'
  | 'number' 
  | 'date' 
  | 'checkbox' 
  | 'select' 
  | 'multiselect' 
  | 'attachment' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'user' 
  | 'currency' 
  | 'status' 
  | 'formula';

export interface SheetField {
    id: string;
    name: string;
    type: SheetFieldType;
    options?: { label: string; color: string }[]; // For select/status
    width?: number;
    required?: boolean;
    isPrimary?: boolean;
    currencySymbol?: string;
}

export interface SheetRecord {
    id: string;
    values: Record<string, any>;
    createdAt: any;
    updatedAt: any;
    createdBy?: string;
}

export type SheetViewType = 'grid' | 'kanban' | 'calendar' | 'list';
export type RowHeight = 'short' | 'medium' | 'tall' | 'extra-tall';

export interface SheetView {
    id: string;
    name: string;
    type: SheetViewType;
    config?: {
        kanbanFieldId?: string; // For Kanban grouping
        calendarFieldId?: string; // For Calendar mapping
        galleryCoverId?: string; // Legacy
        hiddenFields?: string[];
        filters?: any[];
        sorts?: any[];
        groupByFieldId?: string; // NEW: Field to group by in grid view
        rowHeight?: RowHeight;
        wrapHeaders?: boolean;
    };
}

export interface CollabPage {
    id: string;
    companyId: string;
    workspaceId: string;
    parentId: string | null;
    type: CollabPageType;
    title: string;
    icon?: string;
    coverImage?: string;
    content?: any; // Dynamic content based on type (Doc content, Sheet data, or Board elements)
    createdBy: string;
    createdAt: any;
    updatedAt?: any;
    isFavorite?: boolean;
    isPrivate?: boolean; // NEW: Toggle between "Only Me" and "Team Access"
    isPublic?: boolean;
    shareToken?: string;
    sharePassword?: string;
    expiresAt?: any;
    isTrashed?: boolean;
    trashedAt?: any;
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
    action?: 'IN' | 'OUT'; 
    gps_lat?: number;
    gps_long?: number;
    validation_status: 'Valid' | 'Invalid' | 'Skipped';
    method: 'QR' | 'manual';
    status: 'present' | 'late' | 'absent' | 'leave';
    office_id?: string;
}

export interface HRCompanyLocation {
    id: string;
    companyId: string;
    office_name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    gps_verification_enabled: boolean;
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
    assignedEmployeeId?: string;
}

export interface HRLearningModuleViewer {
    id: string;
    userId: string;
    name: string;
    photoURL?: string;
    lastVisitedAt: any;
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
  attachmentUrl?: string;
  attachmentType?: string;
}

export interface WaterStation {
  id:string;
  name: string;
  location: string;
  email?: string;
  contactNumber?: string;
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

export interface HRPayrollRun {
    id: string;
    companyId: string;
    periodStart: string;
    periodEnd: string;
    status: 'draft' | 'processed' | 'paid';
    totalNetSalary: number;
    employeeCount?: number;
    createdAt: any;
    breakdown?: HRPayrollBreakdownItem[];
}

export interface HRPayrollBreakdownItem {
    employeeId: string;
    employeeName: string;
    employeeNumber?: string;
    amount: number;
    daysWorked?: number;
    rate: number;
    type: 'daily' | 'weekly' | 'monthly' | 'bimonthly';
    adjustment?: number;
    adjustmentRemarks?: string;
}

export interface ManualCharge {
  id: string;
  description: string;
  amount: number;
  dateAdded: FieldValue | Timestamp;
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

export interface StatusHistoryEntry {
    status: string;
    timestamp: FieldValue | Timestamp;
}

export interface RefillRequest {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  clientId: string;
  requestedAt: FieldValue | Timestamp;
  status: 'Requested' | 'In Production' | 'Out for Delivery' | 'Completed' | 'Cancelled';
  statusHistory?: StatusHistoryEntry[];
  volumeContainers?: number;
  requestedDate?: string;
}

export interface SecurityRuleContext {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
    requestResourceData?: any;
}
