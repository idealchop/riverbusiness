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
exports.getDeliveryStatusTemplate = getDeliveryStatusTemplate;
exports.getPaymentStatusTemplate = getPaymentStatusTemplate;
exports.getTopUpConfirmationTemplate = getTopUpConfirmationTemplate;
exports.getNewInvoiceTemplate = getNewInvoiceTemplate;
exports.getRefillRequestTemplate = getRefillRequestTemplate;
const nodemailer = __importStar(require("nodemailer"));
const logger = __importStar(require("firebase-functions/logger"));
const BRAND_COLOR = '#156391';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';
/**
 * Sends an email using the Brevo SMTP relay.
 * The transporter is initialized inside the function to ensure the BREVO_API_KEY
 * secret is correctly picked up from the environment at runtime.
 */
async function sendEmail({ to, subject, text, html }) {
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
        logger.info(`Attempting to send email to ${to} via Brevo relay...`);
        const info = await transporter.sendMail({
            from: '"River Business" <support@riverph.com>',
            to,
            subject,
            text,
            html,
        });
        logger.info(`Email sent successfully. MessageID: ${info.messageId}`);
        return info;
    }
    catch (error) {
        logger.error('Nodemailer Error: Failed to dispatch email via Brevo relay.', error);
        throw error;
    }
}
/**
 * Common wrapper for all River Business emails to ensure consistent branding.
 */
function getEmailWrapper(content, buttonLabel, buttonUrl) {
    const ctaButton = (buttonLabel && buttonUrl) ? `
    <div style="margin-top: 30px; text-align: center;">
      <a href="${buttonUrl}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
        ${buttonLabel}
      </a>
    </div>
  ` : '';
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f9; padding: 40px 0; margin: 0; width: 100%;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
        <tr>
          <td style="padding: 30px; background-color: ${BRAND_COLOR}; text-align: center;">
            <img src="${LOGO_URL}" alt="River Business" width="70" height="70" style="margin-bottom: 10px; border-radius: 14px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 1px; font-weight: 700;">River Business</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            ${content}
            ${ctaButton}
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #eef2f6; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
              <strong>River Tech Inc.</strong><br>
              Turn Everyday Needs Into Automatic Experience
            </p>
            <p style="margin: 15px 0 0 0; font-size: 11px; color: #94a3b8; font-style: italic;">
              This is an automated message from River Business. Please do not reply directly to this email.<br>
              For support, reach us at <a href="mailto:customer@riverph.com" style="color: ${BRAND_COLOR}; text-decoration: none;">customer@riverph.com</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}
function getDeliveryStatusTemplate(businessName, status, trackingId, volume) {
    const content = `
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Stay Hydrated, ${businessName}! 💧</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Great news! Your fresh water supply has been successfully <strong>Delivered</strong>. Our team has just finished stocking your station.
    </p>
    <div style="background-color: #f1f5f9; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Delivery Summary</p>
      <p style="margin: 10px 0 5px 0; font-size: 24px; font-weight: 800; color: #1e293b;">${volume} Containers</p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">Tracking ID: ${trackingId}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      You can now view the high-resolution proof of delivery and track your real-time consumption directly in your portal.
    </p>
  `;
    return {
        subject: `Success: Water Delivered to ${businessName} 🚚`,
        html: getEmailWrapper(content, 'Go to Dashboard', 'https://app.riverph.com/dashboard'),
    };
}
function getPaymentStatusTemplate(businessName, invoiceId, amount, status) {
    const isPaid = status === 'Paid';
    const emoji = isPaid ? '✅' : '⏳';
    const title = isPaid ? 'Payment Confirmed' : 'Review in Progress';
    const subMessage = isPaid
        ? "Thank you for your prompt payment! We've successfully updated your records, and your account remains in excellent standing."
        : "We've received your proof of payment. Our finance team is currently reviewing the details to finalize your record.";
    const content = `
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Hi ${businessName}, ${emoji}</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">${subMessage}</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 25px; border-radius: 12px; margin: 25px 0;">
      <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">Invoice ID: ${invoiceId}</p>
      <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: 800; color: #166534;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      You can download a PDF copy of your receipt and view your full billing history anytime.
    </p>
  `;
    return {
        subject: `${title}: ${invoiceId} ${emoji}`,
        html: getEmailWrapper(content, 'View Invoices', 'https://app.riverph.com/dashboard'),
    };
}
function getTopUpConfirmationTemplate(businessName, amount) {
    const content = `
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Balance Boosted! 💰</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello ${businessName}, your top-up request has been approved. You're all set for your upcoming deliveries!</p>
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 25px; border-radius: 12px; margin: 25px 0;">
      <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: 600;">Amount Credited</p>
      <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: 800; color: #1e40af;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      Your new credits are now available in your central wallet. We'll automatically deduct from this balance for every container delivered.
    </p>
  `;
    return {
        subject: `Credits Added Successfully to your Wallet 💳`,
        html: getEmailWrapper(content, 'Check Balance', 'https://app.riverph.com/dashboard'),
    };
}
function getNewInvoiceTemplate(businessName, invoiceId, amount, period) {
    const content = `
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Statement Ready 📄</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Hi ${businessName}, your automated monthly invoice for <strong>${period}</strong> has been generated and is now ready for your review.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin: 25px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">Total Amount Due</p>
      <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: 800; color: #1e293b;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Invoice ID: ${invoiceId}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      Log in to your dashboard to see the full breakdown of consumption and equipment fees, and to settle your balance via our secure payment channels.
    </p>
  `;
    return {
        subject: `New Invoice Available for ${period} 📑`,
        html: getEmailWrapper(content, 'Pay Now', 'https://app.riverph.com/dashboard'),
    };
}
function getRefillRequestTemplate(businessName, status, requestId, date) {
    const isReceived = status === 'Requested';
    const emoji = isReceived ? '🌊' : '🚀';
    const title = isReceived ? 'Refill Request Received' : `Refill Status: ${status}`;
    const message = isReceived
        ? "We've received your request for an extra water refill. Our fulfillment team has been alerted and is already preparing your containers."
        : `Your on-demand refill request is now moving through our system and is currently <strong>${status}</strong>.`;
    const content = `
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">${title} ${emoji}</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi ${businessName}, ${message}</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin: 25px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">Request ID: ${requestId}</p>
      ${date ? `<p style="margin: 10px 0 0 0; font-size: 15px; color: #1e293b;">Requested Date: <strong>${date}</strong></p>` : '<p style="margin: 10px 0 0 0; font-size: 15px; color: #156391; font-weight: 700;">Priority: ASAP Refill</p>'}
    </div>
    <p style="color: #475569; font-size: 14px;">
      You can track the real-time progress of our delivery truck through the live tracker in your dashboard.
    </p>
  `;
    return {
        subject: `Update: Refill Request ${requestId} ${emoji}`,
        html: getEmailWrapper(content, 'Track Delivery', 'https://app.riverph.com/dashboard'),
    };
}
//# sourceMappingURL=email.js.map