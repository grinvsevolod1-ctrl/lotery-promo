import nodemailer, { type Transporter } from "nodemailer"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { formatDateTime } from "@/lib/format"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "lotery.by"
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")

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
  // File outbox: used by the e2e tests (and handy for local debugging).
  const outbox = process.env.MAIL_OUTBOX_DIR
  if (outbox) {
    await mkdir(outbox, { recursive: true })
    const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`
    await writeFile(path.join(outbox, file), JSON.stringify({ ...input, sentAt: new Date().toISOString() }, null, 2))
    return
  }

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

export function escapeHtml(value: string) {
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

// ─── Branded layout ───────────────────────────────────────────────────

const COLORS = {
  page: "#f3eefa",
  card: "#ffffff",
  violet: "#2a0f4a",
  ink: "#1d1430",
  body: "#3b2f52",
  muted: "#7a6d90",
  pink: "#d8268f",
  gold: "#e0b64a",
}

const FONT = "Inter,-apple-system,'Segoe UI',Roboto,Arial,Helvetica,sans-serif"

function paragraph(html: string, extra = "") {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${COLORS.body};${extra}">${html}</p>`
}

/** Lottery balls as inline circles; matched ones are gold. */
export function ballsHtml(numbers: readonly number[], highlight: ReadonlySet<number> = new Set()) {
  return numbers
    .map((n) => {
      const hit = highlight.has(n)
      const bg = hit ? COLORS.gold : COLORS.violet
      const fg = hit ? COLORS.violet : "#ffffff"
      return `<span style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:18px;margin:3px;background:${bg};color:${fg};font-size:15px;font-weight:800;text-align:center;font-family:${FONT};">${n}</span>`
    })
    .join("")
}

export function renderLayout({
  title,
  preheader,
  content,
  cta,
  note,
}: {
  title: string
  preheader: string
  content: string
  cta?: { label: string; url: string }
  note?: string
}) {
  const button = cta
    ? `<tr><td style="padding:8px 32px 20px;">
        <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${COLORS.pink};color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;font-family:${FONT};">${escapeHtml(cta.label)}</a>
      </td></tr>
      <tr><td style="padding:0 32px;font-size:13px;line-height:1.5;color:${COLORS.muted};">Если кнопка не работает, скопируйте ссылку в адресную строку браузера:<br><a href="${escapeHtml(cta.url)}" style="color:${COLORS.pink};word-break:break-all;">${escapeHtml(cta.url)}</a></td></tr>`
    : ""

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:32px 16px;background:${COLORS.page};font-family:${FONT};color:${COLORS.ink};">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${COLORS.card};border-radius:20px;overflow:hidden;">
      <tr>
        <td style="padding:22px 32px;background:${COLORS.violet};font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${escapeHtml(SITE_NAME).replace(/\.by$/, "")}<span style="color:${COLORS.gold};">.by</span></td>
      </tr>
      <tr>
        <td style="padding:28px 32px 8px;font-size:20px;font-weight:800;color:${COLORS.ink};">${escapeHtml(title)}</td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;">${content}</td>
      </tr>
      ${button}
      <tr>
        <td style="padding:24px 32px 8px;font-size:13px;line-height:1.5;color:${COLORS.muted};">${note ? escapeHtml(note) : ""}</td>
      </tr>
      <tr>
        <td style="padding:8px 32px 28px;font-size:12px;line-height:1.5;color:${COLORS.muted};border-top:1px solid #ece6f5;">Вы получили это письмо, потому что зарегистрированы на <a href="${SITE_URL}" style="color:${COLORS.muted};">${escapeHtml(SITE_NAME)}</a>. Участие — только для лиц старше 18 лет. Играйте ответственно.<br>Настройки аккаунта: <a href="${SITE_URL}/cabinet/profile" style="color:${COLORS.muted};">${SITE_URL}/cabinet/profile</a></td>
      </tr>
    </table>
  </body>
</html>`
}

function greet(name: string) {
  return `Здравствуйте, ${name || "игрок"}!`
}

// ─── Letters ──────────────────────────────────────────────────────────

export async function sendVerificationEmail({ to, name, url }: { to: string; name: string; url: string }) {
  const greeting = greet(name)
  const body = "Подтвердите адрес электронной почты, чтобы завершить регистрацию и войти в личный кабинет."
  const note = `Ссылка действует 24 часа. Если вы не регистрировались на ${SITE_NAME}, просто проигнорируйте это письмо.`

  await sendMail({
    to,
    subject: `Подтвердите e-mail — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\n${url}\n\n${note}`,
    html: renderLayout({
      title: "Подтверждение e-mail",
      preheader: body,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(body)),
      cta: { label: "Подтвердить e-mail", url },
      note,
    }),
  })
}

export async function sendPasswordResetEmail({ to, name, url }: { to: string; name: string; url: string }) {
  const greeting = greet(name)
  const body = "Мы получили запрос на смену пароля. Перейдите по ссылке, чтобы задать новый пароль."
  const note = "Ссылка действует 1 час. Если вы не запрашивали смену пароля, ничего делать не нужно — пароль останется прежним."

  await sendMail({
    to,
    subject: `Смена пароля — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\n${url}\n\n${note}`,
    html: renderLayout({
      title: "Смена пароля",
      preheader: body,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(body)),
      cta: { label: "Задать новый пароль", url },
      note,
    }),
  })
}

export async function sendChangeEmailConfirmation({
  to,
  name,
  newEmail,
  url,
}: {
  to: string
  name: string
  newEmail: string
  url: string
}) {
  const greeting = greet(name)
  const body = `Вы запросили смену e-mail на ${newEmail}. Подтвердите изменение — после этого на новый адрес придёт письмо для его проверки.`
  const note = "Если вы не запрашивали смену адреса, не переходите по ссылке и смените пароль в профиле."

  await sendMail({
    to,
    subject: `Подтвердите смену e-mail — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\n${url}\n\n${note}`,
    html: renderLayout({
      title: "Смена e-mail",
      preheader: body,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(body)),
      cta: { label: "Подтвердить смену", url },
      note,
    }),
  })
}

export async function sendDeleteAccountEmail({ to, name, url }: { to: string; name: string; url: string }) {
  const greeting = greet(name)
  const body = "Вы запросили удаление аккаунта. Перейдите по ссылке, чтобы подтвердить удаление: билеты, бонусы и история будут удалены безвозвратно."
  const note = "Ссылка действует 24 часа. Если вы передумали — просто проигнорируйте письмо."

  await sendMail({
    to,
    subject: `Удаление аккаунта — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\n${url}\n\n${note}`,
    html: renderLayout({
      title: "Удаление аккаунта",
      preheader: body,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(body)),
      cta: { label: "Удалить аккаунт", url },
      note,
    }),
  })
}

export type ResultTicket = {
  id: number
  game: string
  numbers: number[]
  matches: number
  prize: number
}

export async function sendDrawResultsEmail({
  to,
  name,
  drawId,
  drawAt,
  winning,
  tickets,
}: {
  to: string
  name: string
  drawId: number
  drawAt: Date
  winning: number[]
  tickets: ResultTicket[]
}) {
  const total = tickets.reduce((sum, t) => sum + t.prize, 0)
  const won = total > 0
  const when = formatDateTime(drawAt)
  const winningSet = new Set(winning)
  const greeting = greet(name)

  const subject = won
    ? `Тираж №${drawId}: вы выиграли ${total} BYN — ${SITE_NAME}`
    : `Тираж №${drawId}: итоги — ${SITE_NAME}`

  const intro = won
    ? `Поздравляем! В тираже №${drawId} от ${when} ваши билеты принесли ${total} BYN бонусов. Сумма уже зачислена на баланс.`
    : `Тираж №${drawId} от ${when} состоялся. На этот раз без выигрыша — но следующий розыгрыш уже завтра в 20:00.`

  const ticketsHtml = tickets
    .map((t) => {
      const result = t.prize > 0 ? `<strong style="color:${COLORS.pink};">+${t.prize} BYN</strong>` : `<span style="color:${COLORS.muted};">без выигрыша</span>`
      return `<tr>
        <td style="padding:10px 0;border-top:1px solid #ece6f5;font-size:14px;color:${COLORS.body};">
          <div style="font-weight:700;color:${COLORS.ink};">${escapeHtml(t.game)} · билет #${t.id}</div>
          <div style="margin:6px 0 4px;">${ballsHtml(t.numbers, winningSet)}</div>
          <div>Совпадений: ${t.matches} · ${result}</div>
        </td>
      </tr>`
    })
    .join("")

  const content =
    paragraph(escapeHtml(greeting)) +
    paragraph(escapeHtml(intro)) +
    paragraph(`<strong>Выигрышная комбинация:</strong>`, "margin-bottom:6px") +
    `<div style="margin:0 -3px 18px;">${ballsHtml(winning)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ticketsHtml}</table>`

  const textTickets = tickets
    .map((t) => `${t.game} · билет #${t.id}: ${t.numbers.join(", ")} — совпадений ${t.matches}, ${t.prize > 0 ? `+${t.prize} BYN` : "без выигрыша"}`)
    .join("\n")

  await sendMail({
    to,
    subject,
    text: `${greeting}\n\n${intro}\n\nВыигрышная комбинация: ${winning.join(", ")}\n\n${textTickets}\n\n${SITE_URL}/cabinet`,
    html: renderLayout({
      title: won ? `Вы выиграли ${total} BYN` : `Итоги тиража №${drawId}`,
      preheader: intro,
      content,
      cta: { label: won ? "Открыть кабинет" : "Купить билет на следующий тираж", url: `${SITE_URL}/cabinet` },
      note: "Бонусы начисляются в личный кабинет и могут быть использованы для покупки билетов.",
    }),
  })
}
