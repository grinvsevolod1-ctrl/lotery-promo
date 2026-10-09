import nodemailer, { type Transporter } from "nodemailer"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { formatDateTime } from "@/lib/format"
import { captureMail, firstLink, mailTestMode } from "@/lib/mail-capture"
import { site } from "@/lib/site"

const SITE_NAME = site.name
const SITE_URL = site.url

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
  // A pooled connection removes the TLS+AUTH handshake from every letter, and
  // the rate limit keeps bursts (broadcasts) below Gmail's throttling threshold,
  // which otherwise delays or silently drops messages.
  transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 3,
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  })
  return transporter
}

const MAIL_DOMAIN = (() => {
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER ?? ""
  return from.match(/@([^>\s]+)/)?.[1] ?? new URL(SITE_URL).hostname
})()

function isPermanentSmtpError(error: unknown) {
  const err = error as { code?: string; responseCode?: number }
  if (err?.code === "EAUTH" || err?.code === "EENVELOPE") return true
  return typeof err?.responseCode === "number" && err.responseCode >= 500 && err.responseCode < 600
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function sendMail(input: MailInput) {
  if (mailTestMode) {
    const captured = captureMail({ to: input.to, subject: input.subject, url: firstLink(input.text) })
    if (!captured) console.info(`[mail] test mode: letter "${input.subject}" for ${input.to} was not sent`)
    return
  }

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
    // Resend HTTP API: the transport for Vercel, where there is no SMTP relay.
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(input)
      return
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("Neither SMTP_HOST nor RESEND_API_KEY is set: cannot send e-mail")
    }
    // Without SMTP in development the letter is printed to the server log so
    // the link can still be followed while testing.
    console.log(`[mail] SMTP не настроен, письмо для ${input.to}\n${input.subject}\n${input.text}`)
    return
  }

  const headers: Record<string, string> = {
    "X-Entity-Ref-ID": crypto.randomUUID(),
    "List-Unsubscribe": `<mailto:${site.operator.email}?subject=unsubscribe>, <${SITE_URL}/cabinet/profile>`,
  }
  const message = {
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    replyTo: site.operator.email,
    messageId: `<${crypto.randomUUID()}@${MAIL_DOMAIN}>`,
    date: new Date(),
    headers,
    ...input,
  }

  const started = Date.now()
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const info = await transport.sendMail(message)
      console.info(`[mail] sent "${input.subject}" to ${input.to} in ${Date.now() - started}ms (${info.response ?? "ok"})`)
      return
    } catch (error) {
      const permanent = isPermanentSmtpError(error)
      console.error(`[mail] attempt ${attempt} failed for ${input.to}: ${(error as Error).message}`)
      if (permanent || attempt === 3) throw error
      await sleep(attempt * 2000)
    }
  }
}

const RESEND_SANDBOX_FROM = `${SITE_NAME} <onboarding@resend.dev>`

/** What the admin needs to judge deliverability: which transport is used and from which sender. */
export function getMailStatus() {
  const transport = process.env.SMTP_HOST ? "smtp" : process.env.RESEND_API_KEY ? "resend" : "none"
  const from = process.env.MAIL_FROM ?? (transport === "smtp" ? (process.env.SMTP_USER ?? "") : RESEND_SANDBOX_FROM)
  const sandbox = transport === "resend" && /@resend\.dev\b/i.test(from)
  const senderDomain = from.match(/@([^>\s]+)/)?.[1] ?? null
  return { transport, from, sandbox, senderDomain, replyTo: site.operator.email }
}

async function sendViaResend(input: MailInput) {
  // Without a verified domain Resend only accepts its sandbox sender, and
  // delivers solely to the e-mail of the Resend account owner.
  const from = process.env.MAIL_FROM ?? RESEND_SANDBOX_FROM
  if (!process.env.MAIL_FROM) {
    console.warn("[mail] MAIL_FROM не задан: письма уходят с тестового адреса resend.dev и попадают в спам")
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: site.operator.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })

  if (!response.ok) {
    // Resend explains the refusal (unverified domain, sandbox recipient
    // restriction, rate limit) in the body; keep that server-side only.
    const detail = await response.text().catch(() => "")
    console.error(`[mail] Resend rejected the letter for ${input.to}: HTTP ${response.status} ${detail}`)
    throw new Error("E-mail delivery failed")
  }
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
  page: "#edeff1",
  card: "#ffffff",
  violet: "#161a22",
  ink: "#161a22",
  body: "#3a404c",
  muted: "#5e6470",
  pink: "#ff6416",
  gold: "#ff6416",
  blue: "#1f5be0",
  line: "#e6e8ec",
}

/** The site's wordmark (BY TO!LOTO) rebuilt in table-safe inline HTML. */
const LOGO_HTML = `<a href="${SITE_URL}" style="text-decoration:none;font-family:${"Inter,-apple-system,'Segoe UI',Roboto,Arial,Helvetica,sans-serif"};font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;line-height:1;"><span style="font-size:14px;color:${"#1f5be0"};margin-right:2px;">by</span><span style="font-size:26px;color:${"#ff6416"};">to!</span><span style="font-size:26px;color:${"#1f5be0"};">loto</span></a>`

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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${COLORS.card};border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(22,26,34,0.08);">
      <tr>
        <td style="padding:26px 32px 22px;background:${COLORS.card};border-bottom:1px solid ${COLORS.line};">${LOGO_HTML}</td>
      </tr>
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${COLORS.pink};">&nbsp;</td></tr>
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
        <td style="padding:8px 32px 28px;font-size:12px;line-height:1.5;color:${COLORS.muted};border-top:1px solid #ece6f5;">Вы получили это письмо, потому что зарегистрированы на <a href="${SITE_URL}" style="color:${COLORS.muted};">${escapeHtml(SITE_NAME)}</a>. Участие — только для лиц старше 18 лет. Играйте ответственно.<br>Настройки аккаун��а: <a href="${SITE_URL}/cabinet/profile" style="color:${COLORS.muted};">${SITE_URL}/cabinet/profile</a></td>
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

export async function sendSupportReceivedEmail({
  to,
  name,
  id,
  topic,
  message,
}: {
  to: string
  name: string
  id: number
  topic: string
  message: string
}) {
  const greeting = greet(name)
  const body = `Ваше обращение №${id} зарегистрирован��. Специалист поддержки уже получил его и ответит на этот адрес.`
  const quote = `<div style="margin:4px 0 18px;padding:14px 16px;border-radius:14px;background:${COLORS.page};font-size:14px;line-height:1.55;color:${COLORS.body};"><div style="font-weight:700;color:${COLORS.ink};margin-bottom:6px;">${escapeHtml(topic)}</div>${escapeHtml(message).replace(/\n/g, "<br>")}</div>`

  await sendMail({
    to,
    subject: `Обращение №${id} зарегистрировано — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}\n\nТема: ${topic}\n${message}\n\n${SITE_URL}/cabinet/support`,
    html: renderLayout({
      title: `Обращение №${id} принято`,
      preheader: body,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(body)) + quote,
      cta: { label: "Мои обращения", url: `${SITE_URL}/cabinet/support` },
      note: "Обычно отвечаем в течение нескольких часов. Не пересылайте в обращении коды из SMS и CVC карты.",
    }),
  })
}

export async function sendSupportReplyEmail({
  to,
  name,
  id,
  topic,
  reply,
}: {
  to: string
  name: string
  id: number
  topic: string
  reply: string
}) {
  const greeting = greet(name)
  const intro = `Ответ на ваше обращение №${id} (${topic}).`
  const answer = `<div style="margin:4px 0 18px;padding:16px 18px;border-radius:14px;background:${COLORS.page};font-size:15px;line-height:1.6;color:${COLORS.ink};">${escapeHtml(reply).replace(/\n/g, "<br>")}</div>`

  await sendMail({
    to,
    subject: `Ответ на обращение №${id} — ${SITE_NAME}`,
    text: `${greeting}\n\n${intro}\n\n${reply}\n\n${SITE_URL}/cabinet/support`,
    html: renderLayout({
      title: `Ответ на обращение №${id}`,
      preheader: reply.slice(0, 110),
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(intro)) + answer,
      cta: { label: "Открыть обращения", url: `${SITE_URL}/cabinet/support` },
      note: "Если остались вопросы, напишите новое обращение в личном кабинете или ответьте на это письмо.",
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

export type FundingMailKind =
  | "deposit_requested"
  | "deposit_approved"
  | "deposit_rejected"
  | "withdrawal_requested"
  | "withdrawal_approved"
  | "withdrawal_rejected"

type FundingMailInput = {
  to: string
  name: string
  kind: FundingMailKind
  id: number
  amount: number
  /** Human-readable payment method: "Карта •••• 1234", "USDT (TRC20)". */
  method?: string | null
  /** Admin's reason for a rejection. */
  reason?: string | null
}

const FUNDING_COPY: Record<
  FundingMailKind,
  {
    subject: (id: number, sum: string) => string
    title: (sum: string) => string
    badge: string
    tone: "ok" | "wait" | "bad"
    intro: (id: number, sum: string) => string
    note: string
    cta: { label: string; path: string }
  }
> = {
  deposit_requested: {
    subject: (id) => `Заявка на пополнение №${id} принята`,
    title: () => "Заявка на пополнение принята",
    badge: "В обработке",
    tone: "wait",
    intro: (id, sum) => `Мы получили заявку №${id} на пополнение баланса на ${sum}. Как только платёж будет подтверждён, деньги появятся на игровом балансе — мы сообщим отдельным письмом.`,
    note: "Обычно проверка занимает несколько минут. Статус заявки всегда можно посмотреть в личном кабинете.",
    cta: { label: "Открыть кабинет", path: "/cabinet/deposit" },
  },
  deposit_approved: {
    subject: (_id, sum) => `Баланс пополнен на ${sum}`,
    title: (sum) => `Баланс пополнен на ${sum}`,
    badge: "Зачислено",
    tone: "ok",
    intro: (id, sum) => `Заявка №${id} подтверждена: ${sum} уже на вашем игровом балансе. За пополнение может быть доступен бонус — загляните в раздел «Бонусы».`,
    note: "Если сумма не совпадает с ожидаемой, напишите нам в поддержку — мы разберёмся.",
    cta: { label: "Перейти к играм", path: "/play" },
  },
  deposit_rejected: {
    subject: (id) => `Пополнение №${id} не прошло`,
    title: () => "Пополнение не прошло",
    badge: "Отклонено",
    tone: "bad",
    intro: (id, sum) => `К сожалению, заявка №${id} на пополнение ${sum} отклонена, деньги на баланс не зачислены.`,
    note: "Попробуйте другую карту или пополнение криптовалютой. Если списание всё же произошло, нап��шите в поддержку — вернём деньги.",
    cta: { label: "Пополнить снова", path: "/cabinet/deposit" },
  },
  withdrawal_requested: {
    subject: (id) => `Заявка на вывод №${id} принята`,
    title: () => "Заявка на вывод принята",
    badge: "В обработке",
    tone: "wait",
    intro: (id, sum) => `Заявка №${id} на вывод ${sum} принята. Сумма зарезервирована на балансе до решения, потратить её на билеты в это время нельзя.`,
    note: "Мы сообщим о результате отдельным письмом. Если вы не создавали эту заявку, срочно смените пароль и напишите в поддержку.",
    cta: { label: "Статус заявки", path: "/cabinet/deposit?tab=withdraw" },
  },
  withdrawal_approved: {
    subject: (_id, sum) => `Вывод ${sum} отправлен`,
    title: (sum) => `Вывод ${sum} отправлен`,
    badge: "Выплачено",
    tone: "ok",
    intro: (id, sum) => `Заявка №${id} подтверждена: ${sum} отправлены на указанные реквизиты.`,
    note: "Зачисление на карту может занять до нескольких банковских дней, на кошелёк — несколько минут после подтверждения сети.",
    cta: { label: "Открыть кабинет", path: "/cabinet" },
  },
  withdrawal_rejected: {
    subject: (id) => `Вывод №${id} отклонён`,
    title: () => "Вывод отклонён",
    badge: "Отклонено",
    tone: "bad",
    intro: (id, sum) => `Заявка №${id} на вывод ${sum} отклонена. Зарезервированная сумма уже возвращена на ваш игровой баланс.`,
    note: "Проверьте реквизиты и создайте новую заявку. Если причина непонятна, напишите в поддержку.",
    cta: { label: "Создать новую заявку", path: "/cabinet/deposit?tab=withdraw" },
  },
}

const TONE_COLORS = {
  ok: { bg: "#e4f6ec", fg: "#12703f" },
  wait: { bg: "#fff1e6", fg: "#c2480a" },
  bad: { bg: "#fde8e8", fg: "#b42318" },
} as const

function formatSum(amount: number) {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} BYN`
}

export async function sendFundingEmail({ to, name, kind, id, amount, method, reason }: FundingMailInput) {
  const copy = FUNDING_COPY[kind]
  const sum = formatSum(amount)
  const greeting = greet(name)
  const intro = copy.intro(id, sum)
  const tone = TONE_COLORS[copy.tone]
  const url = `${SITE_URL}${copy.cta.path}`

  const rows: Array<[string, string]> = [
    ["Заявка", `№${id}`],
    ["Сумма", sum],
  ]
  if (method) rows.push([kind.startsWith("deposit") ? "Способ пополнения" : "Способ вывода", method])
  if (reason) rows.push(["Причина", reason])

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 0;border-top:1px solid ${COLORS.line};font-size:13px;color:${COLORS.muted};width:42%;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-top:1px solid ${COLORS.line};font-size:14px;font-weight:700;color:${COLORS.ink};text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("")

  const summary = `<div style="margin:4px 0 18px;padding:18px 20px;border-radius:16px;background:${COLORS.page};">
    <div style="margin-bottom:10px;"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;font-family:${FONT};">${escapeHtml(copy.badge)}</span></div>
    <div style="font-size:30px;line-height:1.1;font-weight:900;color:${COLORS.ink};font-family:${FONT};">${escapeHtml(sum)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">${rowsHtml}</table>
  </div>`

  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n")

  await sendMail({
    to,
    subject: `${copy.subject(id, sum)} — ${SITE_NAME}`,
    text: `${greeting}\n\n${intro}\n\n${textRows}\n\n${url}\n\n${copy.note}`,
    html: renderLayout({
      title: copy.title(sum),
      preheader: intro,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(intro)) + summary,
      cta: { label: copy.cta.label, url },
      note: copy.note,
    }),
  })
}

export type JobMailKind = "received" | "approved" | "rejected"

const JOB_COPY: Record<JobMailKind, { subject: string; title: string; badge: string; tone: "ok" | "wait" | "bad"; intro: (vacancy: string) => string; note: string }> = {
  received: {
    subject: "Анкета принята — ожидайте одобрения",
    title: "Анкета принята",
    badge: "Ожидайте одобрения",
    tone: "wait",
    intro: (vacancy) =>
      `Ваша анкета на вакансию «${vacancy}» принята, личность подтверждена. Мы изучим резюме и напишем на этот адрес — обычно в течение нескольких рабочих дней.`,
    note: "Статус анкеты можно посмотреть по ссылке в любое время. Если у вас изменились контакты, ответьте на это письмо.",
  },
  approved: {
    subject: "Анкета одобрена",
    title: "Анкета одобрена",
    badge: "Одобрена",
    tone: "ok",
    intro: (vacancy) => `Поздравляем! Ваша анкета на вакансию «${vacancy}» одобрена. В ближайшее время с вами свяжется HR-специалист, чтобы договориться о собеседовании.`,
    note: "Если письмо с приглашением не придёт в течение трёх рабочих дней, ответьте на это сообщение.",
  },
  rejected: {
    subject: "Решение по анкете",
    title: "Анкета отклонена",
    badge: "Отклонена",
    tone: "bad",
    intro: (vacancy) => `Спасибо за интерес к вакансии «${vacancy}». К сожалению, сейчас мы не готовы продолжить. Мы сохраним анкету и вернёмся к ней, когда появятся подходящие позиции.`,
    note: "Вы можете откликнуться на другие вакансии на jobs.bytoloto.com.",
  },
}

/** Letters to a job applicant; there is no account, so the status page is reached by the token link. */
export async function sendJobApplicationEmail({
  to,
  name,
  kind,
  id,
  vacancy,
  statusUrl,
  reason,
}: {
  to: string
  name: string
  kind: JobMailKind
  id: number
  vacancy: string
  statusUrl: string
  reason?: string | null
}) {
  const copy = JOB_COPY[kind]
  const greeting = greet(name)
  const intro = copy.intro(vacancy)
  const tone = TONE_COLORS[copy.tone]
  const rows: Array<[string, string]> = [
    ["Анкета", `№${id}`],
    ["Вакансия", vacancy],
  ]
  if (reason) rows.push(["Комментарий", reason])
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 0;border-top:1px solid ${COLORS.line};font-size:13px;color:${COLORS.muted};width:42%;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-top:1px solid ${COLORS.line};font-size:14px;font-weight:700;color:${COLORS.ink};text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("")
  const summary = `<div style="margin:4px 0 18px;padding:18px 20px;border-radius:16px;background:${COLORS.page};">
    <div style="margin-bottom:10px;"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;font-family:${FONT};">${escapeHtml(copy.badge)}</span></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${rowsHtml}</table>
  </div>`

  await sendMail({
    to,
    subject: `${copy.subject} — ${SITE_NAME}`,
    text: `${greeting}\n\n${intro}\n\n${rows.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\n${statusUrl}\n\n${copy.note}`,
    html: renderLayout({
      title: copy.title,
      preheader: intro,
      content: paragraph(escapeHtml(greeting)) + paragraph(escapeHtml(intro)) + summary,
      cta: { label: "Открыть статус анкеты", url: statusUrl },
      note: copy.note,
    }),
  })
}

/** Free-form letter from the operator: balance credits, verification requests, promo broadcasts. */
export async function sendAdminMessageEmail({
  to,
  name,
  title,
  body,
  cta,
}: {
  to: string
  name: string
  title: string
  body: string
  cta?: { label: string; url: string }
}) {
  const greeting = greet(name)
  const paragraphs = body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const url = cta ? (cta.url.startsWith("http") ? cta.url : `${SITE_URL}${cta.url}`) : undefined
  await sendMail({
    to,
    subject: `${title} — ${SITE_NAME}`,
    text: `${greeting}\n\n${body}${url ? `\n\n${url}` : ""}`,
    html: renderLayout({
      title,
      preheader: paragraphs[0] ?? title,
      content:
        paragraph(escapeHtml(greeting)) +
        paragraphs.map((part) => paragraph(escapeHtml(part).replace(/\n/g, "<br>"))).join(""),
      cta: cta && url ? { label: cta.label, url } : undefined,
    }),
  })
}
