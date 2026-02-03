import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const BRAND_COLOR = '#156391';
const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';

/**
 * Sends an email using the Brevo SMTP relay.
 * The transporter is initialized inside the function to ensure the BREVO_API_KEY 
 * secret is correctly picked up from the environment at runtime.
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
      from: '"River Business" <support@riverph.com>',
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

function getEmailWrapper(content: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f9; padding: 40px 0; margin: 0; width: 100%;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <tr>
          <td style="padding: 30px; background-color: ${BRAND_COLOR}; text-align: center;">
            <img src="${LOGO_URL}" alt="River Business" width="60" height="60" style="margin-bottom: 10px; border-radius: 12px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">River Business</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              River Tech Inc. | Turn Everyday Needs Into Automatic Experience
            </p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">
              Questions? Contact us at <a href="mailto:customer@riverph.com" style="color: ${BRAND_COLOR}; text-decoration: none;">customer@riverph.com</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function getDeliveryStatusTemplate(businessName: string, status: string, trackingId: string, volume: number) {
  const isDelivered = status === 'Delivered';
  const statusColor = isDelivered ? '#10b981' : BRAND_COLOR;
  
  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">Hello ${businessName},</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Your water delivery <strong>${trackingId}</strong> has been successfully <span style="color: ${statusColor}; font-weight: bold;">Delivered</span>.
    </p>
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Delivery Details:</p>
      <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #1e293b;">${volume} Containers</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      You can track your usage and view the proof of delivery in your dashboard. Thank you for staying hydrated with River Business!
    </p>
    <div style="margin-top: 30px; text-align: center;">
      <a href="https://app.riverph.com/dashboard" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Dashboard</a>
    </div>
  `;

  return {
    subject: `Success: Water Delivered - ${trackingId}`,
    html: getEmailWrapper(content),
  };
}

export function getPaymentStatusTemplate(businessName: string, invoiceId: string, amount: number, status: string) {
  const isPaid = status === 'Paid';
  const title = isPaid ? 'Payment Confirmed' : 'Payment Received (Under Review)';
  const subMessage = isPaid 
    ? "We've successfully confirmed your payment. Thank you!" 
    : "We've received your proof of payment and our team is currently reviewing it.";

  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">Hi ${businessName},</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">${subMessage}</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">Invoice ID: <strong>${invoiceId}</strong></p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #166534;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      Your payment has been logged against your account. You can view your full transaction history in your dashboard.
    </p>
  `;

  return {
    subject: `${title} - ${invoiceId}`,
    html: getEmailWrapper(content),
  };
}

export function getTopUpConfirmationTemplate(businessName: string, amount: number) {
  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">Credits Added!</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi ${businessName}, your top-up request has been approved.</p>
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">Amount Credited:</p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1e40af;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      These credits are now available to cover your upcoming water deliveries.
    </p>
  `;

  return {
    subject: `Credits Added Successfully`,
    html: getEmailWrapper(content),
  };
}

export function getNewInvoiceTemplate(businessName: string, invoiceId: string, amount: number, period: string) {
  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">New Invoice Available</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Hi ${businessName}, your invoice for <strong>${period}</strong> has been generated.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #475569;">Invoice ID: <strong>${invoiceId}</strong></p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1e293b;">₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      Log in to your dashboard to view the full breakdown and settle your balance.
    </p>
    <div style="margin-top: 30px; text-align: center;">
      <a href="https://app.riverph.com/dashboard" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Pay Now</a>
    </div>
  `;

  return {
    subject: `New Invoice for ${period} - ${invoiceId}`,
    html: getEmailWrapper(content),
  };
}

export function getRefillRequestTemplate(businessName: string, status: string, requestId: string, date?: string) {
  const isReceived = status === 'Requested';
  const title = isReceived ? 'Refill Request Received' : `Refill Status: ${status}`;
  const message = isReceived 
    ? "We've received your request for a water refill and our team is already on it."
    : `Your refill request is now <strong>${status}</strong>.`;

  const content = `
    <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi ${businessName}, ${message}</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #475569;">Request ID: <strong>${requestId}</strong></p>
      ${date ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #475569;">Requested for: <strong>${date}</strong></p>` : ''}
    </div>
    <p style="color: #475569; font-size: 14px;">
      You can track the real-time progress of your request through the live tracker in your dashboard.
    </p>
  `;

  return {
    subject: title,
    html: getEmailWrapper(content),
  };
}