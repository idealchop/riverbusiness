
import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';

/**
 * Configuration for the Brevo SMTP Relay.
 */
const SMTP_CONFIG = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: '998b0f001@smtp-brevo.com',
    pass: process.env.BREVO_API_KEY, 
  },
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends an email using the configured SMTP transporter.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  try {
    if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_api_key_here') {
      logger.warn('BREVO_API_KEY is not set correctly. Email will not be sent.');
      return;
    }

    const info = await transporter.sendMail({
      from: '"River Business Support" <support@riverph.com>',
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent successfully: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Template for Delivery Status Updates
 */
export function getDeliveryStatusTemplate(businessName: string, status: string, trackingId: string, volume: number) {
  const statusColors: Record<string, string> = {
    'Delivered': '#10b981',
    'In Transit': '#3b82f6',
    'Pending': '#f59e0b',
    'Scheduled': '#6366f1'
  };
  const color = statusColors[status] || '#3b82f6';

  return {
    subject: `Delivery Update: ${status} - ${trackingId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #156391;">River Business</h2>
        <p>Hi ${businessName},</p>
        <p>Your delivery <strong>${trackingId}</strong> is now <span style="color: ${color}; font-weight: bold;">${status}</span>.</p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Volume:</p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold;">${volume} Containers</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">You can track your consumption and view proof of delivery in your dashboard.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">River Tech Inc. | Turn Everyday Needs Into Automatic Experience</p>
      </div>
    `,
  };
}

/**
 * Template for Payment Status
 */
export function getPaymentStatusTemplate(businessName: string, invoiceId: string, amount: number, status: string) {
  const isPaid = status === 'Paid';
  const title = isPaid ? 'Payment Confirmed' : 'Payment Received (Under Review)';
  const subMessage = isPaid 
    ? "We've successfully confirmed your payment. Thank you!" 
    : "We've received your proof of payment. Our team is now reviewing it.";

  return {
    subject: `${title} - ${invoiceId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #156391;">River Business</h2>
        <p>Hi ${businessName},</p>
        <p>${subMessage}</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #166534;">Invoice ID: <strong>${invoiceId}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #166534;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">River Tech Inc. | customer@riverph.com</p>
      </div>
    `,
  };
}

/**
 * Template for Top-Up Confirmations
 */
export function getTopUpConfirmationTemplate(businessName: string, amount: number) {
  return {
    subject: `Credits Added Successfully`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #156391;">River Business</h2>
        <p>Hi ${businessName},</p>
        <p>Your top-up request has been approved and credits have been added to your account.</p>
        <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;">Amount Added:</p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #1e40af;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <p>These credits are now available to cover your future deliveries.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">River Tech Inc. | customer@riverph.com</p>
      </div>
    `,
  };
}

/**
 * Template for New Invoices
 */
export function getNewInvoiceTemplate(businessName: string, invoiceId: string, amount: number, period: string) {
  return {
    subject: `New Invoice for ${period} - ${invoiceId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #156391;">River Business</h2>
        <p>Hi ${businessName},</p>
        <p>Your invoice for <strong>${period}</strong> is now available.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;">Invoice ID: <strong>${invoiceId}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #1e293b;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Log in to your dashboard to view the breakdown and settle your payment.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">River Tech Inc. | Turn Everyday Needs Into Automatic Experience</p>
      </div>
    `,
  };
}

/**
 * Template for Refill Requests
 */
export function getRefillRequestTemplate(businessName: string, status: string, requestId: string, date?: string) {
  const isReceived = status === 'Requested';
  const title = isReceived ? 'Refill Request Received' : `Refill Status: ${status}`;
  const message = isReceived 
    ? "We've received your request for a water refill and will process it shortly."
    : `Your refill request is now <strong>${status}</strong>.`;

  return {
    subject: title,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h2 style="color: #156391;">River Business</h2>
        <p>Hi ${businessName},</p>
        <p>${message}</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;">Request ID: <strong>${requestId}</strong></p>
          ${date ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">Requested for: <strong>${date}</strong></p>` : ''}
        </div>
        <p style="font-size: 14px; color: #6b7280;">Thank you for choosing River Business!</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">River Tech Inc. | customer@riverph.com</p>
      </div>
    `,
  };
}
