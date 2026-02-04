"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onfileupload = exports.onsanitationupdate = exports.onsanitationcreate = exports.onrefillrequestcreate = exports.ontopuprequestupdate = exports.onpaymentupdate = exports.ondeliveryupdate = exports.ondeliverycreate = exports.onunclaimedprofilecreate = exports.onpaymentremindercreate = void 0;
exports.generatePasswordProtectedSOA = generatePasswordProtectedSOA;
const app_1 = require("firebase-admin/app");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const axios_1 = __importDefault(require("axios"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const date_fns_1 = require("date-fns");
// Initialize Firebase Admin SDK first
(0, app_1.initializeApp)();
const storage_2 = require("firebase-functions/v2/storage");
const firestore_2 = require("firebase-functions/v2/firestore");
const email_1 = require("./email");
// Export all billing functions
__exportStar(require("./billing"), exports);
const BRAND_PRIMARY = '#538ec2';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';
const LITER_RATIO = 19.5;
/**
 * Creates a notification document in a user's notification subcollection.
 */
async function createNotification(userId, notificationData) {
    if (!userId)
        return;
    const db = (0, firestore_1.getFirestore)();
    const notification = Object.assign(Object.assign({}, notificationData), { userId, date: firestore_1.FieldValue.serverTimestamp(), isRead: false });
    try {
        await db.collection('users').doc(userId).collection('notifications').add(notification);
        logger.info(`Notification created for user ${userId}: ${notificationData.title}`);
    }
    catch (error) {
        logger.error(`Failed to create notification for user ${userId}`, error);
    }
}
const getSanitationPassRate = (v) => {
    if (!v.dispenserReports || v.dispenserReports.length === 0)
        return 'N/A';
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
async function generatePasswordProtectedSOA(user, period, deliveries, sanitation, compliance) {
    return new Promise(async (resolve, reject) => {
        var _a, _b;
        const doc = new pdfkit_1.default({
            userPassword: user.clientId || 'password',
            ownerPassword: 'river-admin-secret',
            permissions: { printing: 'highResolution', copying: true, modifying: false }
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        try {
            const response = await axios_1.default.get(LOGO_URL, { responseType: 'arraybuffer' });
            doc.image(Buffer.from(response.data), 40, 40, { width: 55 });
        }
        catch (e) {
            logger.warn("PDF Logo fetch failed, skipping image.");
        }
        const pricePerLiter = ((_a = user.plan) === null || _a === void 0 ? void 0 : _a.price) || 0;
        const pricePerContainer = pricePerLiter * LITER_RATIO;
        // Structured Header (Left Aligned)
        doc.fillColor(BRAND_PRIMARY).fontSize(20).font('Helvetica-Bold').text('River Philippines', 110, 45);
        doc.fontSize(14).text('Statement of Account', 110, 68);
        doc.fillColor('#666').fontSize(10).font('Helvetica').text(`Plan: ${((_b = user.plan) === null || _b === void 0 ? void 0 : _b.name) || 'N/A'}`, 110, 85);
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
                const periodStr = c.date ? (0, date_fns_1.format)(c.date.toDate(), 'MMM yyyy') : 'N/A';
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
        doc.text(`P ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 410, summaryY);
        doc.moveDown(1.5);
        const vatAmount = totalAmount * (12 / 112);
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666');
        doc.text(`VAT (12% Included): P ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 40, doc.y, { align: 'right', width: 510 });
        doc.end();
    });
}
// --- TRIGGERS ---
/**
 * Triggered when an admin clicks the "Send Reminder" button.
 */
exports.onpaymentremindercreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/reminders/{reminderId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    if (!user || !user.email)
        return;
    const paymentsSnap = await db.collection('users').doc(userId).collection('payments').orderBy('date', 'desc').limit(1).get();
    let amount = "0.00";
    let period = (0, date_fns_1.format)(new Date(), 'MMMM yyyy');
    if (!paymentsSnap.empty) {
        const p = paymentsSnap.docs[0].data();
        amount = p.amount.toFixed(2);
        period = p.description.replace('Bill for ', '').replace('Monthly Subscription for ', '').replace('Estimated bill for ', '');
    }
    let cycleStart = (0, date_fns_1.startOfMonth)(new Date());
    let cycleEnd = (0, date_fns_1.endOfMonth)(new Date());
    try {
        const parsedDate = (0, date_fns_1.parse)(period, 'MMMM yyyy', new Date());
        cycleStart = (0, date_fns_1.startOfMonth)(parsedDate);
        cycleEnd = (0, date_fns_1.endOfMonth)(parsedDate);
    }
    catch (e) {
        logger.warn("Date parsing failed, using current month defaults.");
    }
    const deliveriesSnap = await db.collection('users').doc(userId).collection('deliveries')
        .where('date', '>=', cycleStart.toISOString())
        .where('date', '<=', cycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnap.docs.map(d => d.data());
    const sanitationSnap = await db.collection('users').doc(userId).collection('sanitationVisits')
        .where('scheduledDate', '>=', cycleStart.toISOString())
        .where('scheduledDate', '<=', cycleEnd.toISOString())
        .get();
    const sanitation = sanitationSnap.docs.map(d => d.data());
    let complianceReports = [];
    if (user.assignedWaterStationId) {
        const complianceSnap = await db.collection('waterStations').doc(user.assignedWaterStationId).collection('complianceReports').get();
        complianceReports = complianceSnap.docs.map(d => d.data());
    }
    const pdfBuffer = await generatePasswordProtectedSOA(user, period, deliveries, sanitation, complianceReports);
    const template = (0, email_1.getPaymentReminderTemplate)(user.businessName, amount, period);
    try {
        await (0, email_1.sendEmail)({
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
    }
    catch (error) {
        logger.error(`Failed to send follow-up to ${user.email}`, error);
    }
});
/**
 * Triggered when a new unclaimed profile is created by an admin.
 */
exports.onunclaimedprofilecreate = (0, firestore_2.onDocumentCreated)({
    document: "unclaimedProfiles/{clientId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    var _a, _b, _c;
    if (!event.data)
        return;
    const profile = event.data.data();
    if (!profile.businessEmail)
        return;
    const planName = `${profile.clientType || ''} - ${((_a = profile.plan) === null || _a === void 0 ? void 0 : _a.name) || ''}`;
    const schedule = `${((_b = profile.customPlanDetails) === null || _b === void 0 ? void 0 : _b.deliveryDay) || 'TBD'} / ${((_c = profile.customPlanDetails) === null || _c === void 0 ? void 0 : _c.deliveryFrequency) || 'TBD'}`;
    const template = (0, email_1.getWelcomeUnclaimedTemplate)(profile.businessName || profile.name || 'Valued Client', profile.clientId, planName, profile.address || 'N/A', schedule);
    try {
        await (0, email_1.sendEmail)({
            to: profile.businessEmail,
            subject: template.subject,
            text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}.`,
            html: template.html
        });
    }
    catch (error) {
        logger.error(`Failed welcome email`, error);
    }
});
exports.ondeliverycreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    const delivery = event.data.data();
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, {
        type: 'delivery',
        title: 'Delivery Scheduled',
        description: `Delivery of ${delivery.volumeContainers} containers scheduled.`,
        data: { deliveryId }
    });
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && delivery.status === 'Delivered') {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Delivered', deliveryId, delivery.volumeContainers);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
    }
});
exports.ondeliveryupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/deliveries/{deliveryId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const deliveryId = event.params.deliveryId;
    if (before.status === after.status)
        return;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    await createNotification(userId, { type: 'delivery', title: `Delivery ${after.status}`, description: `Your delivery is now ${after.status}.`, data: { deliveryId } });
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && after.status === 'Delivered') {
        const template = (0, email_1.getDeliveryStatusTemplate)(userData.businessName, 'Delivered', deliveryId, after.volumeContainers);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Delivery complete`, html: template.html });
    }
});
exports.onpaymentupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/payments/{paymentId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status === after.status)
        return;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (before.status === 'Pending Review' && after.status === 'Paid') {
        await createNotification(userId, { type: 'payment', title: 'Payment Confirmed', description: `Payment for invoice ${after.id} confirmed.`, data: { paymentId: after.id } });
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            const template = (0, email_1.getPaymentStatusTemplate)(userData.businessName, after.id, after.amount, 'Paid');
            await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Payment confirmed`, html: template.html });
        }
    }
});
exports.ontopuprequestupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/topUpRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status === after.status || after.status !== 'Approved')
        return;
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getTopUpConfirmationTemplate)(userData.businessName, after.amount);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Top-up approved`, html: template.html });
    }
});
exports.onrefillrequestcreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/refillRequests/{requestId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const requestId = event.params.requestId;
    const request = event.data.data();
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData === null || userData === void 0 ? void 0 : userData.email) {
        const template = (0, email_1.getRefillRequestTemplate)(userData.businessName, 'Requested', requestId, request.requestedDate);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Refill request received`, html: template.html });
    }
});
exports.onsanitationcreate = (0, firestore_2.onDocumentCreated)({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const userId = event.params.userId;
    const visit = event.data.data();
    const db = (0, firestore_1.getFirestore)();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if ((userData === null || userData === void 0 ? void 0 : userData.email) && visit.status === 'Scheduled') {
        const dateStr = new Date(visit.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const template = (0, email_1.getSanitationScheduledTemplate)(userData.businessName, visit.assignedTo, dateStr);
        await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Visit scheduled`, html: template.html });
    }
});
exports.onsanitationupdate = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}/sanitationVisits/{visitId}",
    secrets: ["BREVO_API_KEY"]
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    if (before.status !== 'Completed' && after.status === 'Completed') {
        const db = (0, firestore_1.getFirestore)();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            const dateStr = new Date(after.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const template = (0, email_1.getSanitationReportTemplate)(userData.businessName, after.assignedTo, dateStr);
            await (0, email_1.sendEmail)({ to: userData.email, subject: template.subject, text: `Report ready`, html: template.html });
        }
    }
});
exports.onfileupload = (0, storage_2.onObjectFinalized)({ memory: "256MiB" }, async (event) => {
    var _a;
    const filePath = event.data.name;
    if (!filePath || ((_a = event.data.contentType) === null || _a === void 0 ? void 0 : _a.startsWith('application/x-directory')))
        return;
    const storage = (0, storage_1.getStorage)();
    const db = (0, firestore_1.getFirestore)();
    const bucket = storage.bucket(event.data.bucket);
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });
    if (filePath.startsWith("users/") && filePath.includes("/profile/")) {
        const userId = filePath.split("/")[1];
        await db.collection("users").doc(userId).update({ photoURL: url });
    }
    else if (filePath.startsWith("users/") && filePath.includes("/payments/")) {
        const customMetadata = event.data.metadata;
        if ((customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.paymentId) && (customMetadata === null || customMetadata === void 0 ? void 0 : customMetadata.userId)) {
            await db.collection("users").doc(customMetadata.userId).collection("payments").doc(customMetadata.paymentId).update({ proofOfPaymentUrl: url, status: "Pending Review" });
        }
    }
});
//# sourceMappingURL=index.js.map