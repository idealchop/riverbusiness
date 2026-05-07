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
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-911553385-80027.firebasestorage.app/o/Logo%2Friver-icon-white-v2.png?alt=media&token=6c25e9e2-9375-4f03-a0ab-e32cd98b8b49';

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
function getEmailWrapper(content: string, header: string, subheader: string = '', buttonText: string = 'Login to Dashboard', buttonUrl: string = 'https://app.riverph.com') {
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
        .logo { width: 50px; height: auto; }
        .content { padding: 0 40px 40px 40px; }
        .h2 { color: #0f172a; font-size: 22px; font-weight: 800; margin-bottom: 8px; text-align: center; margin-top: 0; letter-spacing: -0.5px; }
        .greeting { color: #0f172a; font-size: 17px; font-weight: 700; line-height: 1.6; margin-bottom: 16px; }
        .body-text { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .btn-container { text-align: center; margin-top: 32px; }
        .btn { background-color: ${BRAND_PRIMARY}; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; }
        .footer { text-align: center; margin-top: 40px; }
        .footer-line { border: none; border-top: 1px solid #f1f5f9; margin: 40px 0; }
        .footer-company { font-size: 15px; font-weight: 800; color: ${BRAND_PRIMARY}; margin-bottom: 4px; }
        .footer-sub { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; }
        .automated-note { font-size: 10px; color: #cbd5e1; margin-top: 20px; font-style: italic; }
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
            <a href="${buttonUrl}" class="btn">${buttonText}</a>
          </div>
          <hr class="footer-line" />
          <div class="footer">
            <p class="footer-company">River PH - Automated, Connected, Convenient.</p>
            <p class="footer-sub">
              A unified business operating system connecting operations, people, and security.<br>
              <a href="https://www.riverph.com" style="color: ${BRAND_PRIMARY}; text-decoration: none; font-weight: 700;">www.riverph.com</a>
            </p>
            <p class="automated-note">This is an automated system message. Please do not reply.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getDeliveryStatusTemplate(businessName: string, status: string, trackingId: string, volume: number) {
  const content = `
    <p class="greeting">Stay Hydrated, ${businessName}! 💧</p>
    <p class="body-text">
      Your fresh water supply has been successfully replenished. Your digital Proof of Delivery (POD) is now available for tracking.
    </p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase;">Delivered Volume</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">${volume} Containers</p>
    </div>
  `;
  return {
    subject: `Hydration Delivered to ${businessName} 🚚`,
    html: getEmailWrapper(content, 'Supply Replenished', `<p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">Ref: ${trackingId}</p>`)
  };
}

export function getPaymentStatusTemplate(businessName: string, invoiceId: string, amount: number, status: string) {
  const isPaid = status === 'Paid';
  const content = `
    <p class="greeting">Hi ${businessName}, ${isPaid ? "your payment is confirmed." : "we've received your proof of payment."}</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-top: 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase;">Amount Processed</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;
  return {
    subject: isPaid ? `Payment Confirmed ✅` : `Processing Payment ⏳`,
    html: getEmailWrapper(content, isPaid ? 'Payment Successful' : 'Review in Progress', `<p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">Invoice: ${invoiceId}</p>`)
  };
}

export function getTopUpConfirmationTemplate(businessName: string, amount: number) {
  const content = `
    <p class="greeting">Balance Boosted, ${businessName}! 💳</p>
    <p class="body-text">Your central wallet has been topped up. You're ready for your upcoming automated branch deliveries.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase;">Wallet Credit</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">+ ₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;
  return {
    subject: `Credits Added Successfully 💰`,
    html: getEmailWrapper(content, 'Balance Updated')
  };
}

export function getNewInvoiceTemplate(businessName: string, invoiceId: string, amount: number, period: string) {
  const content = `
    <p class="greeting">Hi ${businessName}, 📄</p>
    <p class="body-text">Your automated monthly statement for <strong>${period}</strong> is now ready for review and settlement.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase;">Total Due</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  `;
  return {
    subject: `Monthly Statement Ready 📑`,
    html: getEmailWrapper(content, 'Statement Available', `<p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">Ref: ${invoiceId}</p>`, 'Pay via Dashboard')
  };
}

export function getRefillRequestTemplate(businessName: string, status: string, requestId: string, date?: string) {
  const content = `
    <p class="greeting">Hello ${businessName}, 🌊</p>
    <p class="body-text">We've received your extra refill request. Our fulfillment team is now preparing your dispatch.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase;">Status</p>
      <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 800; color: ${BRAND_PRIMARY};">${status}</p>
    </div>
  `;
  return {
    subject: `Refill Request Received 🚀`,
    html: getEmailWrapper(content, 'Priority Received', `<p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px;">ID: ${requestId}</p>`, 'Track Request')
  };
}
