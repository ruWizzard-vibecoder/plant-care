/**
 * Email sending via Resend REST API.
 *
 * api.resend.com is reachable directly from the host, so no
 * ssh-proxy is needed here — unlike the Anthropic/Gemini calls.
 *
 * All sending is gated on RESEND_API_KEY: if it's absent, sends are no-ops and
 * auth.ts keeps email verification disabled, so the app works without email.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const FROM = process.env.EMAIL_FROM || "Plant Care <noreply@a-van.info>";
const APP_NAME = "Plant Care";
const LEAF = "#1B5E20";

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, text);
    throw new Error(`Email send failed (${res.status})`);
  }
}

/** Shared branded HTML shell. */
function layout(opts: { title: string; body: string; button?: { label: string; url: string }; footer?: string }): string {
  const button = opts.button
    ? `<tr><td style="padding:8px 0 24px;">
         <a href="${opts.button.url}" style="display:inline-block;background:${LEAF};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:14px;">${opts.button.label}</a>
       </td></tr>`
    : "";
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#f2f7f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f7f2;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#fff;border-radius:20px;padding:32px;">
          <tr><td style="padding-bottom:20px;">
            <span style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:12px;background:${LEAF};color:#fff;font-size:20px;">🌿</span>
            <span style="font-size:18px;font-weight:700;vertical-align:middle;margin-left:8px;">${APP_NAME}</span>
          </td></tr>
          <tr><td style="font-size:20px;font-weight:700;padding-bottom:12px;">${opts.title}</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#333;padding-bottom:20px;">${opts.body}</td></tr>
          ${button}
          <tr><td style="font-size:12px;color:#999;line-height:1.5;border-top:1px solid #eee;padding-top:16px;">
            ${opts.footer ?? `Если вы не запрашивали это письмо, просто проигнорируйте его.`}
          </td></tr>
        </table>
        <table role="presentation" width="100%" style="max-width:460px;"><tr><td style="text-align:center;font-size:11px;color:#bbb;padding-top:16px;">${APP_NAME} · plant.a-van.info</td></tr></table>
      </td></tr>
    </table>
  </body></html>`;
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  const html = layout({
    title: "Подтвердите email",
    body: "Спасибо за регистрацию! Подтвердите адрес электронной почты, чтобы начать пользоваться приложением и заботиться о своих растениях.",
    button: { label: "Подтвердить email", url },
    footer: "Ссылка действует ограниченное время. Если вы не создавали аккаунт, проигнорируйте это письмо.",
  });
  await send(to, "Подтвердите email — Plant Care", html);
}

export async function sendResetPasswordEmail(to: string, url: string): Promise<void> {
  const html = layout({
    title: "Сброс пароля",
    body: "Вы запросили смену пароля. Нажмите кнопку ниже, чтобы задать новый пароль. Если это были не вы — пароль останется прежним.",
    button: { label: "Задать новый пароль", url },
    footer: "Ссылка действует ограниченное время. Если вы не запрашивали сброс, проигнорируйте это письмо.",
  });
  await send(to, "Сброс пароля — Plant Care", html);
}
