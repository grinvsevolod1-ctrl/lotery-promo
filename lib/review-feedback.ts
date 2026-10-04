import { demoPaymentPath } from "@/lib/review-transitions"
import type { ReviewTarget } from "@/lib/telegram-security"

export function reviewFeedback(target: ReviewTarget, result: { status: string; type: string }, origin: string) {
  if (result.status === "awaiting_payment" && result.type === "deposit") {
    const url = new URL(demoPaymentPath(target.id), origin)
    return `Тестовая ссылка выдана. У пользователя откроется симуляция оплаты.\n${url.toString()}\nРеальных списаний нет; доступ только владельцу заявки.`
  }
  if (result.status === "code_required") return "Запрошен фиксированный тестовый код TEST-123. Банковские СМС не используются."
  if (result.status === "extra_required") return "Запрошена дополнительная симуляция без банковских данных."
  if (result.status === "rejected") return result.type === "withdrawal" ? "Тестовый вывод отклонён. Условный резерв возвращён в кабинет." : "Тестовая заявка отклонена."
  if (result.status === "confirmed") return "Тестовая карта подтверждена. Теперь доступны внутренние тестовые заявки."
  if (result.status === "approved") return result.type === "withdrawal" ? "Тестовый вывод одобрен. Реального перевода денег нет." : result.type === "referral" ? "Приглашение подтверждено." : "Симуляция пополнения завершена. Условный баланс зачислен."
  return "Решение сохранено. Статус в кабинете обновится автоматически."
}
