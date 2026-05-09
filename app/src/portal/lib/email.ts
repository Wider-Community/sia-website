const API_BASE = "/api";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const resp = await fetch(`${API_BASE}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error: string }).error ?? `Email failed: ${resp.status}`);
  }

  return resp.json() as Promise<{ id: string }>;
}

export function buildSigningRequestEmail(params: {
  signerName: string;
  documentTitle: string;
  signingLink: string;
  message?: string;
  senderName?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E;">
  <div style="border-bottom: 2px solid #C8A951; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #1C1C1E;">SIA Platform</h1>
  </div>
  <p style="font-size: 16px;">Hello ${params.signerName},</p>
  <p style="font-size: 16px;">You have been requested to sign the document <strong>"${params.documentTitle}"</strong>${params.senderName ? ` by ${params.senderName}` : ""}.</p>
  ${params.message ? `<p style="font-size: 14px; color: #6B7280; background: #F9FAFB; padding: 12px; border-radius: 8px;">${params.message}</p>` : ""}
  <div style="text-align: center; margin: 32px 0;">
    <a href="${params.signingLink}" style="background: #C8A951; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Review & Sign Document</a>
  </div>
  <p style="font-size: 14px; color: #6B7280;">This link will expire in 30 days. If you have questions, please contact the sender directly.</p>
  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
  <p style="font-size: 12px; color: #9CA3AF;">This email was sent via the SIA Platform. If you did not expect this request, you can safely ignore this email.</p>
</body>
</html>`.trim();
}

export function buildReminderEmail(params: {
  signerName: string;
  documentTitle: string;
  signingLink: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E;">
  <div style="border-bottom: 2px solid #C8A951; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #1C1C1E;">SIA Platform</h1>
  </div>
  <p style="font-size: 16px;">Hello ${params.signerName},</p>
  <p style="font-size: 16px;">This is a reminder that you have a pending signature request for <strong>"${params.documentTitle}"</strong>.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${params.signingLink}" style="background: #C8A951; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Review & Sign Document</a>
  </div>
  <p style="font-size: 14px; color: #6B7280;">This link will expire in 30 days.</p>
  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
  <p style="font-size: 12px; color: #9CA3AF;">This email was sent via the SIA Platform.</p>
</body>
</html>`.trim();
}
