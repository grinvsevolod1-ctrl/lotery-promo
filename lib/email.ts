import nodemailer, { type Transporter } from "nodemailer"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "lotery.by"

type MailInput = {
  to: string
  subject: string
  text: string
  html: string
}

let transporter: Transporter | null | undefined

function getTransporter() {
  if (transporter !== undefined) return transporter

  const host = process.env.SMTP_HOST
  if (!host) {
    transporter = null
    return transporter
  }

  const port = Number(process.env.SMTP_PORT ?? 587)
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  })
  return transporter
}

export async function sendMail(input: MailInput) {
  const transport = getTransporter()

  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST is not set: cannot send e-mail")
    }
    // Without SMTP in development the letter is printed to the server log so
    // the link can still be followed while testing.
    console.log(`[mail] SMTP не настроен, письмо для ${input.to}\n${input.subject}\n${input.text}`)
    return
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    ...input,
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return "&#39;"
    }
  })
}

function renderHtml({
  title,
  greeting,
  body,
  cta,
  url,
  note,
}: {
  title: string
  greeting: string
  body: string
  cta: string
  url: string
  note: string
}) {
  const safeUrl = escapeHtml(url)
  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:32px 16px;background:#f4f1fa;font-family:Inter,Arial,Helvetica,sans-serif;color:#1d1430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr>
        <td style="padding:28px 32px 8px;font-size:22px;font-weight:800;color:#2a0f4a;">${escapeHtml(SITE_NAME)}</td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;font-size:18px;font-weight:700;">${escapeHtml(title)}</td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;font-size:15px;line-height:1.55;">${escapeHtml(greeting)}</td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;font-size:15px;line-height:1.55;">${escapeHtml(body)}</td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#d8268f;color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;">${escapeHtml(cta)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px;font-size:13px;line-height:1.5;color:#5e5273;">Если кнопка не работает, скопируйте ссылку в адресную строку браузера:<br><a href="${safeUrl}" style="color:#d8268f;word-break:break-all;">${safeUrl}</a></td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px;font-size:13px;line-height:1.5;color:#5e5273;">${escapeHtml(note)}</td>
      </tr>
    </table>
  </body>
</html>`
}

export async function sendVerificationEmail({
  to,
  name,
  url,
}: {
  to: string
  name: string
  url: string
}) {
  const greeting = `Здравствуйте, ${name || "игрок"}!`
  const body = "Подтвердите адрес электронной почты, чтобы завершить регистрацию и войти в личный кабинет."
  const note = `Ссылка действует 24 часа. Если вы не регистрировались на ${SITE_NAME}, просто проигнорируйте это письмо.`

  await sendMail({
    to,
    subject: `Подтвердите e-mail — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\n${url}\n\n${note}`,
    html: renderHtml({
      title: "Подтверждение e-mail",
      greeting,
      body,
      cta: "Подтвердить e-mail",
      url,
      note,
    }),
  })
}

export async function sendPasswordResetEmail({
  to,
  name,
  url,
}: {
  to: string
  name: string
  url: string
}) {
  const greeting = `Здравствуйте, ${name || "игрок"}!`
  const body = "Мы получили запрос на смену пароля. Перейдите по ссылке, чтобы задать новый пароль."
  const note = "Ссылка действует 1 час. Если вы не запрашивали смену пароля, ничего делать не нужно — пароль останется прежним."

  await sendMail({
    to,
    subject: `Смена пароля — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\n${url}\n\n${note}`,
    html: renderHtml({
      title: "Смена пароля",
      greeting,
      body,
      cta: "Задать новый пароль",
      url,
      note,
    }),
  })
}
