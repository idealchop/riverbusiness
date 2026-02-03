import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';

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
 * Generates the common HTML wrapper for all River Business emails.
 */
function getEmailWrapper(content: string, preheader: string) {
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
        .h2 { color: #0f172a; font-size: 22px; font-weight: 700; margin-bottom: 8px; text-align: center; margin-top: 0; }
        .tracking-id { color: #64748b; font-size: 14px; text-align: center; margin-bottom: 32px; }
        .tracking-id span { color: ${BRAND_PRIMARY}; font-weight: 600; }
        .greeting { color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 16px; }
        .body-text { color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
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
          ${content}
          <div class="btn-container">
            <a href="https://app.riverph.com" class="btn">Go to Dashboard</a>
          </div>
          <p class="support-link">
            Questions about this? <a href="mailto:customers@riverph.com">Contact Support</a>
          </p>
          <hr class="footer-line" />
          <div class="footer">
            <p class="footer-company">River Tech Inc.</p>
            <p class="footer-sub">
              Turn Everyday Needs Into Automatic Experience<br>
              Manila, Philippines | <a href="https://www.riverph.com">www.riverph.com</a>
            </p>
            <p class="automated-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getDeliveryStatusTemplate(businessName: string, status: string, trackingId: string, volume: number) {
  const color = '#10b981'; // Green for Delivered
  const content = `
    <h2 class="h2">Delivery Completed! 💧</h2>
    <p class="tracking-id">Tracking ID: <span>${trackingId}</span></p>
    
    <p class="greeting">Hi <strong>${businessName}</strong>,</p>
    
    <p class="body-text">
      Stay hydrated! Your fresh water supply has been successfully delivered to your station. Our team has completed the replenishment of your units.
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
        <strong>Next Step:</strong> You can now view the high-resolution proof of delivery and track your updated liter balance directly in your portal.
      </p>
    </div>
  `;

  return {
    subject: `Success: Water Delivered to ${businessName} 🚚`,
    html: getEmailWrapper(content, 'Your water has been delivered.')
  };
}

export function getPaymentStatusTemplate(businessName: string, invoiceId: string, amount: number, status: string) {
  const isPaid = status === 'Paid';
  const color = isPaid ? '#10b981' : '#f59e0b';
  const emoji = isPaid ? '✅' : '⏳';
  const title = isPaid ? 'Payment Confirmed' : 'Review in Progress';
  
  const content = `
    <h2 class="h2">${title} ${emoji}</h2>
    <p class="tracking-id">Invoice ID: <span>${invoiceId}</span></p>
    
    <p class="greeting">Hi <strong>${businessName}</strong>,</p>
    
    <p class="body-text">
      ${isPaid ? "Thank you for your prompt payment! We've successfully updated your records, and your account remains in excellent standing." : "We've received your proof of payment. Our finance team is currently reviewing the details to finalize your record."}
    </p>

    <div class="status-badge">
      <span class="badge" style="background-color: ${color}15; color: ${color}; border: 1.5px solid ${color};">
        ${status}
      </span>
    </div>

    <div class="details-box">
      <h3 class="details-title">Payment Details</h3>
      <div class="detail-item">
        <div class="detail-icon">💰</div>
        <div>
          <p class="detail-label">Amount Paid</p>
          <p class="detail-value">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <p class="next-step">
        <strong>Tip:</strong> You can download a PDF copy of your official receipt and view your full billing history anytime.
      </p>
    </div>
  `;

  return {
    subject: `${title}: ${invoiceId} ${emoji}`,
    html: getEmailWrapper(content, 'Payment status update.')
  };
}

export function getTopUpConfirmationTemplate(businessName: string, amount: number) {
  const content = `
    <h2 class="h2">Balance Boosted! 💳</h2>
    
    <p class="greeting">Hi <strong>${businessName}</strong>,</p>
    
    <p class="body-text">
      Your top-up request has been approved! Your credits have been successfully added to your central wallet and are ready for your next delivery.
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
        We'll automatically deduct from this balance for every container delivered to your branches.
      </p>
    </div>
  `;

  return {
    subject: `Credits Added Successfully to your Wallet 💰`,
    html: getEmailWrapper(content, 'Your wallet has been credited.')
  };
}

export function getNewInvoiceTemplate(businessName: string, invoiceId: string, amount: number, period: string) {
  const content = `
    <h2 class="h2">New Statement Ready 📄</h2>
    <p class="tracking-id">Invoice ID: <span>${invoiceId}</span></p>
    
    <p class="greeting">Hi <strong>${businessName}</strong>,</p>
    
    <p class="body-text">
      Your automated monthly statement for <strong>${period}</strong> has been generated and is now available for your review.
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
        Log in to see your detailed consumption breakdown and equipment fees. You can pay instantly via GCash, Maya, or Bank Transfer.
      </p>
    </div>
  `;

  return {
    subject: `New Invoice Available for ${period} 📑`,
    html: getEmailWrapper(content, 'Your monthly statement is ready.')
  };
}

export function getRefillRequestTemplate(businessName: string, status: string, requestId: string, date?: string) {
  const isReceived = status === 'Requested';
  const color = isReceived ? '#3b82f6' : '#10b981';
  const emoji = isReceived ? '🌊' : '🚀';
  
  const content = `
    <h2 class="h2">Refill Request ${isReceived ? 'Received' : 'Updated'} ${emoji}</h2>
    <p class="tracking-id">Request ID: <span>${requestId}</span></p>
    
    <p class="greeting">Hi <strong>${businessName}</strong>,</p>
    
    <p class="body-text">
      ${isReceived ? "We've received your request for an extra water refill. Our fulfillment team has been alerted and is already preparing your containers." : `Your on-demand refill request is moving through our system and is currently <strong>${status}</strong>.`}
    </p>

    <div class="status-badge">
      <span class="badge" style="background-color: ${color}15; color: ${color}; border: 1.5px solid ${color};">
        ${status}
      </span>
    </div>

    <div class="details-box">
      <h3 class="details-title">Request Summary</h3>
      <div class="detail-item">
        <div class="detail-icon">🚚</div>
        <div>
          <p class="detail-label">Requested Date</p>
          <p class="detail-value">${date ? format(new Date(date), 'PP') : 'ASAP Refill'}</p>
        </div>
      </div>
      <p class="next-step">
        You can track the real-time progress of our delivery team through the live tracker in your dashboard.
      </p>
    </div>
  `;

  return {
    subject: `Update: Refill Request ${requestId} ${emoji}`,
    html: getEmailWrapper(content, 'Refill request update.')
  };
}
