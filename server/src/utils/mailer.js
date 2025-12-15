import nodemailer from "nodemailer";

export function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendMail({ to, subject, html }) {
  const tx = getTransport();
  if (!tx) {
    console.log("📧 Email not configured. Would send to:", to);
    console.log("Subject:", subject);
    console.log("HTML:", html);
    return;
  }
  await tx.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
