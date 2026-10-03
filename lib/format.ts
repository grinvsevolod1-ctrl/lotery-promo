import { MINSK_TIME_ZONE } from "@/lib/lottery"

type DateInput = Date | string | number | null | undefined

export function formatDateTime(value: DateInput) {
  if (!value) return "—"
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: MINSK_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDate(value: DateInput) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("ru-RU", {
    timeZone: MINSK_TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function formatDateShort(value: DateInput) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("ru-RU", {
    timeZone: MINSK_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatByn(amount: number) {
  return `${amount.toLocaleString("ru-RU")} BYN`
}
