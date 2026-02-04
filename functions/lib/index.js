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
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_White_HQ.png?alt=media&token=a850265f-12c0-4b9b-9447-dbfd37e722ff';
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
 * Generates a high-fidelity, password-protected PDF Statement of Account.
 */
async function generatePasswordProtectedSOA(user, period, deliveries, sanitation, compliance) {
    return new Promise(async (resolve, reject) => {
        var _a, _b;
        const doc = new pdfkit_1.default({
            userPassword: user.clientId || 'password',
            ownerPassword: 'river-admin-secret',
            permissions: { printing: 'highResolution', copying: true, modifying: false },
            margin: 40
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        const pageWidth = doc.page.width;
        const margin = 40;
        // 1. High-Fidelity Header (Solid Blue Corner)
        doc.rect(0, 0, pageWidth, 120).fill(BRAND_PRIMARY);
        try {
            const response = await axios_1.default.get(LOGO_URL, { responseType: 'arraybuffer' });
            doc.image(Buffer.from(response.data), margin, 35, { width: 50 });
        }
        catch (e) {
            logger.warn("PDF Logo fetch failed, skipping image.");
        }
        const pricePerLiter = ((_a = user.plan) === null || _a === void 0 ? void 0 : _a.price) || 0;
        const pricePerContainer = pricePerLiter * LITER_RATIO;
        // White Hierarchical Text
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('River Philippines', margin + 65, 45);
        doc.fontSize(14).text('Statement of Account', margin + 65, 72);
        doc.fontSize(10).font('Helvetica').text(`Plan: ${((_b = user.plan) === null || _b === void 0 ? void 0 : _b.name) || 'N/A'}`, margin + 65, 92);
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
        doc.text(`Client ID: ${user.clientId || 'N/A'}`, pageWidth / 2 + 20, topOfDetails + 39);
        doc.text(user.email, pageWidth / 2 + 20, topOfDetails + 51);
        doc.moveDown(3);
        const metadataY = doc.y;
        doc.font('Helvetica-Bold').text('STATEMENT DATE:', margin, metadataY);
        doc.font('Helvetica').text((0, date_fns_1.format)(new Date(), 'MMM d, yyyy'), margin + 110, metadataY);
        doc.font('Helvetica-Bold').text('BILLING PERIOD:', margin, metadataY + 15);
        doc.font('Helvetica').text(period, margin + 110, metadataY + 15);
        doc.moveDown(3);
        const drawTable = (title, headers, rows) => {
            if (rows.length === 0)
                return;
            doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND_PRIMARY).text(title, margin);
            doc.moveDown(0.5);
            const tableTop = doc.y;
            const colWidth = (pageWidth - margin * 2) / headers.length;
            doc.rect(margin, tableTop, pageWidth - margin * 2, 20).fill(BRAND_PRIMARY);
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
            headers.forEach((h, i) => {
                doc.text(h, margin + (i * colWidth) + 5, tableTop + 6);
            });
            doc.moveDown(0.8);
            doc.fillColor('#000000').font('Helvetica').fontSize(8);
            rows.forEach((row, rowIndex) => {
                const rowY = doc.y;
                if (rowIndex % 2 !== 0) {
                    doc.rect(margin, rowY - 2, pageWidth - margin * 2, 15).fill('#f8fafc');
                    doc.fillColor('#000000');
                }
                row.forEach((cell, i) => {
                    doc.text(cell.toString(), margin + (i * colWidth) + 5, rowY);
                });
                doc.moveDown(1.2);
            });
            doc.moveDown(2);
        };
        // 3. Equipment Summary
        if (user.customPlanDetails) {
            const eq = user.customPlanDetails;
            const eqRows = [];
            if (eq.gallonQuantity)
                eqRows.push(['5-Gallon Reusable Containers', eq.gallonQuantity, `P${(eq.gallonPrice || 0).toLocaleString()}`, eq.gallonPaymentType || 'Monthly', `P${(eq.gallonPrice || 0).toLocaleString()}`]);
            if (eq.dispenserQuantity)
                eqRows.push(['Premium Hot & Cold Water Dispenser', eq.dispenserQuantity, `P${(eq.dispenserPrice || 0).toLocaleString()}`, eq.dispenserPaymentType || 'Monthly', `P${(eq.dispenserPrice || 0).toLocaleString()}`]);
            if (eq.sanitationPrice)
                eqRows.push(['Professional Monthly Sanitation', '1', `P${(eq.sanitationPrice || 0).toLocaleString()}`, eq.sanitationPaymentType || 'Monthly', `P${(eq.sanitationPrice || 0).toLocaleString()}`]);
            drawTable('Equipment & Services Summary', ['Service Item', 'Qty', 'Unit Price', 'Frequency', 'Subtotal'], eqRows);
        }
        // 4. Service Logs
        if (sanitation.length > 0) {
            const sanRows = sanitation.map(s => [typeof s.scheduledDate === 'string' ? s.scheduledDate.split('T')[0] : 'N/A', s.status, s.assignedTo, getSanitationPassRate(s)]);
            drawTable('Office Sanitation Logs', ['Date', 'Status', 'Officer', 'Score Rate'], sanRows);
        }
        if (compliance.length > 0) {
            const compRows = compliance.map(c => [c.name, c.date ? (0, date_fns_1.format)(c.date.toDate(), 'MMM yyyy') : 'N/A', c.status]);
            drawTable('Water Quality & Station Compliance', ['Report Name', 'Period', 'Status'], compRows);
        }
        // 5. Water Refill Logs (LAST)
        let totalQty = 0;
        let totalLiters = 0;
        let totalAmount = 0;
        const refillRows = deliveries.map(d => {
            const qty = d.volumeContainers || 0;
            const liters = d.liters || (qty * LITER_RATIO);
            const amount = d.amount || (liters * pricePerLiter);
            totalQty += qty;
            totalLiters += liters;
            totalAmount += amount;
            return [d.id, typeof d.date === 'string' ? d.date.split('T')[0] : 'N/A', qty, `P${pricePerContainer.toFixed(2)}`, `${liters.toFixed(1)}L`, `P${amount.toFixed(2)}`, d.status];
        });
        drawTable('Water Refill Logs', ['Ref ID', 'Date', 'Qty', 'Price/Unit', 'Volume', 'Amount', 'Status'], refillRows);
        // Final Totals
        const finalY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').text('TOTAL CONSUMPTION:', margin + 150, finalY);
        doc.text(totalQty.toString(), margin + 280, finalY);
        doc.text(`${totalLiters.toFixed(1)} L`, margin + 360, finalY);
        doc.text(`P ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin + 440, finalY);
        const vatAmount = totalAmount * (12 / 112);
        doc.moveDown(1.5).fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
        doc.text(`VAT (12% Included): P ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`, 0, doc.y, { align: 'right', width: pageWidth - margin });
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
    var _a;
    if (!event.data)
        return;
    const userId = event.params.userId;
    const db = (0, firestore_1.getFirestore)();
    const { period: selectedPeriod } = event.data.data();
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    if (!user || !user.email)
        return;
    let billingPeriodLabel = 'Full Account History';
    let cycleStart = new Date(0);
    let cycleEnd = (0, date_fns_1.endOfDay)(new Date());
    if (selectedPeriod && selectedPeriod !== 'full') {
        if (selectedPeriod === '2025-12_2026-01') {
            cycleStart = new Date(2025, 11, 1);
            cycleEnd = (0, date_fns_1.endOfDay)((0, date_fns_1.endOfMonth)(new Date(2026, 0, 1)));
            billingPeriodLabel = 'December 2025 - January 2026';
        }
        else {
            const parsed = (0, date_fns_1.parse)(selectedPeriod, 'yyyy-MM', new Date());
            cycleStart = (0, date_fns_1.startOfMonth)(parsed);
            cycleEnd = (0, date_fns_1.endOfDay)((0, date_fns_1.endOfMonth)(parsed));
            billingPeriodLabel = (0, date_fns_1.format)(parsed, 'MMMM yyyy');
        }
    }
    const deliveriesSnap = await db.collection('users').doc(userId).collection('deliveries')
        .where('date', '>=', cycleStart.toISOString())
        .where('date', '<=', cycleEnd.toISOString())
        .get();
    const deliveries = deliveriesSnap.docs.map(d => d.data());
    const pricePerLiter = ((_a = user.plan) === null || _a === void 0 ? void 0 : _a.price) || 0;
    const totalAmount = deliveries.reduce((sum, d) => sum + (d.amount || (d.volumeContainers * LITER_RATIO * pricePerLiter)), 0);
    const sanitationSnap = await db.collection('users').doc(userId).collection('sanitationVisits')
        .where('scheduledDate', '>=', cycleStart.toISOString())
        .where('scheduledDate', '<=', cycleEnd.toISOString())
        .get();
    const sanitation = sanitationSnap.docs.map(d => d.data());
    let complianceReports = [];
    if (user.assignedWaterStationId) {
        const complianceSnap = await db.collection('waterStations').doc(user.assignedWaterStationId).collection('complianceReports').limit(5).get();
        complianceReports = complianceSnap.docs.map(d => d.data());
    }
    const pdfBuffer = await generatePasswordProtectedSOA(user, billingPeriodLabel, deliveries, sanitation, complianceReports);
    const template = (0, email_1.getPaymentReminderTemplate)(user.businessName, totalAmount.toFixed(2), billingPeriodLabel);
    try {
        await (0, email_1.sendEmail)({
            to: user.email,
            subject: template.subject,
            text: `Reminder: Your statement for ${billingPeriodLabel} is ₱${totalAmount.toFixed(2)}.`,
            html: template.html,
            attachments: [{
                    filename: `SOA_${user.businessName.replace(/\s/g, '_')}_${billingPeriodLabel.replace(/\s/g, '-')}.pdf`,
                    content: pdfBuffer
                }]
        });
        logger.info(`Follow-up email with SOA sent to ${user.email} for period ${selectedPeriod}`);
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
        await (0, email_1.sendEmail)({ to: profile.businessEmail, subject: template.subject, text: `Welcome to River Philippines! Your Client ID is ${profile.clientId}.`, html: template.html });
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
    await createNotification(userId, { type: 'delivery', title: 'Delivery Scheduled', description: `Delivery of ${delivery.volumeContainers} containers scheduled.`, data: { deliveryId } });
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