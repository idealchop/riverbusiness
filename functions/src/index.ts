import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import PDFDocument from 'pdfkit';
import { format, startOfMonth, endOfMonth, parse, endOfDay } from 'date-fns';

// Initialize Firebase Admin SDK first
initializeApp();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import type { Delivery, RefillRequest, SanitationVisit, ComplianceReport, Transaction } from './types';
import { 
    sendEmail, 
    getDeliveryStatusTemplate, 
    getPaymentStatusTemplate, 
    getTopUpConfirmationTemplate,
    getRefillRequestTemplate,
    getWelcomeUnclaimedTemplate,
    getSanitationScheduledTemplate,
    getSanitationReportTemplate,
    getPaymentReminderTemplate
} from './email';

// Export all billing functions
export * from './billing';

const BRAND_PRIMARY = '#538ec2';
const LITER_RATIO = 19.5;

/**
 * Creates a notification document in a user's notification subcollection.
 */
async function createNotification(userId: string, notificationData: any) {
  if (!userId) return;
  const db = getFirestore();
  const notification = { 
    ...notificationData, 
    userId, 
    date: FieldValue.serverTimestamp(), 
    isRead: false 
  };
  try {
    await db.collection('users').doc(userId).collection('notifications').add(notification);
    logger.info(`Notification created for user ${userId}: ${notificationData.title}`);
  } catch (error) {
    logger.error(`Failed to create notification for user ${userId}`, error);
  }
}

const getSanitationPassRate = (v: SanitationVisit) => {
    if (!v.dispenserReports || v.dispenserReports.length === 0) return 'N/A';
    let total = 0;
    let passed = 0;
    v.dispenserReports.forEach(r => {
        if (r.checklist) {
            total += r.checklist.length;
            passed += r.checklist.filter(item => item.checked).length;
        }
    });
    return total > 0 ? `${Math.round((passed / total) * 100)}%` : 'N/A';
};

/**
 * Generates a high-fidelity, password-protected PDF Statement of Account.
 */
export async function generatePasswordProtectedSOA(
    user: any, 
    period: string, 
    deliveries: Delivery[], 
    sanitation: SanitationVisit[], 
    compliance: ComplianceReport[],
    transactions?: Transaction[]
): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({
            userPassword: user.clientId || 'password',
            ownerPassword: 'river-admin-secret',
            permissions: { printing: 'highResolution', copying: true, modifying: false },
            margin: 40
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const pageWidth = doc.page.width;
        const margin = 40;

        // 1. High-Fidelity Header (Solid Blue Banner)
        doc.fillColor(BRAND_PRIMARY).rect(0, 0, pageWidth, 120).fill();

        const pricePerLiter = user.plan?.price || 0;
        const pricePerContainer = pricePerLiter * LITER_RATIO;

        // Left Side Header Text
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('River Philippines', margin, 45);
        doc.fontSize(14).text('Statement of Account', margin, 72);
        doc.fontSize(10).font('Helvetica').text(`Plan: ${user.plan?.name || 'N/A'}`, margin, 92);
        
        // Right Side Banner Metadata
        doc.fontSize(10).font('Helvetica-Bold').text('STATEMENT DATE:', margin, 45, { align: 'right', width: pageWidth - margin * 2 });
        doc.font('Helvetica').text(format(new Date(), 'MMM d, yyyy'), margin, 58, { align: 'right', width: pageWidth - margin * 2 });
        
        doc.font('Helvetica-Bold').text('BILLING PERIOD:', margin, 75, { align: 'right', width: pageWidth - margin * 2 });
        doc.font('Helvetica').text(period, margin, 88, { align: 'right', width: pageWidth - margin * 2 });

        doc.fillColor('#000000').moveDown(4.5);
        
        // 2. Stakeholder Details (Two Column Layout)
        const topOfDetails = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_PRIMARY).text('FROM:', margin, topOfDetails);
        doc.text('TO:', pageWidth / 2 + 20, topOfDetails);

        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
        doc.text('River Tech Inc.', margin, topOfDetails + 15);
        doc.font('Helvetica').text('SEC Reg #: 202406123456', margin, topOfDetails + 27);
        doc.text('Filinvest Axis Tower 1, Alabang', margin, topOfDetails + 39);
        doc.text('customers@riverph.com', margin, topOfDetails + 51);

        doc.font('Helvetica-Bold').text(user.businessName || 'N/A', pageWidth / 2 + 20, topOfDetails + 15);
        doc.font('Helvetica').text(user.address || 'N/A', pageWidth / 2 + 20, topOfDetails + 27, { width: pageWidth / 2 - 60 });
        
        const idY = doc.y + 2;
        doc.text(`Client ID: ${user.clientId || 'N/A'}`, pageWidth / 2 + 20, idY); 
        doc.text(user.email || '', pageWidth / 2 + 20, idY + 12);

        doc.moveDown(3);

        const drawTable = (title: string, headers: string[], rows: any[][]) => {
            if (rows.length === 0) return;
            
            if (doc.y > doc.page.height - 100) doc.addPage();

            doc.moveDown(1);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND_PRIMARY).text(title, margin);
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const colWidth = (pageWidth - margin * 2) / headers.length;

            doc.rect(margin, tableTop, pageWidth - margin * 2, 20).fill(BRAND_PRIMARY);
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
            
            headers.forEach((h, i) => {
                doc.text(h, margin + (i * colWidth) + 5, tableTop + 6, { width: colWidth - 10 });
            });

            doc.y = tableTop + 20;
            doc.moveDown(0.2);
            doc.fillColor('#000000').font('Helvetica').fontSize(8);

            rows.forEach((row, rowIndex) => {
                if (doc.y > doc.page.height - 40) {
                    doc.addPage();
                }
                const rowY = doc.y;
                if (rowIndex % 2 !== 0) {
                    doc.rect(margin, rowY - 2, pageWidth - margin * 2, 15).fill('#f8fafc');
                    doc.fillColor('#000000');
                }
                row.forEach((cell, i) => {
                    doc.text(cell.toString(), margin + (i * colWidth) + 5, rowY, { width: colWidth - 10 });
                });
                doc.moveDown(1.2);
            });
            doc.moveDown(1);
        };

        if (transactions && transactions.length > 0) {
            const totalCredits = transactions.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amountCredits, 0);
            const totalDebits = transactions.filter(t => t.type === 'Debit').reduce((sum, t) => sum + (t.amountCredits || 0), 0);
            const finalBalance = user.topUpBalanceCredits || 0;
            const summaryBody = [
                ['Total Credits (Top-Ups)', `P ${totalCredits.toLocaleString()}`],
                ['Total Debits (Branch Consumption)', `P ${totalDebits.toLocaleString()}`],
                ['Final Balance', `P ${finalBalance.toLocaleString()}`]
            ];
            drawTable('Financial Summary', ['Description', 'Amount'], summaryBody);
        }

        if (user.customPlanDetails) {
            const eq = user.customPlanDetails;
            const eqRows = [];
            if (eq.gallonQuantity) eqRows.push(['5-Gallon Reusable Containers', eq.gallonQuantity, `P${(eq.gallonPrice || 0).toLocaleString()}`, eq.gallonPaymentType || 'Monthly', `P${(eq.gallonPrice || 0).toLocaleString()}`]);
            if (eq.dispenserQuantity) eqRows.push(['Premium Hot & Cold Water Dispenser', eq.dispenserQuantity, `P${(eq.dispenserPrice || 0).toLocaleString()}`, eq.dispenserPaymentType || 'Monthly', `P${(eq.dispenserPrice || 0).toLocaleString()}`]);
            if (eq.sanitationPrice) eqRows.push(['Professional Monthly Sanitation', '1', `P${(eq.sanitationPrice || 0).toLocaleString()}`, eq.sanitationPaymentType || 'Monthly', `P${(eq.sanitationPrice || 0).toLocaleString()}`]);
            drawTable('Equipment & Services Summary', ['Service Item', 'Qty', 'Unit Price', 'Frequency', 'Subtotal'], eqRows);
        }

        if (sanitation.length > 0) {
            const sanRows = sanitation.map(s => [
                format(new Date(typeof s.scheduledDate === 'string' ? s.scheduledDate : (s.scheduledDate as any).toDate()), 'PP'), 
                s.status, 
                s.assignedTo, 
                getSanitationPassRate(s)
            ]);
            drawTable('Office Sanitation Logs', ['Date', 'Status', 'Officer', 'Score Rate'], sanRows);
        }

        if (compliance.length > 0) {
            const compRows = compliance.map(c => [
                c.name, 
                c.date ? format((c.date as any).toDate(), 'MMM yyyy') : 'N/A', 
                c.status
            ]);
            drawTable('Water Quality & Station Compliance', ['Report Name', 'Period', 'Status'], compRows);
        }

        let totalQty = 0; let totalLiters = 0; let totalAmount = 0;
        const refillRows = deliveries.map(d => {
            const qty = d.volumeContainers || 0;
            const liters = d.liters || (qty * LITER_RATIO);
            const amount = d.amount || (liters * pricePerLiter);
            totalQty += qty; totalLiters += liters; totalAmount += amount;
            return [
                d.id, 
                format(new Date(typeof d.date === 'string' ? d.date : (d.date as any).toDate()), 'MMM d, yyyy'), 
                qty, 
                `P${pricePerContainer.toFixed(2)}`, 
                `${liters.toFixed(1)}L`, 
                `P${amount.toFixed(2)}`, 
                d.status
            ];
        });
        drawTable('Water Refill Logs', ['Ref ID', 'Date', 'Qty', 'Price/Unit', 'Volume', 'Amount', 'Status'], refillRows);

        if (doc.y > doc.page.height - 80) doc.addPage();
        
        const finalY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').text('TOTAL CONSUMPTION:', margin + 150, finalY);
        doc.text(totalQty.toString(), margin + 280, finalY);
        doc.text(`${totalLiters.toFixed(1)} L`, margin + 360, finalY);
        doc.text(`P ${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, margin + 440, finalY);

        const vatAmount = totalAmount * (12/112);
        doc.moveDown(1.5).fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
        doc.text(`VAT (12% Included): P ${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}`, 0, doc.y, { align: 'right', width: pageWidth - margin });

        doc.end();
    });
}

// --- TRIGGERS ---

export const onpaymentremindercreate = onDocumentCreated({
    document: "users/{userId}/reminders/{reminderId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const db = getFirestore();
    const { period: selectedPeriod } = event.data.data();
    
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    if (!user || !user.email) return;

    let billingPeriodLabel = 'Full Account History';
    let cycleStart = new Date(0);
    let cycleEnd = endOfDay(new Date());

    if (selectedPeriod && selectedPeriod !== 'full') {
        if (selectedPeriod === '2025-12_2026-01') {
            cycleStart = new Date(2025, 11, 1);
            cycleEnd = endOfDay(endOfMonth(new Date(2026, 0, 1)));
            billingPeriodLabel = 'December 2025 - January 2026';
        } else {
            const parsed = parse(selectedPeriod, 'yyyy-MM', new Date());
            cycleStart = startOfMonth(parsed);
            cycleEnd = endOfDay(endOfMonth(parsed));
            billingPeriodLabel = format(parsed, 'MMMM yyyy');
        }
    }

    const deliveriesSnap = await db.collection('users').doc(userId).collection('deliveries')
        .where('date', '>=', cycleStart.toISOString())
        .where('date', '<=', cycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnap.docs.map(d => d.data() as Delivery);

    const pricePerLiter = user.plan?.price || 0;
    const totalAmount = deliveries.reduce((sum, d) => sum + (d.amount || (d.volumeContainers * LITER_RATIO * pricePerLiter)), 0);

    const sanitationSnap = await db.collection('users').doc(userId).collection('sanitationVisits')
        .where('scheduledDate', '>=', cycleStart.toISOString())
        .where('scheduledDate', '<=', cycleEnd.toISOString())
        .get();
    const sanitation = sanitationSnap.docs.map(d => d.data() as SanitationVisit);

    let complianceReports: ComplianceReport[] = [];
    if (user.assignedWaterStationId) {
        const complianceSnap = await db.collection('waterStations').doc(user.assignedWaterStationId).collection('complianceReports').limit(5).get();
        complianceReports = complianceSnap.docs.map(d => d.data() as ComplianceReport);
    }

    let transactions: Transaction[] = [];
    if (user.accountType === 'Parent') {
        const transactionsSnap = await db.collection('users').doc(userId).collection('transactions').get();
        transactions = transactionsSnap.docs.map(d => d.data() as Transaction);
    }

    const pdfBuffer = await generatePasswordProtectedSOA(user, billingPeriodLabel, deliveries, sanitation, complianceReports, transactions);
    const template = getPaymentReminderTemplate(user.businessName, totalAmount.toFixed(2), billingPeriodLabel);
    
    // Specialized CC Logic
    const ccList = user.clientId === 'SC2500000001' ? ['support@riverph.com', 'cavatan.jheck@gmail.com'] : 'support@riverph.com';

    try {
        await sendEmail({
            to: user.email,
            cc: ccList,
            subject: template.subject,
            text: `Reminder: Your statement for ${billingPeriodLabel} is ₱${totalAmount.toFixed(2)}.`,
            html: template.html,
            attachments: [{
                filename: `SOA_${user.businessName.replace(/\s/g, '_')}_${billingPeriodLabel.replace(/\s/g, '-')}.pdf`,
                content: pdfBuffer
            }]
        });
        logger.info(`Follow-up email with SOA sent to ${user.email} for period ${selectedPeriod}`);
    } catch (error) {
        logger.error(`Failed to send follow-up to ${user.email}`, error);
    }
});

export const onunclaimedprofilecreate = onDocumentCreated({
    document: "unclaimedProfiles/{clientId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const profile = event.data.data();
    if (!profile.businessEmail) return;
    const planName = `${profile.clientType || ''} - ${profile.plan?.name || ''}`;
    const schedule = `${profile.customPlanDetails?.deliveryDay || 'TBD'} / ${profile.customPlanDetails?.deliveryFrequency || 'TBD'}`;
    const template = getWelcomeUnclaimedTemplate(profile.businessName || profile.name || 'Valued Client', profile.clientId, planName, profile.address || 'N/A', schedule);
    try {
        await sendEmail({ to: profile.businessEmail, cc: 'support@riverph.com', subject: template.subject, text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}.`, html: template.html });
    } catch (error) { logger.error(`Failed welcome email`, error); }
});

export const ondeliverycreate = onDocumentCreated({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data() as Delivery;
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, { type: 'delivery', title: 'Delivery Scheduled', description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, data: { deliveryId } });
    if (userData?.email && delivery.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Delivery complete`, html: template.html });
    }
});

export const ondeliveryupdate = onDocumentUpdated({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data() as Delivery;
    const after = event.data.after.data() as Delivery;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    if (before.status === after.status) return;
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, { type: 'delivery', title: `Delivery ${after.status}`, description: `Your delivery is now ${after.status}.`, data: { deliveryId } });
    if (userData?.email && after.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, after.volumeContainers);
        await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Delivery complete`, html: template.html });
    }
});

export const onpaymentupdate = onDocumentUpdated({
    document: "users/{userId}/payments/{paymentId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status === after.status) return;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { type: 'payment', title: 'Payment Confirmed', description: `Payment for invoice ${after.id} confirmed.`, data: { paymentId: after.id } });
        if (userData?.email) {
            const template = getPaymentStatusTemplate(userData.businessName, after.id, after.amount, 'Paid');
            await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Payment confirmed`, html: template.html });
        }
    }
});

export const ontopuprequestupdate = onDocumentUpdated({
    document: "users/{userId}/topUpRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status === after.status || after.status !== 'Approved') return;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.email) {
        const template = getTopUpConfirmationTemplate(userData.businessName, after.amount);
        await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Top-up approved`, html: template.html });
    }
});

export const onrefillrequestcreate = onDocumentCreated({
    document: "users/{userId}/refillRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const request = event.data.data() as RefillRequest;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.email) {
        const template = getRefillRequestTemplate(userData.businessName, 'Requested', requestId, request.requestedDate);
        await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Refill request received`, html: template.html });
    }
});

export const onsanitationcreate = onDocumentCreated({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const visit = event.data.data() as SanitationVisit;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.email && visit.status === 'Scheduled') {
        const dateStr = new Date(visit.scheduledDate as any).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const template = getSanitationScheduledTemplate(userData.businessName, visit.assignedTo, dateStr);
        await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Visit scheduled`, html: template.html });
    }
});

export const onsanitationupdate = onDocumentUpdated({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const before = event.data.before.data() as SanitationVisit;
    const after = event.data.after.data() as SanitationVisit;
    const userId = event.params.userId;
    if (before.status !== 'Completed' && after.status === 'Completed') {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData?.email) {
            const dateStr = new Date(after.scheduledDate as any).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const template = getSanitationReportTemplate(userData.businessName, after.assignedTo, dateStr);
            await sendEmail({ to: userData.email, cc: 'support@riverph.com', subject: template.subject, text: `Report ready`, html: template.html });
        }
    }
});

export const onfileupload = onObjectFinalized({ memory: "256MiB" }, async (event) => {
  const filePath = event.data.name;
  if (!filePath || event.data.contentType?.startsWith('application/x-directory')) return;
  const storage = getStorage();
  const db = getFirestore();
  const bucket = storage.bucket(event.data.bucket);
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });
  if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
      const userId = filePath.split("/")[1];
      await db.collection("users").doc(userId).update({ photoURL: url });
  } else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
      const customMetadata = event.data.metadata;
      if (customMetadata?.paymentId && customMetadata?.userId) {
          await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({ proofOfPaymentUrl: url, status: "Pending Review" });
      }
  }
});
