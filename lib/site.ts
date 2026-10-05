/**
 * Public site facts used by the footer, legal pages and metadata.
 * Operator details come from NEXT_PUBLIC_* variables so the legal texts can
 * be completed on the VPS without touching the code.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL
  if (explicit) return explicit.replace(/\/$/, "")
  // On Vercel the production hostname is provided by the platform, so no
  // NEXT_PUBLIC_SITE_URL is needed there.
  const vercelHost =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL
  if (vercelHost) return `https://${vercelHost}`
  return "http://localhost:3000"
}

export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "bytoloto.com",
  url: resolveSiteUrl(),
  title: "bytoloto.com — моментальные лотереи онлайн",
  description:
    "Моментальные лотереи bytoloto.com: выберите числа, купите билет и сразу узнайте результат. Выигрыш мгновенно зачисляется на баланс.",
  operator: {
    name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "ООО «Лотери Промо»",
    // Left empty until the operator's own registration number is known; every
    // place that shows it hides the line instead of printing a placeholder.
    unp: process.env.NEXT_PUBLIC_OPERATOR_UNP ?? "",
    address:
      process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? "220030, Республика Беларусь, г. Минск, ул. Интернациональная, д. 36, пом. 4",
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@bytoloto.com",
    hours: process.env.NEXT_PUBLIC_SUPPORT_HOURS ?? "ежедневно с 9:00 до 21:00",
  },
  social: {
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "",
    vk: process.env.NEXT_PUBLIC_VK_URL ?? "",
  },
  /** Promotion period shown in the rules and on the landing page. */
  promoPeriod: { from: "01.08.2025", to: "31.12.2026" },
  legalUpdatedAt: "01.10.2026",
}

/** "УНП …, address" for legal texts, without the УНП part while it is unset. */
export const operatorRequisites = [site.operator.unp && `УНП ${site.operator.unp}`, site.operator.address]
  .filter(Boolean)
  .join(", ")

export const legalLinks = [
  { href: "/rules", label: "Правила акции" },
  { href: "/terms", label: "Публичная оферта" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/contacts", label: "Контакты" },
] as const
