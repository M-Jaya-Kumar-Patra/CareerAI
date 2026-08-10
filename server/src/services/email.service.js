import { env } from '../config/env.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function buildTemplate({ title, preheader, headline, body, footerText }) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#07111f;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e2ebff;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#07111f;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="620" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;background:linear-gradient(135deg,#0f172a 0%,#111c34 100%);border:1px solid rgba(125,211,252,0.25);border-radius:20px;overflow:hidden;">
              <tr>
                <td style="padding:28px 32px 18px;">
                  <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(125,211,252,0.25);border-radius:999px;background:rgba(15,23,42,0.8);font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#7dd3fc;">CareerAI</div>
                  <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#f8fbff;">${headline}</h1>
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#9eb4d7;">${preheader}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 24px;">
                  <div style="background:rgba(10,17,31,0.75);border:1px solid rgba(125,211,252,0.2);border-radius:16px;padding:24px;">
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#e2ebff;">${body}</p>
                    <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:rgba(54,211,153,0.14);border:1px solid rgba(54,211,153,0.25);color:#d1fae5;font-size:15px;font-weight:600;">${footerText}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export async function sendAuthEmail({ to, subject, headline, body, footerText }) {
  const from = env.RESEND_FROM_EMAIL;
  if (!env.RESEND_API_KEY || !from) {
    return { ok: false, skipped: true, reason: 'resend-not-configured' };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: buildTemplate({ title: subject, preheader: body, headline, body, footerText }),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${detail}`);
  }

  return { ok: true, response: await response.json() };
}
