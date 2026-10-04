import type { ReviewTarget } from "@/lib/telegram-security"

export function reviewFeedback(target: ReviewTarget, result: { status: string; type: string }) {
  if (target.kind !== "referral" || result.type !== "referral") return "Платёжные операции недоступны до подключения провайдера."
  if (result.status === "approved") return "Приглашение подтверждено."
  if (result.status === "rejected") return "Приглашение отклонено."
  return "Решение сохранено. Статус в кабинете обновится автоматически."
}
