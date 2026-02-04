import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import axios from 'axios';
import PDFDocument from 'pdfkit';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';

// Initialize Firebase Admin SDK first
initializeApp();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import type { Delivery, RefillRequest, SanitationVisit, ComplianceReport } from './types';
import { 
    sendEmail, 
    getDeliveryStatusTemplate, 
    getPaymentStatusTemplate, 
    getTopUpConfirmationTemplate,
    getRefillRequestTemplate,
    getWelcomeUnclaimedTemplate,
    getSanitationScheduledTemplate,
    getSanitationReportTemplate,
    getPaymentReminderTemplate,
    getNewInvoiceTemplate
} from './email';

// Export all billing functions
export * from './billing';

const BRAND_PRIMARY = '#538ec2';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';
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
 * Generates a password-protected PDF Statement of Account.
 */
export async function generatePasswordProtectedSOA(user: any, period: string, deliveries: Delivery[], sanitation: SanitationVisit[], compliance: ComplianceReport[]): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({
            userPassword: user.clientId || 'password',
            ownerPassword: 'river-admin-secret',
            permissions: { printing: 'highResolution', copying: true, modifying: false }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        try {
            const response = await axios.get(LOGO_URL, { responseType: 'arraybuffer' });
            doc.image(Buffer.from(response.data), 40, 40, { width: 55 });
        } catch (e) {
            logger.warn("PDF Logo fetch failed, skipping image.");
        }

        const pricePerLiter = user.plan?.price || 0;
        const pricePerContainer = pricePerLiter * LITER_RATIO;

        // Structured Header (Left Aligned)
        doc.fillColor(BRAND_PRIMARY).fontSize(20).font('Helvetica-Bold').text('River Philippines', 110, 45);
        doc.fontSize(14).text('Statement of Account', 110, 68);
        doc.fillColor('#666').fontSize(10).font('Helvetica').text(`Plan: ${user.plan?.name || 'N/A'}`, 110, 85);
        
        doc.moveDown(3.5);
        doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Client Details');
        doc.fontSize(10).font('Helvetica').text(`Business Name: ${user.businessName}`);
        doc.text(`Client ID: ${user.clientId}`);
        doc.text(`Address: ${user.address || 'N/A'}`);
        doc.text(`Period: ${period}`);

        // 1. Equipment & Services Summary
        if (user.customPlanDetails) {
            const eq = user.customPlanDetails;
            doc.moveDown(2);
            doc.fontSize(12).font('Helvetica-Bold').text('Equipment & Services Summary');
            doc.moveDown();

            const eqTop = doc.y;
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Service Item', 40, eqTop);
            doc.text('Qty', 220, eqTop);
            doc.text('Unit Price', 260, eqTop);
            doc.text('Frequency', 340, eqTop);
            doc.text('Subtotal', 450, eqTop);
            
            doc.moveDown(0.5);
            doc.lineWidth(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            doc.font('Helvetica').fontSize(8);
            if (eq.gallonQuantity) {
                doc.text('5-Gallon Reusable Containers', 40, doc.y);
                doc.text(eq.gallonQuantity.toString(), 220, doc.y);
                doc.text(`P${(eq.gallonPrice || 0).toLocaleString()}`, 260, doc.y);
                doc.text(eq.gallonPaymentType || 'Monthly', 340, doc.y);
                doc.text(`P${(eq.gallonPrice || 0).toLocaleString()}`, 450, doc.y);
                doc.moveDown();
            }
            if (eq.dispenserQuantity) {
                doc.text('Premium Hot & Cold Water Dispenser', 40, doc.y);
                doc.text(eq.dispenserQuantity.toString(), 220, doc.y);
                doc.text(`P${(eq.dispenserPrice || 0).toLocaleString()}`, 260, doc.y);
                doc.text(eq.dispenserPaymentType || 'Monthly', 340, doc.y);
                doc.text(`P${(eq.dispenserPrice || 0).toLocaleString()}`, 450, doc.y);
                doc.moveDown();
            }
            if (eq.sanitationPrice) {
                doc.text('Professional Monthly Sanitation Service', 40, doc.y);
                doc.text('1', 220, doc.y);
                doc.text(`P${(eq.sanitationPrice || 0).toLocaleString()}`, 260, doc.y);
                doc.text(eq.sanitationPaymentType || 'Monthly', 340, doc.y);
                doc.text(`P${(eq.sanitationPrice || 0).toLocaleString()}`, 450, doc.y);
                doc.moveDown();
            }
        }

        if (sanitation.length > 0) {
            doc.moveDown(2);
            doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Office Sanitation Logs');
            doc.moveDown();
            doc.fontSize(9);
            doc.text('Date', 40, doc.y);
            doc.text('Status', 150, doc.y);
            doc.text('Officer', 250, doc.y);
            doc.text('Score Rate', 400, doc.y);
            doc.moveDown(0.5);
            doc.lineWidth(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);
            
            doc.font('Helvetica').fontSize(8);
            sanitation.forEach(s => {
                const dateStr = typeof s.scheduledDate === 'string' ? s.scheduledDate.split('T')[0] : 'N/A';
                const currentY = doc.y;
                doc.text(dateStr, 40, currentY);
                doc.text(s.status, 150, currentY);
                doc.text(s.assignedTo, 250, currentY);
                doc.text(getSanitationPassRate(s), 400, currentY);
                doc.moveDown();
            });
        }

        if (compliance.length > 0) {
            doc.moveDown(2);
            doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Water Quality & Station Compliance');
            doc.moveDown();
            doc.fontSize(9);
            doc.text('Report Name', 40, doc.y);
            doc.text('Period', 300, doc.y);
            doc.text('Status', 450, doc.y);
            doc.moveDown(0.5);
            doc.lineWidth(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);
            
            doc.font('Helvetica').fontSize(8);
            compliance.forEach(c => {
                const currentY = doc.y;
                doc.text(c.name, 40, currentY);
                const periodStr = c.date ? format((c.date as any).toDate(), 'MMM yyyy') : 'N/A';
                doc.text(periodStr, 300, currentY);
                doc.text(c.status, 450, currentY);
                doc.moveDown();
            });
        }

        // 4. Water Delivery History (REFILL LOGS LAST)
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica-Bold').text('Water Delivery History');
        doc.moveDown();

        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Date', 40, tableTop);
        doc.text('Tracking #', 120, tableTop);
        doc.text('Qty', 220, tableTop);
        doc.text('Price/Unit', 260, tableTop);
        doc.text('Vol (L)', 330, tableTop);
        doc.text('Amount', 410, tableTop);
        doc.text('Status', 490, tableTop);
        
        doc.moveDown(0.5);
        doc.lineWidth(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        let totalQty = 0;
        let totalLiters = 0;
        let totalAmount = 0;

        doc.font('Helvetica').fontSize(8);
        deliveries.forEach(d => {
            const dateStr = typeof d.date === 'string' ? d.date.split('T')[0] : 'N/A';
            const qty = d.volumeContainers || 0;
            const liters = d.liters || (qty * LITER_RATIO);
            const amount = d.amount || (liters * pricePerLiter);
            
            totalQty += qty;
            totalLiters += liters;
            totalAmount += amount;

            const currentY = doc.y;
            doc.text(dateStr, 40, currentY);
            doc.text(d.id, 120, currentY);
            doc.text(qty.toString(), 220, currentY);
            doc.text(`P${pricePerContainer.toFixed(2)}`, 260, currentY);
            doc.text(`${liters.toFixed(1)}L`, 330, currentY);
            doc.text(`P${amount.toFixed(2)}`, 410, currentY);
            doc.text(d.status, 490, currentY);
            doc.moveDown();
        });

        doc.moveDown();
        doc.lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        const summaryY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('TOTAL CONSUMPTION', 40, summaryY);
        doc.text(totalQty.toString(), 220, summaryY);
        doc.text(`${totalLiters.toFixed(1)} L`, 330, summaryY);
        doc.text(`P ${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 410, summaryY);

        doc.moveDown(1.5);
        const vatAmount = totalAmount * (12/112);
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666');
        doc.text(`VAT (12% Included): P ${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}`, 40, doc.y, { align: 'right', width: 510 });

        doc.end();
    });
}

// --- TRIGGERS ---

/**
 * Triggered when an admin clicks the "Send Reminder" button.
 */
export const onpaymentremindercreate = onDocumentCreated({
    document: "users/{userId}/reminders/{reminderId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const userId = event.params.userId;
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    
    if (!user || !user.email) return;

    const paymentsSnap = await db.collection('users').doc(userId).collection('payments').orderBy('date', 'desc').limit(1).get();
    let amount = "0.00";
    let period = format(new Date(), 'MMMM yyyy');

    if (!paymentsSnap.empty) {
        const p = paymentsSnap.docs[0].data();
        amount = p.amount.toFixed(2);
        period = p.description.replace('Bill for ', '').replace('Monthly Subscription for ', '').replace('Estimated bill for ', '');
    }

    let cycleStart = startOfMonth(new Date());
    let cycleEnd = endOfMonth(new Date());
    try {
        const parsedDate = parse(period, 'MMMM yyyy', new Date());
        cycleStart = startOfMonth(parsedDate);
        cycleEnd = endOfMonth(parsedDate);
    } catch(e) {
        logger.warn("Date parsing failed, using current month defaults.");
    }

    const deliveriesSnap = await db.collection('users').doc(userId).collection('deliveries')
        .where('date', '>=', cycleStart.toISOString())
        .where('date', '<=', cycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnap.docs.map(d => d.data() as Delivery);

    const sanitationSnap = await db.collection('users').doc(userId).collection('sanitationVisits')
        .where('scheduledDate', '>=', cycleStart.toISOString())
        .where('scheduledDate', '<=', cycleEnd.toISOString())
        .get();
    const sanitation = sanitationSnap.docs.map(d => d.data() as SanitationVisit);

    let complianceReports: ComplianceReport[] = [];
    if (user.assignedWaterStationId) {
        const complianceSnap = await db.collection('waterStations').doc(user.assignedWaterStationId).collection('complianceReports').get();
        complianceReports = complianceSnap.docs.map(d => d.data() as ComplianceReport);
    }

    const pdfBuffer = await generatePasswordProtectedSOA(user, period, deliveries, sanitation, complianceReports);

    const template = getPaymentReminderTemplate(user.businessName, amount, period);
    
    try {
        await sendEmail({
            to: user.email,
            cc: 'support@riverph.com',
            subject: template.subject,
            text: `Reminder: Your statement for ${period} is ₱${amount}.`,
            html: template.html,
            attachments: [{
                filename: `SOA_${user.businessName.replace(/\s/g, '_')}_${period.replace(/\s/g, '-')}.pdf`,
                content: pdfBuffer
            }]
        });
        logger.info(`Follow-up email with SOA sent to ${user.email}`);
    } catch (error) {
        logger.error(`Failed to send follow-up to ${user.email}`, error);
    }
});

/**
 * Triggered when a new unclaimed profile is created by an admin.
 */
export const onunclaimedprofilecreate = onDocumentCreated({
    document: "unclaimedProfiles/{clientId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data) return;
    const profile = event.data.data();
    
    if (!profile.businessEmail) return;

    const planName = `${profile.clientType || ''} - ${profile.plan?.name || ''}`;
    const schedule = `${profile.customPlanDetails?.deliveryDay || 'TBD'} / ${profile.customPlanDetails?.deliveryFrequency || 'TBD'}`;

    const template = getWelcomeUnclaimedTemplate(
        profile.businessName || profile.name || 'Valued Client',
        profile.clientId,
        planName,
        profile.address || 'N/A',
        schedule
    );

    try {
        await sendEmail({
            to: profile.businessEmail,
            subject: template.subject,
            text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}.`,
            html: template.html
        });
    } catch (error) {
        logger.error(`Failed welcome email`, error);
    }
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

    await createNotification(userId, { 
        type: 'delivery', 
        title: 'Delivery Scheduled', 
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, 
        data: { deliveryId } 
    });

    if (userData?.email && delivery.status === 'Delivered') {
        const template = getDeliveryStatusTemplate(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await sendEmail({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
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
        await sendEmail({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
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
            await sendEmail({ to: userData.email, subject: template.subject, text: `Payment confirmed`, html: template.html });
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
        await sendEmail({ to: userData.email, subject: template.subject, text: `Top-up approved`, html: template.html });
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
        await sendEmail({ to: userData.email, subject: template.subject, text: `Refill request received`, html: template.html });
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
        await sendEmail({ to: userData.email, subject: template.subject, text: `Visit scheduled`, html: template.html });
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
            await sendEmail({ to: userData.email, subject: template.subject, text: `Report ready`, html: template.html });
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