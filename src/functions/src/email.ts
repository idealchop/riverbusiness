import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';
import { format } from 'date-fns';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const BRAND_PRIMARY = '#156391';
const BRAND_ACCENT = '#22d3ee';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';

/**
 * Sends an email using the Brevo SMTP relay.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
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
      from: '"River Business | Customers" <customers@riverph.com>',
      to,
      subject,
      text,
      html,
    });

    logger.info(`Email sent successfully. MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Nodemailer Error: Failed to dispatch email via Brevo relay.', error);
    throw error;
  }
}

/**
 * Generates the common HTML wrapper for all River Business emails with Manrope font and consistent branding.
 */
function getEmailWrapper(content: string, header: string, subheader: string = '') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Manrope', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f9; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .top-bar { height: 8px; background: linear-gradient(90deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%); }
        .header { padding: 32px 24px 20px 24px; text-align: center; }
        .logo { width: 140px; height: auto; }
        .content { padding: 0 40px 40px 40px; }
        .h2 { color: #0f172a; font-size: 24px; font-weight: 800; margin-bottom: 8px; text-align: center; margin-top: 0; letter-spacing: -0.5px; }
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
        .btn { background-color: ${BRAND_PRIMARY}; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(21, 99, 145, 0.3); }
        .support-link { font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; }
        .support-link a { color: ${BRAND_PRIMARY}; text-decoration: none; font-weight: 600; }
        .footer { text-align: center; margin-top: 40px; }
        .footer-line { border: none; border-top: 1px solid #f1f5f9; margin: 40px 0; }
        .footer-company { font-size: 14px; font-weight: 700; color: ${BRAND_PRIMARY}; margin-bottom: 4px; }
        .footer-sub { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; }
        .footer-sub a { color: #94a3b8; text-decoration: none; }
        .automated-note { font-size: 11px; color: #cbd5e1; margin-top: 20px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="top-bar"></div>
        <div class="header">
          <img src="${LOGO_URL}" alt="River Business Logo" class="logo">
        </div>
        <div class="content">
          <h2 class="h2">${header}</h2>
          ${subheader}
          ${content}
          <div class="btn-container">
            <a href="https://app.riverph.com" class="btn">Go to Dashboard</a>
          </div>
          <p class="support-link">
            Questions? We're here to help. <a href="mailto:customers@riverph.com">Contact Support</a>
          </p>
          <hr class="footer-line" />
          <div class="footer">
            <p class="footer-company">River Tech Inc.</p>
            <p class="footer-sub">
              Turn Everyday Needs Into Automatic Experience<br>
              Manila, Philippines | <a href="https://www.riverph.com">www.riverph.com</a>
            </p>
            <p class="automated-note">This is an automated message from River Business. Please do not reply directly to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getDeliveryStatusTemplate(businessName: string, status: string, trackingId: string, volume: number) {
  const color = '#10b981'; // Green for Delivered
  const subheader = `<p class="tracking-id">Tracking ID: <span>${trackingId}</span></p>`;
  
  const content = `
    <p class="greeting">Hello ${businessName}, 💧</p>
    
    <p class="body-text">
      Your hydration is here! We've successfully replenished your water supply so your team can stay focused, healthy, and productive throughout the workday.
    </p>

    <div class="status-badge">
      <span class="badge" style="background-color: ${color}15; color: ${color}; border: 1.5px solid ${color};">
        ${status}
      </span>
    </div>

    <div class="details-box">
      <h3 class="details-title">Delivery Summary</h3>
      <div class="detail-item">
        <div class="detail-icon">📦</div>
        <div>
          <p class="detail-label">Total Volume</p>
          <p class="detail-value">${volume} Containers</p>
        </div>
      </div>
      <p class="next-step">
        <strong>Value Check:</strong> Your digital <strong>Proof of Delivery (POD)</strong> is now available. Log in to track your real-time consumption and ensure your office overhead is optimized.
      </p>
    </div>
  `;

  return {
    subject: `Hydration Delivered to ${businessName} 🚚`,
    html: getEmailWrapper(content, 'Stay Refreshed!', subheader)
  };
}

export function getPaymentStatusTemplate(businessName: string, invoiceId: string, amount: number, status: string) {
  const isPaid = status === 'Paid';
  const color = isPaid ? '#10b981' : '#f59e0b';
  const title = isPaid ? 'Payment Confirmed' : 'Review in Progress';
  const subheader = `<p class="tracking-id">Invoice ID: <span>${invoiceId}</span></p>`;
  
  const content = `
    <p class="greeting">Hi ${businessName}, ${isPaid ? '✅' : '⏳'}</p>
    
    <p class="body-text">
      ${isPaid 
        ? "Your account is in excellent standing. We've successfully processed your payment, ensuring your automated water management continues without interruption." 
        : "We've received your proof of payment! Our finance team is now reviewing the details to finalize your record."}
    </p>

    <div class="status-badge">
      <span class="badge" style="background-color: ${color}15; color: ${color}; border: 1.5px solid ${color};">
        ${status}
      </span>
    </div>

    <div class="details-box">
      <h3 class="details-title">Financial Summary</h3>
      <div class="detail-item">
        <div class="detail-icon">💰</div>
        <div>
          <p class="detail-label">Amount Received</p>
          <p class="detail-value">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <p class="next-step">
        Maintaining a healthy balance keeps your office running smoothly. You can download your official receipt anytime in the billing section.
      </p>
    </div>
  `;

  return {
    subject: `${title} - Invoice ${invoiceId}`,
    html: getEmailWrapper(content, title, subheader)
  };
}

export function getTopUpConfirmationTemplate(businessName: string, amount: number) {
  const content = `
    <p class="greeting">Hello ${businessName}, 💳</p>
    
    <p class="body-text">
      Your central wallet has been boosted! You're all set for your upcoming deliveries. No more manual approvals needed for every container—just pure, automated efficiency for your business.
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
        We will automatically deduct from this balance for every container delivered, keeping your admin work to a minimum.
      </p>
    </div>
  `;

  return {
    subject: `Credits Added Successfully to your Wallet 💰`,
    html: getEmailWrapper(content, 'Balance Boosted!')
  };
}

export function getNewInvoiceTemplate(businessName: string, invoiceId: string, amount: number, period: string) {
  const subheader = `<p class="tracking-id">Statement ID: <span>${invoiceId}</span></p>`;
  
  const content = `
    <p class="greeting">Hi ${businessName}, 📄</p>
    
    <p class="body-text">
      Transparency is key to good management. Your automated statement for <strong>${period}</strong> is now ready. Review your consumption and keep your office records organized.
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
        Log in to your dashboard to settle this statement via GCash, Maya, or Bank Transfer instantly.
      </p>
    </div>
  `;

  return {
    subject: `Monthly Statement Ready for ${period} 📑`,
    html: getEmailWrapper(content, 'New Statement Available', subheader)
  };
}

export function getRefillRequestTemplate(businessName: string, status: string, requestId: string, date?: string) {
  const isReceived = status === 'Requested';
  const subheader = `<p class="tracking-id">Request ID: <span>${requestId}</span></p>`;
  
  const content = `
    <p class="greeting">Hello ${businessName}, ${isReceived ? '🌊' : '🚀'}</p>
    
    <p class="body-text">
      ${isReceived 
        ? "We've prioritize your extra water refill request. Our fulfillment team has been alerted and is already preparing your containers for dispatch." 
        : `Your on-demand refill request is currently <strong>${status}</strong>.`}
    </p>

    <div class="status-badge">
      <span class="badge" style="background-color: ${BRAND_PRIMARY}15; color: ${BRAND_PRIMARY}; border: 1.5px solid ${BRAND_PRIMARY};">
        ${status}
      </span>
    </div>

    <div class="details-box">
      <h3 class="details-title">Request Summary</h3>
      <div class="detail-item">
        <div class="detail-icon">🚚</div>
        <div>
          <p class="detail-label">Requested Priority</p>
          <p class="detail-value">${date ? format(new Date(date), 'PP') : 'ASAP Refill'}</p>
        </div>
      </div>
      <p class="next-step">
        Track the real-time progress of our delivery truck through the tracker in your dashboard.
      </p>
    </div>
  `;

  return {
    subject: `Update: Refill Request ${requestId} ${isReceived ? '🌊' : '🚀'}`,
    html: getEmailWrapper(content, isReceived ? 'Request Received' : 'Request Updated', subheader)
  };
}