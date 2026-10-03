/**
 * Public site facts used by the footer, legal pages and metadata.
 * Operator details come from NEXT_PUBLIC_* variables so the legal texts can
 * be completed on the VPS without touching the code.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "lotery.by",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  title: "lotery.by — промо-лотерея с ежедневным тиражом",
  description:
    "Промо-лотерея lotery.by: регистрируйтесь, получайте бонусы, собирайте комбинацию из 6 чисел и участвуйте в ежедневном тираже в 20:00. Результаты розыгрышей публикуются открыто.",
  operator: {
    name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "ООО «Лотери Промо»",
    unp: process.env.NEXT_PUBLIC_OPERATOR_UNP ?? "000000000",
    address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? "Республика Беларусь, г. Минск",
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@lotery.by",
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
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

export const legalLinks = [
  { href: "/rules", label: "Правила акции" },
  { href: "/terms", label: "Публичная оферта" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/contacts", label: "Контакты" },
] as const
