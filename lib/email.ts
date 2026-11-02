// Transactional email over SMTP (nodemailer).
// Inert until SMTP_HOST / SMTP_USER / SMTP_PASS / EMAIL_FROM are set — like push without VAPID keys.
import nodemailer, { type Transporter } from 'nodemailer'

type Mail = { to: string | string[]; subject: string; html: string; replyTo?: string }

const BRAND = 'Gemini Nexus'

export function emailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM)
}

let transporter: Transporter | null = null
function getTransporter() {
  if (transporter) return transporter
  const port = Number(process.env.SMTP_PORT || 587)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // secure=true for 465 (implicit TLS); false for 587/25 (STARTTLS). Overridable via SMTP_SECURE.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

function wrap(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#06121d;padding:28px">
    <div style="max-width:520px;margin:0 auto;background:#0b1a28;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.08);color:#67e8f9;font-weight:700;letter-spacing:.14em;font-size:12px;text-transform:uppercase">${BRAND}</div>
      <div style="padding:24px;color:#e2e8f0">
        <h1 style="margin:0 0 12px;font-size:20px;color:#fff">${title}</h1>
        <div style="font-size:14px;line-height:1.6;color:#cbd5e1">${bodyHtml}</div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,.08);color:#64748b;font-size:11px">You received this because you have a ${BRAND} account. Reply to this email to reach us.</div>
    </div>
  </div>`
}

export async function sendEmail(mail: Mail): Promise<boolean> {
  if (!emailConfigured()) return false
  const to = Array.isArray(mail.to) ? mail.to.filter(Boolean) : [mail.to].filter(Boolean)
  if (to.length === 0) return false
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: mail.subject,
      html: wrap(mail.subject, mail.html),
      replyTo: mail.replyTo || process.env.EMAIL_REPLY_TO || undefined,
    })
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}
