import type { ConsumptionRecord, Delivery, ComplianceReport, SanitationVisit, WaterStation, AppUser } from '@/lib/types';

export const consumptionData: ConsumptionRecord[] = [
  { date: '2024-07-01', consumptionGallons: 150 },
  { date: '2024-07-02', consumptionGallons: 155 },
  { date: '2024-07-03', consumptionGallons: 145 },
  { date: '2024-07-04', consumptionGallons: 160 },
  { date: '2024-07-05', consumptionGallons: 158 },
  { date: '2024-07-06', consumptionGallons: 162 },
  { date: '2024-07-07', consumptionGallons: 153 },
  { date: '2024-07-08', consumptionGallons: 150 },
  { date: '2024-07-09', consumptionGallons: 148 },
  { date: '2024-07-10', consumptionGallons: 155 },
  { date: '2024-07-11', consumptionGallons: 165 },
  { date: '2024-07-12', consumptionGallons: 170 },
  { date: '2024-07-13', consumptionGallons: 168 },
  { date: '2024-07-14', consumptionGallons: 165 },
];

export const deliveries: Delivery[] = [
  { id: 'DEL-001', date: '2024-07-12', volumeGallons: 5000, status: 'Delivered' },
  { id: 'DEL-002', date: '2024-07-15', volumeGallons: 7500, status: 'In Transit' },
  { id: 'DEL-003', date: '2024-07-18', volumeGallons: 5000, status: 'Pending' },
  { id: 'DEL-004', date: '2024-07-05', volumeGallons: 6000, status: 'Delivered' },
  { id: 'DEL-005', date: '2024-07-01', volumeGallons: 4500, status: 'Delivered' },
];

export const complianceReports: ComplianceReport[] = [
  { id: 'REP-Q1-2024', date: '2024-04-15', status: 'Compliant', reportUrl: '#' },
  { id: 'REP-Q4-2023', date: '2024-01-15', status: 'Compliant', reportUrl: '#' },
  { id: 'REP-Q3-2023', date: '2023-10-15', status: 'Compliant', reportUrl: '#' },
  { id: 'REP-Q2-2023', date: '2023-07-15', status: 'Non-compliant', reportUrl: '#' },
];

export const sanitationVisits: SanitationVisit[] = [
  { id: 'VIS-001', scheduledDate: '2024-07-25', status: 'Scheduled', assignedTo: 'John Doe' },
  { id: 'VIS-002', scheduledDate: '2024-06-20', status: 'Completed', assignedTo: 'Jane Smith', reportUrl: '#' },
  { id: 'VIS-003', scheduledDate: '2024-05-15', status: 'Completed', assignedTo: 'John Doe', reportUrl: '#' },
  { id: 'VIS-004', scheduledDate: '2024-04-10', status: 'Cancelled', assignedTo: 'Jane Smith' },
];

export const waterStations: WaterStation[] = [
    { id: 'WS-001', name: 'Aqua Pure Fill', location: '123 Main St, Anytown', permitUrl: '#' },
    { id: 'WS-002', name: 'Crystal Clear Water', location: '456 Oak Ave, Anytown', permitUrl: '#' },
    { id: 'WS-003', name: 'H2Oasis', location: '789 Pine Ln, Anytown', permitUrl: '#' },
];

export const appUsers: AppUser[] = [
    { id: 'USR-001', name: 'Alice Johnson', email: 'alice@example.com', totalConsumptionLiters: 12500, accountStatus: 'Active', lastLogin: '2024-07-20' },
    { id: 'USR-002', name: 'Bob Williams', email: 'bob@example.com', totalConsumptionLiters: 23000, accountStatus: 'Active', lastLogin: '2024-07-19' },
    { id: 'USR-003', name: 'Charlie Brown', email: 'charlie@example.com', totalConsumptionLiters: 8000, accountStatus: 'Inactive', lastLogin: '2024-06-15' },
    { id: 'USR-004', name: 'Diana Miller', email: 'diana@example.com', totalConsumptionLiters: 55000, accountStatus: 'Active', lastLogin: '2024-07-20' },
    { id: 'USR-005', name: 'Ethan Davis', email: 'ethan@example.com', totalConsumptionLiters: 1500, accountStatus: 'Suspended', lastLogin: '2024-07-18' },
];
