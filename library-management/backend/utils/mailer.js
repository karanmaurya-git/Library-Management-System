import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Sends an email if SMTP is configured; otherwise logs it to the console
 * so the app still works fully in dev/demo without any email setup.
 */
export async function sendMail({ to, subject, text }) {
  if (!isConfigured) {
    console.log('\n--- 📧 EMAIL (SMTP not configured, logging only) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('--- end email ---\n');
    return { delivered: false, mode: 'console' };
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
    });
    return { delivered: true, mode: 'smtp' };
  } catch (err) {
    console.error('Failed to send email:', err.message);
    return { delivered: false, mode: 'error', error: err.message };
  }
}

export const emailIsConfigured = isConfigured;
