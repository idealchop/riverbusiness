import type { ConsumptionRecord, Delivery, ComplianceReport, SanitationVisit, WaterStation, AppUser, LoginLog, Feedback, Payment } from '@/lib/types';

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

export const appUsers: (AppUser & { role?: 'Admin' | 'User' })[] = [
    { id: 'USR-001', name: 'Alice Johnson', password: 'password123', totalConsumptionLiters: 12500, accountStatus: 'Active', lastLogin: '2024-07-20', role: 'User' },
    { id: 'USR-002', name: 'Bob Williams', password: 'password123', totalConsumptionLiters: 23000, accountStatus: 'Active', lastLogin: '2024-07-19', role: 'User' },
    { id: 'USR-003', name: 'Charlie Brown', password: 'password123', totalConsumptionLiters: 8000, accountStatus: 'Inactive', lastLogin: '2024-06-15', role: 'User' },
    { id: 'USR-004', name: 'Diana Miller', password: 'password123', totalConsumptionLiters: 55000, accountStatus: 'Active', lastLogin: '2024-07-20', role: 'User' },
    { id: 'USR-005', name: 'Ethan Davis', password: 'password123', totalConsumptionLiters: 1500, accountStatus: 'Inactive', lastLogin: '2024-07-18', role: 'User' },
    { id: 'USR-ADM', name: 'Admin User', password: 'password123', totalConsumptionLiters: 0, accountStatus: 'Active', lastLogin: '2024-07-21', role: 'Admin' },
];

export const loginLogs: LoginLog[] = [
  { id: 'LOG-001', userId: 'USR-001', userName: 'Alice Johnson', timestamp: '2024-07-20T10:30:00Z', ipAddress: '192.168.1.101', status: 'Success' },
  { id: 'LOG-002', userId: 'USR-002', userName: 'Bob Williams', timestamp: '2024-07-20T10:32:15Z', ipAddress: '10.0.0.5', status: 'Success' },
  { id: 'LOG-003', userId: 'USR-006', userName: 'Frank White', timestamp: '2024-07-20T10:33:05Z', ipAddress: '172.16.0.20', status: 'Failure' },
  { id: 'LOG-004', userId: 'USR-004', userName: 'Diana Miller', timestamp: '2024-07-20T10:35:40Z', ipAddress: '203.0.113.55', status: 'Success' },
  { id: 'LOG-005', userId: 'USR-005', userName: 'Ethan Davis', timestamp: '2024-07-20T10:36:10Z', ipAddress: '198.51.100.8', status: 'Success' },
  { id: 'LOG-006', userId: 'USR-003', userName: 'Charlie Brown', timestamp: '2024-06-15T18:05:12Z', ipAddress: '192.0.2.14', status: 'Success' },
];

export const feedbackLogs: Feedback[] = [
    { id: 'FB-001', userId: 'USR-001', userName: 'Alice Johnson', timestamp: '2024-07-21T14:00:00Z', feedback: 'The new dashboard is great! Very easy to navigate.', rating: 5, read: false },
    { id: 'FB-002', userId: 'USR-002', userName: 'Bob Williams', timestamp: '2024-07-21T15:30:00Z', feedback: 'I wish there was a way to see my consumption in real-time.', rating: 4, read: false },
    { id: 'FB-003', userId: 'USR-005', userName: 'Ethan Davis', timestamp: '2024-07-22T09:12:00Z', feedback: 'The app is a bit slow to load on my phone.', rating: 3, read: true },
    { id: 'FB-004', userId: 'USR-004', userName: 'Diana Miller', timestamp: '2024-07-22T11:45:00Z', feedback: 'Excellent service and the delivery tracking is very accurate.', rating: 5, read: false },
];


export const paymentHistory: Payment[] = [
    { id: 'INV-08-2024', date: '2024-08-15', description: 'August 2024 Invoice', amount: 155.00, status: 'Upcoming' },
    { id: 'INV-07-2024', date: '2024-07-15', description: 'July 2024 Invoice', amount: 150.0, status: 'Paid' },
    { id: 'INV-06-2024', date: '2024-06-15', description: 'June 2024 Invoice', amount: 145.0, status: 'Paid' },
    { id: 'INV-05-2024', date: '2024-05-15', description: 'May 2024 Invoice', amount: 0.0, status: 'Paid' },
    { id: 'INV-04-2024', date: '2024-04-15', description: 'April 2024 Invoice', amount: 152.0, status: 'Paid' },
    { id: 'INV-03-2024', date: '2024-03-15', description: 'March 2024 Invoice', amount: 148.0, status: 'Paid' },
    { id: 'INV-02-2024', date: '2024-02-15', description: 'February 2024 Invoice', amount: 155.0, status: 'Paid' },
    { id: 'INV-01-2024', date: '2024-01-15', description: 'January 2024 Invoice', amount: 160.0, status: 'Paid' },
    { id: 'INV-12-2023', date: '2023-12-15', description: 'December 2023 Invoice', amount: 158.0, status: 'Paid' },
    { id: 'INV-11-2023', date: '2023-11-15', description: 'November 2023 Invoice', amount: 154.0, status: 'Paid' },
    { id: 'INV-10-2023', date: '2023-10-15', description: 'October 2023 Invoice', amount: 150.0, status: 'Paid' },
    { id: 'INV-09-2023', date: '2023-09-15', description: 'September 2023 Invoice', amount: 147.0, status: 'Paid' },
];
