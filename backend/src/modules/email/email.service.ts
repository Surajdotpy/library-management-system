import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function initTransporter(): Transporter | null {
  const host = process.env.EMAIL_HOST ?? '';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER ?? '';
  const pass = process.env.EMAIL_PASS ?? '';

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  return initTransporter();
}

export async function sendReceiptEmail(
  toEmail: string,
  studentName: string,
  receiptNumber: string,
  amount: number,
  paymentDate: string,
  branchName: string,
): Promise<{ sent: boolean; error?: string }> {
  if (!process.env.EMAIL_ENABLED || process.env.EMAIL_ENABLED !== 'true') {
    return { sent: false, error: 'Email not enabled' };
  }

  const transport = getTransporter();
  if (!transport) {
    return { sent: false, error: 'Email not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASS)' };
  }

  const fromName = process.env.EMAIL_FROM_NAME || 'Coffee aur Kitaab';

  const html = [
    `<div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd;">`,
    `<h2 style="color: #6B21A8;">Payment Receipt</h2>`,
    `<p>Dear <strong>${studentName}</strong>,</p>`,
    `<p>Your payment has been received and verified.</p>`,
    `<table style="width: 100%; border-collapse: collapse;">`,
    `<tr><td style="padding: 8px; color: #666;">Receipt No.</td><td style="padding: 8px;"><strong>${receiptNumber}</strong></td></tr>`,
    `<tr><td style="padding: 8px; color: #666;">Amount</td><td style="padding: 8px;"><strong>Rs ${amount.toLocaleString('en-IN')}</strong></td></tr>`,
    `<tr><td style="padding: 8px; color: #666;">Date</td><td style="padding: 8px;"><strong>${paymentDate}</strong></td></tr>`,
    `<tr><td style="padding: 8px; color: #666;">Branch</td><td style="padding: 8px;"><strong>${branchName}</strong></td></tr>`,
    `</table>`,
    `<p style="margin-top: 20px; color: #666; font-size: 12px;">Thank you for choosing ${fromName}.</p>`,
    `</div>`,
  ].join('\n');

  try {
    await transport.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Payment Receipt - ${receiptNumber} - ${fromName}`,
      html,
    });
    return { sent: true };
  } catch (error: any) {
    console.error('Send receipt email error:', error?.message ?? error);
    return { sent: false, error: error?.message ?? 'Failed to send email' };
  }
}
