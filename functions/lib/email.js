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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.getWelcomeUnclaimedTemplate = getWelcomeUnclaimedTemplate;
exports.getDeliveryStatusTemplate = getDeliveryStatusTemplate;
exports.getPaymentStatusTemplate = getPaymentStatusTemplate;
exports.getTopUpConfirmationTemplate = getTopUpConfirmationTemplate;
exports.getNewInvoiceTemplate = getNewInvoiceTemplate;
exports.getRefillRequestTemplate = getRefillRequestTemplate;
exports.getEmployeeInvitationTemplate = getEmployeeInvitationTemplate;
exports.getSanitationScheduledTemplate = getSanitationScheduledTemplate;
exports.getSanitationReportTemplate = getSanitationReportTemplate;
exports.getPaymentReminderTemplate = getPaymentReminderTemplate;
const nodemailer = __importStar(require("nodemailer"));
const logger = __importStar(require("firebase-functions/logger"));
const BRAND_PRIMARY = '#538ec2';
const BRAND_ACCENT = '#7ea9d2';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-white-v2.png?alt=media&token=6c25e9e2-9375-4f03-a0ab-e32cd98b8b49';
const GCASH_QR = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2FRiver_gcash.png?alt=media&token=13c80b31-8f08-4857-a066-5a666d546d81';
const BPI_QR = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2Friver_BPI.png?alt=media&token=6ac4fd16-2014-40fe-b7cf-1fdf3e94a61e';
const MAYA_QR = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2Friver_maya.png?alt=media&token=a3ca4e56-c797-4d9a-8dcd-4b78a0a96965';
const PAYMENT_OPTIONS_BLOCK = `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-top: 32px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 16px 0; font-size: 13px; color: ${BRAND_PRIMARY}; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">Settlement Instructions</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        To ensure uninterrupted service within the ecosystem, please use any of our accredited channels:
      </p>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="32%" align="center" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #f1f5f9;">
            <img src="${GCASH_QR}" width="80" style="display: block; margin-bottom: 8px; border-radius: 4px;">
            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #0f172a;">GCash</p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b; line-height: 1.3;">Jamie Camille L.<br>09557750188</p>
          </td>
          <td width="2%">&nbsp;</td>
          <td width="32%" align="center" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #f1f5f9;">
            <img src="${BPI_QR}" width="80" style="display: block; margin-bottom: 8px; border-radius: 4px;">
            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #0f172a;">BPI Bank</p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b; line-height: 1.3;">Jimboy R.<br>3489145013</p>
          </td>
          <td width="2%">&nbsp;</td>
          <td width="32%" align="center" valign="top" style="background-color: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #f1f5f9;">
            <img src="${MAYA_QR}" width="80" style="display: block; margin-bottom: 8px; border-radius: 4px;">
            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #0f172a;">Maya</p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b; line-height: 1.3;">Jimboy R.<br>09557750188</p>
          </td>
        </tr>
      </table>
    </div>
`;
/**
 * Sends an email using the Brevo SMTP relay.
 */
async function sendEmail({ to, cc, bcc, subject, text, html, attachments }) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        logger.error('CRITICAL: BREVO_API_KEY is not set or not mounted. Email sending aborted.');
        throw new Error('Missing SMTP credentials.');
    }
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            auth: {
                user: '998b0f001@smtp-brevo.com',
                pass: apiKey,
            },
        });
        const info = await transporter.sendMail({
            from: '"River Philippines" <customers@riverph.com>',
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments,
        });
        logger.info(`Email sent successfully. MessageID: ${info.messageId}`);
        return info;
    }
    catch (error) {
        logger.error('Nodemailer Error: Failed to dispatch email.', error);
        throw error;
    }
}
/**
 * Generates the common HTML wrapper for all River Philippines emails.
 */
function getEmailWrapper(content, headerTitle, subheader = '', buttonText = 'Launch Dashboard', buttonUrl = 'https://app.riverph.com') {
    const timestamp = Date.now();
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Manrope', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; }
        .header { background: linear-gradient(90deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%); padding: 48px 24px; text-align: center; }
        .logo { width: 100px; height: auto; display: inline-block; }
        .content { padding: 40px; }
        .main-title { color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 24px; text-align: center; }
        .body-text { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .btn-container { text-align: center; margin-top: 32px; }
        .btn { background-color: ${BRAND_PRIMARY}; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; }
        .footer { text-align: center; margin-top: 40px; padding: 0 40px 40px 40px; }
        .footer-sub { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; font-weight: 600; }
        .legal-disclaimer { max-width: 600px; margin: 0 auto 40px auto; padding: 0 24px; color: #cbd5e1; font-size: 10px; line-height: 1.4; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${LOGO_URL}" alt="River Logo" class="logo">
        </div>
        <div class="content">
          <h2 class="main-title">${headerTitle}</h2>
          ${subheader}
          ${content}
          <div class="btn-container">
            <a href="${buttonUrl}" class="btn">${buttonText}</a>
          </div>
        </div>
      </div>
      <div class="footer">
        <p class="footer-sub">
          The platform to run essential needs for business workforce.
        </p>
      </div>
      <div class="legal-disclaimer">
        DISCLAIMER: This is a secure communication intended for the exclusive use of the addressee.
      </div>
      <div style="display:none; white-space:nowrap; font:15px courier; line-height:0; color: #ffffff;"> - Notification ID: ${timestamp} - </div>
    </body>
    </html>
  `;
}
function getWelcomeUnclaimedTemplate(businessName, clientId, planName, address, schedule) {
    const content = `
    <p class="body-text">Hello <strong>${businessName}</strong>,</p>
    <p class="body-text">
      Welcome to your new business operating system. By joining River, you're unifying your operations, people, and data into one intelligent ecosystem. Your account is ready for activation.
    </p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 8px; font-size: 14px;"><span style="color: #64748b; font-weight: bold;">Client ID:</span> <span style="font-family: monospace; font-weight: 800; color: ${BRAND_PRIMARY};">${clientId}</span></div>
        <div style="margin-bottom: 8px; font-size: 14px;"><span style="color: #64748b; font-weight: bold;">Initial Plan:</span> ${planName}</div>
        <div style="font-size: 14px;"><span style="color: #64748b; font-weight: bold;">Service Point:</span> ${address}</div>
    </div>
  `;
    return {
        subject: `Welcome to the River Ecosystem: Your Workspace is Ready 🌊`,
        html: getEmailWrapper(content, 'A New Standard for Business Operations', '', 'Activate My Workspace', 'https://app.riverph.com')
    };
}
function getDeliveryStatusTemplate(businessName, status, trackingId, volume) {
    const content = `
    <p class="body-text">Hi ${businessName}, your supply fulfillment has been verified. Maintaining high-fidelity operations is our top priority, ensuring your team has the resources they need to succeed.</p>
    <p class="body-text">Attached to this email is your official <strong>Delivery Receipt</strong> for your records.</p>
    <div style="text-align: center; margin: 32px 0;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 12px 24px; border-radius: 50px; font-weight: 800; display: inline-block; font-size: 14px; text-transform: uppercase;">
        ${status}
      </div>
    </div>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Volume Logged</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">${volume} Containers</p>
    </div>
  `;
    return {
        subject: `Supply Fulfillment Complete for ${businessName} 🚚`,
        html: getEmailWrapper(content, 'Logistics Update', `<p style="text-align: center; color: #64748b; font-size: 14px;">Log ID: ${trackingId}</p>`)
    };
}
function getPaymentStatusTemplate(businessName, invoiceId, amount, status) {
    const isPaid = status === 'Paid';
    const content = `
    <p class="body-text">Hi ${businessName}, ${isPaid ? "your financial status is confirmed. Your account remains in excellent standing within the River ecosystem." : "we've received your settlement proof and our audit team is currently verifying the transaction."}</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 24px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Amount Processed</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;
    return {
        subject: isPaid ? `Financial Verification Complete ✅` : `Settlement Logged ⏳`,
        html: getEmailWrapper(content, isPaid ? 'Transaction Verified' : 'Processing Settlement', `<p style="text-align: center; color: #64748b; font-size: 14px;">Invoice ID: ${invoiceId}</p>`)
    };
}
function getTopUpConfirmationTemplate(businessName, amount) {
    const content = `
    <p class="body-text">Hi ${businessName}, your central operational wallet has been successfully credited. Your workforce is now fully provisioned for upcoming automated supply cycles.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Wallet Credit</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">+ ₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;
    return {
        subject: `Operational Wallet Credited! 💰`,
        html: getEmailWrapper(content, 'Liquidity Updated')
    };
}
function getNewInvoiceTemplate(businessName, invoiceId, amount, period) {
    const content = `
    <p class="body-text">Hi ${businessName}, transparency is core to the River ecosystem. Your automated monthly statement for <strong>${period}</strong> is now ready for review.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Total Balance Due</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    ${PAYMENT_OPTIONS_BLOCK}
  `;
    return {
        subject: `New Statement for ${period} 🌊`,
        html: getEmailWrapper(content, 'Statement Ready', `<p style="text-align: center; color: #64748b; font-size: 14px;">Reference: ${invoiceId}</p>`, 'Settle via Workspace')
    };
}
function getRefillRequestTemplate(businessName, status, requestId, date) {
    const content = `
    <p class="body-text">Hello ${businessName}, we've received your request for supplemental resources. Our fulfillment layer is now prepping your dispatch to ensure zero operational downtime.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Status</p>
      <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 800; color: ${BRAND_PRIMARY};">${status}</p>
    </div>
  `;
    return {
        subject: `Supplemental Resource Request Received 🌊`,
        html: getEmailWrapper(content, 'Logistics Authorized', `<p style="text-align: center; color: #64748b; font-size: 14px;">Request: ${requestId}</p>`, 'Track Logistics')
    };
}
function getEmployeeInvitationTemplate(employeeName, businessName, signupUrl) {
    const content = `
    <p class="body-text">Hello ${employeeName},</p>
    <p class="body-text">You've been invited to join the <strong>${businessName}</strong> team on River Business. As part of this workspace, you'll have unified access to all operational tools.</p>
  `;
    return {
        subject: `Invitation: Join ${businessName} on River 🌊`,
        html: getEmailWrapper(content, 'Welcome to the Team', '', 'Activate Account', signupUrl)
    };
}
function getSanitationScheduledTemplate(businessName, assignedTo, date) {
    const content = `
    <p class="body-text">Hi ${businessName}, we've scheduled a professional quality check for your office infrastructure to ensure 100% compliance with ecosystem health standards.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
        <div style="margin-bottom: 8px;"><span style="color: #64748b; font-weight: bold; font-size: 12px; text-transform: uppercase;">Target Date:</span><br><span style="font-weight: 700; font-size: 16px;">${date}</span></div>
        <div><span style="color: #64748b; font-weight: bold; font-size: 12px; text-transform: uppercase;">Assigned Officer:</span><br><span style="font-weight: 700; font-size: 16px;">${assignedTo}</span></div>
    </div>
  `;
    return {
        subject: `Quality Audit Scheduled for ${businessName} 🛡️`,
        html: getEmailWrapper(content, 'Standard Maintenance')
    };
}
function getSanitationReportTemplate(businessName, assignedTo, date, score) {
    const content = `
    <p class="body-text">Hi ${businessName}, your latest equipment quality analysis is now available. Our officer has finalized the audit for your business units.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Intelligence Score</p>
      <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: 800; color: #10b981;">${score}</p>
    </div>
  `;
    return {
        subject: `Quality Analysis Verified 💧`,
        html: getEmailWrapper(content, 'Assessment Finalized', '', 'View Intelligence Report')
    };
}
function getPaymentReminderTemplate(businessName, amount, period) {
    const content = `
    <p class="body-text">Hi ${businessName}, this is a follow-up regarding your statement for <strong>${period}</strong>. Maintaining a balanced ledger ensures zero delays in your supply fulfillment.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Amount Due</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount}</p>
    </div>
    ${PAYMENT_OPTIONS_BLOCK}
  `;
    return {
        subject: `Action Required: Statement for ${period} 🌊`,
        html: getEmailWrapper(content, 'Financial Follow-up', '', 'Settle via Workspace')
    };
}
//# sourceMappingURL=email.js.map