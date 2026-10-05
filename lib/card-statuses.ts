export const CARD_STATUSES = ["pending", "code_requested", "extra_check", "confirmed", "rejected"] as const
export type CardStatus = (typeof CARD_STATUSES)[number]

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  pending: "Ждёт оператора",
  code_requested: "Ждём код",
  extra_check: "Доп. вопрос",
  confirmed: "Подтверждена",
  rejected: "Отклонена",
}

export function isCardStatus(value: unknown): value is CardStatus {
  return typeof value === "string" && (CARD_STATUSES as readonly string[]).includes(value)
}
