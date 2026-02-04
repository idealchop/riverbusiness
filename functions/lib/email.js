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
exports.getInternalRefillAlertTemplate = getInternalRefillAlertTemplate;
exports.getSanitationReportTemplate = getSanitationReportTemplate;
exports.getSanitationScheduledTemplate = getSanitationScheduledTemplate;
exports.getComplianceAlertTemplate = getComplianceAlertTemplate;
const nodemailer = __importStar(require("nodemailer"));
const logger = __importStar(require("firebase-functions/logger"));
const date_fns_1 = require("date-fns");
const BRAND_PRIMARY = '#538ec2';
const BRAND_ACCENT = '#7ea9d2';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_White_HQ.png?alt=media&token=a850265f-12c0-4b9b-9447-dbfd37e722ff';
/**
 * Sends an email using the Brevo SMTP relay.
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
        logger.info(`Attempting to send email to ${to} via River Philippines relay...`);
        const info = await transporter.sendMail({
            from: '"River Philippines" <customers@riverph.com>',
            to,
            subject,
            text,
            html,
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
function getEmailWrapper(content, headerTitle, subheader = '') {
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
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(90deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%); padding: 40px 24px; text-align: center; }
        .logo { width: 60px; height: auto; margin-bottom: 12px; }
        .header-title { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header-subtext { color: #ffffff; margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; font-weight: 400; }
        .content { padding: 40px; }
        .main-title { color: #0f172a; font-size: 22px; font-weight: 800; margin-bottom: 8px; text-align: center; margin-top: 0; }
        .tracking-id { color: #64748b; font-size: 14px; text-align: center; margin-bottom: 32px; }
        .tracking-id span { color: ${BRAND_PRIMARY}; font-weight: 600; }
        .greeting { color: #0f172a; font-size: 18px; font-weight: 700; line-height: 1.6; margin-bottom: 16px; }
        .body-text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .status-badge { text-align: center; margin: 24px 0; }
        .badge { padding: 12px 28px; border-radius: 50px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1.2px; display: inline-block; }
        .details-box { background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0; }
        .details-title { margin: 0 0 16px 0; font-size: 13px; color: ${BRAND_PRIMARY}; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .detail-item { display: flex; align-items: center; margin-bottom: 15px; }
        .detail-icon { background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-right: 15px; font-size: 20px; }
        .detail-label { margin: 0; font-size: 12px; color: #64748b; }
        .detail-value { margin: 2px 0 0 0; font-size: 18px; font-weight: 700; color: #0f172a; }
        .next-step { padding-top: 16px; border-top: 1px dashed #cbd5e1; margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }
        .btn-container { text-align: center; margin-top: 30px; }
        .btn { background-color: ${BRAND_PRIMARY}; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(83, 142, 194, 0.3); }
        .footer { text-align: center; margin-top: 40px; padding-top: 40px; border-top: 1px solid #f1f5f9; }
        .footer-company { font-size: 16px; font-weight: 700; color: ${BRAND_PRIMARY}; margin-bottom: 4px; }
        .footer-sub { font-size: 14px; color: #94a3b8; margin: 0; line-height: 1.6; }
        .footer-sub a { color: ${BRAND_PRIMARY}; text-decoration: none; font-weight: 700; }
        .automated-note { font-size: 11px; color: #cbd5e1; margin-top: 24px; font-style: italic; }
        .legal-disclaimer { max-width: 600px; margin: 24px auto; padding: 0 24px; color: #94a3b8; font-size: 10px; line-height: 1.5; text-align: justify; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${LOGO_URL}" alt="River Logo" class="logo">
          <h1 class="header-title">River Philippines</h1>
          <p class="header-subtext">Your Operating System for Business Essentials.</p>
        </div>
        <div class="content">
          <h2 class="main-title">${headerTitle}</h2>
          ${subheader}
          ${content}
          <div class="btn-container">
            <a href="https://app.riverph.com" class="btn">Login to Dashboard</a>
          </div>
          <div class="footer">
            <p class="footer-company">River PH - Automated, Connected, Convenient.</p>
            <p class="footer-sub">
              See how we’re shaping the future of the Philippines<br>
              <a href="https://riverph.com">riverph.com</a>
            </p>
            <p class="automated-note">This is an automated notification from your River Business account. For security, please do not reply to this email.</p>
          </div>
        </div>
      </div>
      <div class="legal-disclaimer">
        DISCLAIMER: This communication and any attachments are intended to be confidential, protected under the Data Privacy Act of 2012 (RA 10173), Intellectual Property laws, and other applicable Philippine statutes. It is intended for the exclusive use of the addressee. If you are not the intended recipient, you are hereby notified that any disclosure, retention, dissemination, copying, alteration, or distribution of this communication and/or any attachment, or any information therein, is strictly prohibited. If you have received this communication in error, kindly notify the sender by return e-mail and delete this communication and all attachments immediately.
      </div>
      <div style="display:none; white-space:nowrap; font:15px courier; line-height:0; color: #ffffff;"> - Notification ID: ${timestamp} - </div>
    </body>
    </html>
  `;
}
function getWelcomeUnclaimedTemplate(businessName, clientId, planName, address, schedule) {
    const guideUrl = "https://prism-roadrunner-575.notion.site/Welcome-to-River-Philippines-2dfccd0e1c6280648d41d1eb44033f50?source=copy_link";
    const brandColor = BRAND_PRIMARY;
    const timestamp = Date.now();
    return {
        subject: `Welcome to River Philippines: Your Smart Refill is Ready! 🌊`,
        html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Manrope', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f9; }
              .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
              .header { background-color: ${brandColor}; color: #ffffff; padding: 40px 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; }
              .content { padding: 40px; background-color: #ffffff; }
              .highlight { color: ${brandColor}; font-weight: bold; }
              .summary-box { background-color: #f8f9fa; border-left: 4px solid ${brandColor}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
              .summary-item { margin-bottom: 10px; font-size: 14px; }
              .summary-label { font-weight: bold; color: #555; width: 120px; display: inline-block; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { background-color: ${brandColor}; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 10px 15px -3px rgba(83, 142, 194, 0.3); }
              .commitment { font-size: 13px; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
              .footer { background-color: #f1f1f1; padding: 30px; font-size: 11px; color: #777; line-height: 1.4; text-align: center; }
              .footer-brand { font-size: 16px; font-weight: 700; color: ${brandColor}; margin-bottom: 4px; }
              .footer-sub { font-size: 14px; color: #94a3b8; margin: 0; line-height: 1.6; }
              .footer-sub a { color: ${brandColor}; text-decoration: none; font-weight: 700; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>RIVER PHILIPPINES</h1>
                  <p style="margin-top: 5px; font-size: 14px; opacity: 0.9;">Your Operating System for Business Essentials</p>
              </div>

              <div class="content">
                  <p>Hello <strong>${businessName}</strong>,</p>
                  <p>Welcome to <strong>River Philippines</strong>!</p>
                  <p>We are honored to be your partner in hydration. By joining our community, you have chosen a service that prioritizes <span class="highlight">Premium Water Quality</span>. Your <span class="highlight">Smart Refill</span> system is now active, ensuring that your workplace is always supplied with the cleanest water without you ever having to lift a finger.</p>

                  <div class="summary-box">
                      <div class="summary-item"><span class="summary-label">Client ID:</span> <span style="font-family: monospace; font-weight: bold;">${clientId}</span></div>
                      <div class="summary-item"><span class="summary-label">Plan:</span> ${planName}</div>
                      <div class="summary-item"><span class="summary-label">Service Address:</span> ${address}</div>
                      <div class="summary-item"><span class="summary-label">Smart Refill:</span> ${schedule}</div>
                  </div>

                  <h3>How to Access Your Account:</h3>
                  <p>Go to <a href="https://app.riverph.com" class="highlight">app.riverph.com</a>, <strong>create your account</strong>, and link your <strong>Client ID</strong> to activate your dashboard. [<a href="${guideUrl}" style="color: ${brandColor}; text-decoration: underline;">See Guide</a>]</p>

                  <div class="button-container">
                      <a href="https://app.riverph.com" class="button">Activate My Dashboard</a>
                  </div>

                  <div class="commitment">
                      <p><strong>The River Philippines Quality Commitment:</strong> We guarantee premium hydration through DOH-certified water, automated <strong>Smart Refills</strong> that ensure you never run dry, and <strong>Monthly Professional Sanitation</strong> of your equipment. Manage everything effortlessly with real-time tracking and automated <strong>Digital Records (SOA/Invoices)</strong> for seamless liquidation.</p>
                      <p>Welcome to the future of clean, automated hydration!</p>
                  </div>
              </div>

              <div class="footer">
                  <div class="footer-brand">River PH - Automated, Connected, Convenient.</div>
                  <div class="footer-sub">
                    See how we’re shaping the future of the Philippines<br>
                    <a href="https://riverph.com">riverph.com</a>
                  </div>

                  <div style="margin: 15px 0; border-top: 1px solid #ddd; padding-top: 10px; text-align: justify; font-size: 10px;">
                      <strong>DISCLAIMER:</strong> This communication and any attachments are intended to be confidential, protected under the Bank Secrecy, Data Privacy (RA 10173), or Intellectual Property laws, and for the exclusive use of the addressee. If you are not the intended recipient, you are notified that disclosure, retention, dissemination, copying, alteration or distribution of this communication and/or any attachment, or any part thereof or information therein, is strictly prohibited. If you receive this communication in error, kindly notify the sender by e-mail, and delete this communication and all attachments immediately.
                  </div>
                  <p style="text-align: center;">© 2026 River Business. All rights reserved.</p>
              </div>
          </div>
          <div style="display:none; white-space:nowrap; font:15px courier; line-height:0; color: #ffffff;"> - Welcome ID: ${timestamp} - </div>
      </body>
      </html>
    `
    };
}
function getDeliveryStatusTemplate(businessName, status, trackingId, volume) {
    const color = '#10b981';
    const subheader = `<p class="tracking-id">Tracking ID: <span>${trackingId}</span></p>`;
    const content = `
    <p class="greeting">Stay Hydrated, ${businessName}! 💧</p>
    <p class="body-text">
      Great news! Your fresh water supply has been successfully replenished. Keeping your team focused, healthy, and productive is exactly why we've automated this process for you.
    </p>
    <div class="status-badge">
      <span class="badge" style="background-color: ${color}15; color: ${color}; border: 1.5px solid ${color};">
        ${status}
      </span>
    </div>
    <div class="details-box">
      <h3 class="details-title">Shipment Summary</h3>
      <div class="detail-item">
        <div class="detail-icon">📦</div>
        <div>
          <p class="detail-label">Total Volume</p>
          <p class="detail-value">${volume} Containers</p>
        </div>
      </div>
      <p class="next-step">
        <strong>Transparency Check:</strong> Your digital <strong>Proof of Delivery (POD)</strong> is now available. Log in now to track your real-time consumption and keep your office inventory optimized.
      </p>
    </div>
  `;
    return {
        subject: `Success: Water Delivered to ${businessName} 🚚`,
        html: getEmailWrapper(content, 'Fresh Water Delivered', subheader)
    };
}
function getPaymentStatusTemplate(businessName, invoiceId, amount, status) {
    const isPaid = status === 'Paid';
    const color = isPaid ? '#10b981' : '#f59e0b';
    const title = isPaid ? 'Payment Confirmed' : 'Review in Progress';
    const subheader = `<p class="tracking-id">Invoice ID: <span>${invoiceId}</span></p>`;
    const content = `
    <p class="greeting">Hi ${businessName}, ${isPaid ? '✅' : '⏳'}</p>
    <p class="body-text">
      ${isPaid
        ? "Your account remains in excellent standing! We've successfully processed your payment, ensuring your automated business essentials continue to flow without interruption."
        : "We've received your proof of payment. Our finance team is currently validating the transaction to finalize your record and update your account balance."}
    </p>
    <div class="status-badge">
      <span class="badge" style="background-color: ${color}15; color: ${color}; border: 1.5px solid ${color};">
        ${status}
      </span>
    </div>
    <div class="details-box">
      <h3 class="details-title">Financial Snapshot</h3>
      <div class="detail-item">
        <div class="detail-icon">💰</div>
        <div>
          <p class="detail-label">Total Amount</p>
          <p class="detail-value">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <p class="next-step">
        Maintaining a healthy balance ensures zero delays in your supply chain. You can download your official digital receipt in your dashboard's billing section.
      </p>
    </div>
  `;
    return {
        subject: isPaid
            ? `Success: Your Account is in Excellent Standing ✅`
            : `Received: We're Validating Your Payment for ${invoiceId} ⏳`,
        html: getEmailWrapper(content, title, subheader)
    };
}
function getTopUpConfirmationTemplate(businessName, amount) {
    const content = `
    <p class="greeting">Balance Boosted, ${businessName}! 💳</p>
    <p class="body-text">
      Your central wallet has been successfully topped up! You're now fully prepared for your upcoming deliveries. No more manual approvals needed for every container—just pure, automated efficiency.
    </p>
    <div class="details-box">
      <h3 class="details-title">Wallet Update</h3>
      <div class="detail-item">
        <div class="detail-icon">💵</div>
        <div>
          <p class="detail-label">Amount Credited</p>
          <p class="detail-value">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <p class="next-step">
        We will automatically deduct from this balance for every container delivered across all your locations, keeping your administrative workload at an absolute minimum.
      </p>
    </div>
  `;
    return {
        subject: `Balance Boosted: Your Wallet is Ready for Action 💰`,
        html: getEmailWrapper(content, 'Balance Updated')
    };
}
function getNewInvoiceTemplate(businessName, invoiceId, amount, period) {
    const subheader = `<p class="tracking-id">Statement ID: <span>${invoiceId}</span></p>`;
    const content = `
    <p class="greeting">Hi ${businessName}, 📄</p>
    <p class="body-text">
      Financial transparency is the foundation of good business. Your automated monthly statement for <strong>${period}</strong> is now ready for review. Analyze your consumption and stay organized.
    </p>
    <div class="details-box">
      <h3 class="details-title">Statement Summary</h3>
      <div class="detail-item">
        <div class="detail-icon">📊</div>
        <div>
          <p class="detail-label">Total Amount Due</p>
          <p class="detail-value">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <p class="next-step">
        To keep your hydration service flowing without interruption, please settle this statement via GCash, Maya, or Bank Transfer through your secure portal.
      </p>
    </div>
  `;
    return {
        subject: `Statement Available: Optimized Consumption Insights for ${period} 📑`,
        html: getEmailWrapper(content, 'New Statement Available', subheader)
    };
}
function getRefillRequestTemplate(businessName, status, requestId, date) {
    const isReceived = status === 'Requested';
    const subheader = `<p class="tracking-id">Request ID: <span>${requestId}</span></p>`;
    const content = `
    <p class="greeting">Hello ${businessName}, ${isReceived ? '🌊' : '🚀'}</p>
    <p class="body-text">
      ${isReceived
        ? "We've prioritized your one-time refill request. Our fulfillment team has been alerted and is already prepping your containers to ensure your office never runs dry."
        : `Your on-demand refill is currently <strong>${status}</strong>. We're working hard to get your supply back to 100%.`}
    </p>
    <div class="status-badge">
      <span class="badge" style="background-color: ${BRAND_PRIMARY}15; color: ${BRAND_PRIMARY}; border: 1.5px solid ${BRAND_PRIMARY};">
        ${status}
      </span>
    </div>
    <div class="details-box">
      <h3 class="details-title">Request Priority</h3>
      <div class="detail-item">
        <div class="detail-icon">🚚</div>
        <div>
          <p class="detail-label">Target Date</p>
          <p class="detail-value">${date ? (0, date_fns_1.format)(new Date(date), 'PP') : 'ASAP Refill'}</p>
        </div>
      </div>
      <p class="next-step">
        You can track the live progress of our delivery team and view estimated arrival times directly in your dashboard.
      </p>
    </div>
  `;
    return {
        subject: `Priority Confirmed: Your Extra Water Refill is on the Way 🚀`,
        html: getEmailWrapper(content, isReceived ? 'Refill Priority Received' : 'Refill Request Updated', subheader)
    };
}
function getInternalRefillAlertTemplate(adminName, businessName, requestId, date) {
    const subheader = `<p class="tracking-id">Alert for Request ID: <span>${requestId}</span></p>`;
    const content = `
    <p class="greeting">Hey ${adminName}, 🌊</p>
    <p class="body-text">
      Our operating system has just flagged a new priority request. <strong>${businessName}</strong> has requested an extra refill through their customer portal.
    </p>
    <div class="details-box">
      <h3 class="details-title">Request Context</h3>
      <div class="detail-item">
        <div class="detail-icon">🏢</div>
        <div>
          <p class="detail-label">Customer Profile</p>
          <p class="detail-value">${businessName}</p>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-icon">📅</div>
        <div>
          <p class="detail-label">Fulfillment Date</p>
          <p class="detail-value">${date ? (0, date_fns_1.format)(new Date(date), 'PP') : 'ASAP Priority'}</p>
        </div>
      </div>
      <p class="next-step">
        Please log in to the <strong>Admin Panel</strong> immediately to coordinate this dispatch. Keeping our clients restocked is key to our automated mission.
      </p>
    </div>
  `;
    return {
        subject: `🚨 Priority: New Refill Request from ${businessName}`,
        html: getEmailWrapper(content, 'Internal Dispatch Alert', subheader)
    };
}
function getSanitationReportTemplate(businessName, officerName, date) {
    const content = `
    <p class="greeting">Quality Certified, ${businessName}! ✨</p>
    <p class="body-text">
      Your office water sanitation visit is complete. Our quality officer, <strong>${officerName}</strong>, has performed a thorough cleaning and inspection of your equipment to ensure it meets our strict hygiene standards.
    </p>
    <div class="status-badge">
      <span class="badge" style="background-color: #10b98115; color: #10b981; border: 1.5px solid #10b981;">
        Sanitation Completed
      </span>
    </div>
    <div class="details-box">
      <h3 class="details-title">Service Details</h3>
      <div class="detail-item">
        <div class="detail-icon">📅</div>
        <div>
          <p class="detail-label">Service Date</p>
          <p class="detail-value">${date}</p>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-icon">🧑‍🔧</div>
        <div>
          <p class="detail-label">Quality Officer</p>
          <p class="detail-value">${officerName}</p>
        </div>
      </div>
      <p class="next-step">
        The full sanitation checklist and digital sign-off are now available in your dashboard. Keeping your equipment clean is part of our commitment to your team's wellness.
      </p>
    </div>
  `;
    return {
        subject: `Certified: Your Office Water Sanitation is Complete ✨`,
        html: getEmailWrapper(content, 'Equipment Quality Check')
    };
}
function getSanitationScheduledTemplate(businessName, officerName, date) {
    const content = `
    <p class="greeting">Scheduled: Your Office Sanitation Visit 🗓️</p>
    <p class="body-text">
      Hi ${businessName}, we've scheduled a professional sanitation visit for your office water equipment. Keeping your dispensers clean is a core part of our quality guarantee.
    </p>
    <div class="status-badge">
      <span class="badge" style="background-color: ${BRAND_PRIMARY}15; color: ${BRAND_PRIMARY}; border: 1.5px solid ${BRAND_PRIMARY};">
        Visit Scheduled
      </span>
    </div>
    <div class="details-box">
      <h3 class="details-title">Appointment Details</h3>
      <div class="detail-item">
        <div class="detail-icon">📅</div>
        <div>
          <p class="detail-label">Scheduled Date</p>
          <p class="detail-value">${date}</p>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-icon">🧑‍🔧</div>
        <div>
          <p class="detail-label">Assigned Officer</p>
          <p class="detail-value">${officerName || 'TBD'}</p>
        </div>
      </div>
      <p class="next-step">
        Our officer will perform a comprehensive cleaning and safety check. You don't need to do anything—just keep the area accessible.
      </p>
    </div>
  `;
    return {
        subject: `Confirmed: Sanitation Visit Scheduled for ${date} 🗓️`,
        html: getEmailWrapper(content, 'Sanitation Visit Scheduled')
    };
}
function getComplianceAlertTemplate(businessName, stationName, reportName) {
    const content = `
    <p class="greeting">Transparency First, ${businessName} 🛡️</p>
    <p class="body-text">
      We've just updated the quality compliance documents for your assigned station, <strong>${stationName}</strong>. Ensuring you have visibility into the safety of your water is core to our Operating System.
    </p>
    <div class="details-box">
      <h3 class="details-title">Newly Uploaded Report</h3>
      <div class="detail-item">
        <div class="detail-icon">📑</div>
        <div>
          <p class="detail-label">Report Type</p>
          <p class="detail-value">${reportName}</p>
        </div>
      </div>
      <p class="next-step">
        You can now view and download the official testing results and safety permits directly from the <strong>Compliance</strong> section of your dashboard.
      </p>
    </div>
  `;
    return {
        subject: `Safety Update: New Quality Report for ${stationName} 🛡️`,
        html: getEmailWrapper(content, 'Quality Compliance Updated')
    };
}
//# sourceMappingURL=email.js.map