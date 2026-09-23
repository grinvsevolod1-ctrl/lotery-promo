// Нормализация и валидация телефона (РБ +375 / РФ +7) и идентификационного
// номера. Телефон приводится к виду +<цифры> для хранения и сравнения.

/**
 * Приводит введённый телефон к каноничному виду `+<цифры>`.
 * Поддерживает белорусские (375 / 80xx) и российские (7 / 8) номера.
 * Возвращает null, если номер не распознан.
 */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "")
  if (!digits) return null

  // Беларусь: 375XXXXXXXXX (12 цифр) или локально 80XXXXXXXXX -> 375XXXXXXXXX
  if (digits.startsWith("375") && digits.length === 12) return `+${digits}`
  if (digits.startsWith("80") && digits.length === 11) return `+375${digits.slice(2)}`

  // Россия/Казахстан: 7XXXXXXXXXX (11 цифр) или 8XXXXXXXXXX -> 7XXXXXXXXXX
  if ((digits.startsWith("7") || digits.startsWith("8")) && digits.length === 11) {
    return `+7${digits.slice(1)}`
  }

  // Прочие международные номера: 10–15 цифр — принимаем как есть.
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`

  return null
}

/** Красивое отображение номера с группировкой (для белорусских — по маске). */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "")
  if (d.startsWith("375") && d.length === 12) {
    return `+375 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`
  }
  if (d.startsWith("7") && d.length === 11) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`
  }
  return phone
}

/**
 * Идентификационный номер: 6–20 символов, буквы и цифры. Белорусский
 * идентификационный номер паспорта — 14 символов (например, 3140985A001PB5).
 */
export function validateIdNumber(raw: string): boolean {
  const v = (raw || "").trim().toUpperCase()
  return /^[A-Z0-9]{6,20}$/.test(v)
}

export function normalizeIdNumber(raw: string): string {
  return (raw || "").trim().toUpperCase()
}
