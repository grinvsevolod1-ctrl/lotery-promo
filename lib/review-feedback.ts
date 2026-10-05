import type { ReviewTarget } from "@/lib/telegram-security"

export function reviewFeedback(target: ReviewTarget, result: { status: string; type: string }) {
  if (target.kind === "referral" && result.type === "referral") {
    if (result.status === "approved") return "Приглашение подтверждено."
    if (result.status === "rejected") return "Приглашение отклонено."
    return "Решение сохранено. Статус в кабинете обновится автоматически."
  }
  if (target.kind === "card" && result.type === "card") {
    if (result.status === "confirmed") return "Карта подтверждена и привязана."
    if (result.status === "rejected") return "Заявка на карту отклонена."
    if (result.status === "code_requested") return "У пользователя запрошен код. Ждём ответ в кабинете."
    if (result.status === "extra_check") return "Карта отправлена на доп. проверку."
    return "Решение сохранено. Статус в кабинете обновится автоматически."
  }
  return "Платёжные операции недоступны до подключения провайдера."
}
