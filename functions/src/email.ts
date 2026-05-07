import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';
import { format } from 'date-fns';

interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html: string;
  attachments?: any[];
}

const BRAND_PRIMARY = '#538ec2';
const BRAND_ACCENT = '#7ea9d2';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-white-v2.png?alt=media&token=6c25e9e2-9375-4f03-a0ab-e32cd98b8b49';

const GCASH_QR = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2FRiver_gcash.png?alt=media&token=13c80b31-8f08-4857-a066-5a666d546d81';
const BPI_QR = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2Friver_BPI.png?alt=media&token=6ac4fd16-2014-40fe-b7cf-1fdf3e94a61e';
const MAYA_QR = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2Friver_maya.png?alt=media&token=a3ca4e56-c797-4d9a-8dcd-4b78a0a96965';

const PAYMENT_OPTIONS_BLOCK = `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-top: 32px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 16px 0; font-size: 13px; color: ${BRAND_PRIMARY}; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">Payment Instructions</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        1. <strong>Pay:</strong> Scan a QR code or use account details.<br>
        2. <strong>Capture:</strong> Screenshot your transaction receipt.<br>
        3. <strong>Upload:</strong> Submit proof via your dashboard.
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
export async function sendEmail({ to, cc, bcc, subject, text, html, attachments }: SendEmailOptions) {
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
    
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    logger.info(`Attempting to send email to ${recipients}. CC: ${cc || 'None'}. BCC: ${bcc || 'None'}`);

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
  } catch (error) {
    logger.error('Nodemailer Error: Failed to dispatch email.', error);
    throw error;
  }
}

/**
 * Generates the common HTML wrapper for all River Philippines emails.
 */
function getEmailWrapper(content: string, headerTitle: string, subheader: string = '', buttonText: string = 'Login to Dashboard', buttonUrl: string = 'https://app.riverph.com') {
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
        .header { background: linear-gradient(90deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%); padding: 32px 24px; text-align: center; }
        .logo { width: 50px; height: auto; margin-bottom: 12px; }
        .header-title { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 40px; }
        .main-title { color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 24px; text-align: center; }
        .body-text { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .btn-container { text-align: center; margin-top: 32px; }
        .btn { background-color: ${BRAND_PRIMARY}; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; }
        .footer { text-align: center; margin-top: 40px; padding: 0 40px 40px 40px; }
        .footer-brand { font-size: 15px; font-weight: 800; color: ${BRAND_PRIMARY}; margin-bottom: 4px; }
        .footer-sub { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; }
        .footer-sub a { color: ${BRAND_PRIMARY}; text-decoration: none; font-weight: 700; }
        .legal-disclaimer { max-width: 600px; margin: 0 auto 40px auto; padding: 0 24px; color: #cbd5e1; font-size: 10px; line-height: 1.4; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${LOGO_URL}" alt="River Logo" class="logo">
          <h1 class="header-title">River Philippines</h1>
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
        <p class="footer-brand">River PH - Automated, Connected, Convenient.</p>
        <p class="footer-sub">
          A unified business operating system connecting operations, people, and security.<br>
          <a href="https://riverph.com">riverph.com</a>
        </p>
      </div>
      <div class="legal-disclaimer">
        DISCLAIMER: This is an automated communication intended for the exclusive use of the addressee.
      </div>
      <div style="display:none; white-space:nowrap; font:15px courier; line-height:0; color: #ffffff;"> - Notification ID: ${timestamp} - </div>
    </body>
    </html>
  `;
}

export function getWelcomeUnclaimedTemplate( businessName: string, clientId: string, planName: string, address: string, schedule: string) {
  const content = `
    <p class="body-text">Hello <strong>${businessName}</strong>,</p>
    <p class="body-text">
      Welcome to River Philippines! Your account is ready for activation. Your smart refill system is now active, ensuring your workspace is always supplied with clean water.
    </p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 8px; font-size: 14px;"><span style="color: #64748b; font-weight: bold;">Client ID:</span> <span style="font-family: monospace; font-weight: 800; color: ${BRAND_PRIMARY};">${clientId}</span></div>
        <div style="margin-bottom: 8px; font-size: 14px;"><span style="color: #64748b; font-weight: bold;">Plan:</span> ${planName}</div>
        <div style="font-size: 14px;"><span style="color: #64748b; font-weight: bold;">Address:</span> ${address}</div>
    </div>
  `;

  return {
    subject: `Welcome to River Philippines: Your Smart Refill is Ready! 🌊`,
    html: getEmailWrapper(content, 'Welcome to the Future of Hydration', '', 'Activate My Dashboard', 'https://app.riverph.com')
  };
}

export function getDeliveryStatusTemplate(businessName: string, status: string, trackingId: string, volume: number) {
  const content = `
    <p class="body-text">Hi ${businessName}, your water supply has been successfully replenished. Keeping your team healthy and productive is our top priority.</p>
    <div style="text-align: center; margin: 32px 0;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 12px 24px; border-radius: 50px; font-weight: 800; display: inline-block; font-size: 14px; text-transform: uppercase;">
        ${status}
      </div>
    </div>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Volume Delivered</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">${volume} Containers</p>
    </div>
  `;

  return {
    subject: `Fresh Water Delivered to ${businessName} 🚚`,
    html: getEmailWrapper(content, 'Supply Replenished', `<p style="text-align: center; color: #64748b; font-size: 14px;">Tracking ID: ${trackingId}</p>`)
  };
}

export function getPaymentStatusTemplate(businessName: string, invoiceId: string, amount: number, status: string) {
  const isPaid = status === 'Paid';
  const content = `
    <p class="body-text">Hi ${businessName}, ${isPaid ? "your payment has been confirmed. Your account remains in excellent standing." : "we've received your proof of payment and our finance team is currently reviewing it."}</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 24px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Amount Processed</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;

  return {
    subject: isPaid ? `Payment Confirmed ✅` : `Payment Received ⏳`,
    html: getEmailWrapper(content, isPaid ? 'Payment Successful' : 'Processing Payment', `<p style="text-align: center; color: #64748b; font-size: 14px;">Invoice ID: ${invoiceId}</p>`)
  };
}

export function getTopUpConfirmationTemplate(businessName: string, amount: number) {
  const content = `
    <p class="body-text">Hi ${businessName}, your central wallet has been successfully topped up. You're now fully prepared for your upcoming automated deliveries.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Wallet Credit</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">+ ₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;

  return {
    subject: `Wallet Topped Up! 💰`,
    html: getEmailWrapper(content, 'Balance Updated')
  };
}

export function getNewInvoiceTemplate(businessName: string, invoiceId: string, amount: number, period: string) {
  const content = `
    <p class="body-text">Hi ${businessName}, your monthly statement for <strong>${period}</strong> is now ready. Please settle this balance to ensure uninterrupted hydration services.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Total Amount Due</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    ${PAYMENT_OPTIONS_BLOCK}
  `;

  return {
    subject: `New Invoice for ${period} 🌊`,
    html: getEmailWrapper(content, 'New Statement Available', `<p style="text-align: center; color: #64748b; font-size: 14px;">Ref: ${invoiceId}</p>`, 'Pay via Dashboard')
  };
}

export function getRefillRequestTemplate(businessName: string, status: string, requestId: string, date?: string) {
  const isReceived = status === 'Requested';
  const content = `
    <p class="body-text">Hello ${businessName}, we've received your refill request. Our fulfillment team is now preparing your containers for dispatch.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Request Status</p>
      <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 800; color: ${BRAND_PRIMARY};">${status}</p>
    </div>
  `;

  return {
    subject: `Refill Request Received 🌊`,
    html: getEmailWrapper(content, 'Priority Confirmed', `<p style="text-align: center; color: #64748b; font-size: 14px;">ID: ${requestId}</p>`, 'Track Progress')
  };
}

export function getEmployeeInvitationTemplate(employeeName: string, businessName: string, signupUrl: string) {
  const content = `
    <p class="body-text">Hello ${employeeName},</p>
    <p class="body-text">You've been invited to join the <strong>${businessName}</strong> team on River Business. Activate your account to start managing your workspace.</p>
  `;
  return {
    subject: `Invitation: Join ${businessName} on River 🌊`,
    html: getEmailWrapper(content, 'Welcome to the Team', '', 'Activate Account', signupUrl)
  };
}

export function getSanitationScheduledTemplate(businessName: string, assignedTo: string, date: string) {
  const content = `
    <p class="body-text">Hi ${businessName}, we've scheduled a professional sanitation visit for your office hydration equipment.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
        <div style="margin-bottom: 8px;"><span style="color: #64748b; font-weight: bold; font-size: 12px; text-transform: uppercase;">Target Date:</span><br><span style="font-weight: 700; font-size: 16px;">${date}</span></div>
        <div><span style="color: #64748b; font-weight: bold; font-size: 12px; text-transform: uppercase;">Officer:</span><br><span style="font-weight: 700; font-size: 16px;">${assignedTo}</span></div>
    </div>
  `;
  return {
    subject: `Sanitation Scheduled for ${businessName} 🛡️`,
    html: getEmailWrapper(content, 'Quality Check Scheduled')
  };
}

export function getSanitationReportTemplate(businessName: string, assignedTo: string, date: string, score: string) {
  const content = `
    <p class="body-text">Hi ${businessName}, your latest equipment quality report is now available. Our officer has finalized the sanitation for your units.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Intelligence Score</p>
      <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: 800; color: #10b981;">${score}</p>
    </div>
  `;
  return {
    subject: `Sanitation Report Ready 💧`,
    html: getEmailWrapper(content, 'Quality Assessment Finalized', '', 'View Full Report')
  };
}

export function getPaymentReminderTemplate(businessName: string, amount: string, period: string) {
  const content = `
    <p class="body-text">Hi ${businessName}, this is a follow-up regarding your statement for <strong>${period}</strong>. Please settle your balance to maintain active service.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Amount Due</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount}</p>
    </div>
    ${PAYMENT_OPTIONS_BLOCK}
  `;
  return {
    subject: `Action Required: Statement for ${period} 🌊`,
    html: getEmailWrapper(content, 'Payment Reminder', '', 'Settle via Dashboard')
  };
}
