// Утилиты для платёжных карт (выплаты по договору). Файл без server-only:
// используется и в серверных экшенах, и в клиентских формах (валидация,
// маскирование, определение платёжной системы).

export type CardBrand = 'visa' | 'mastercard' | 'belkart' | 'mir' | 'other'

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  belkart: 'БЕЛКАРТ',
  mir: 'МИР',
  other: 'Карта',
}

/** Оставляет только цифры, максимум 19 (стандарт для PAN). */
export function normalizeCardNumber(input: string): string {
  return (input || '').replace(/\D/g, '').slice(0, 19)
}

/** Проверка номера по алгоритму Луна. */
export function luhnValid(numberRaw: string): boolean {
  const s = normalizeCardNumber(numberRaw)
  if (s.length < 13 || s.length > 19) return false
  let sum = 0
  let even = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48
    if (even) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    even = !even
  }
  return sum % 10 === 0
}

/** Определяет платёжную систему по префиксу номера. */
export function detectBrand(numberRaw: string): CardBrand {
  const s = normalizeCardNumber(numberRaw)
  if (/^4/.test(s)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(s)) return 'mastercard'
  if (/^(9112|9679|3562)/.test(s)) return 'belkart'
  if (/^2/.test(s) && /^220[0-4]/.test(s)) return 'mir'
  return 'other'
}

// Таблица BIN-префиксов банков Беларуси. Это эвристика по публично известным
// диапазонам эмитентов: покрывает распространённые карты, но не гарантирует
// 100% точность, поэтому банк остаётся необязательным полем. Префикс должен
// встречаться один раз — второе вхождение никогда не сработает.
const BANK_BINS: ReadonlyArray<readonly [prefix: string, bank: string]> = [
  ['490604', 'Беларусбанк'],
  ['489042', 'Беларусбанк'],
  ['9112', 'Беларусбанк'],
  ['4177', 'Беларусбанк'],
  ['5391', 'Беларусбанк'],
  ['5228', 'Беларусбанк'],
  ['4356', 'Приорбанк'],
  ['5457', 'Приорбанк'],
  ['5300', 'Приорбанк'],
  ['4272', 'БПС-Сбербанк'],
  ['5469', 'БПС-Сбербанк'],
  ['4373', 'Белагропромбанк'],
  ['5288', 'Белагропромбанк'],
  ['4195', 'Белинвестбанк'],
  ['5245', 'Белинвестбанк'],
  ['5169', 'МТБанк'],
  ['4048', 'МТБанк'],
  ['4790', 'Альфа-Банк'],
  ['5559', 'Альфа-Банк'],
  ['9679', 'Банк Дабрабыт'],
]

// Более длинные (точные) префиксы проверяются первыми; сортируем один раз.
const BANK_BINS_BY_LENGTH = [...BANK_BINS].sort((a, b) => b[0].length - a[0].length)

/**
 * Пытается определить банк-эмитент по номеру карты (BIN).
 * Возвращает название банка либо null, если совпадений нет.
 */
export function detectBank(numberRaw: string): string | null {
  const s = normalizeCardNumber(numberRaw)
  if (s.length < 4) return null
  for (const [prefix, bank] of BANK_BINS_BY_LENGTH) {
    if (s.startsWith(prefix)) return bank
  }
  return null
}

/** Форматирует номер группами по 4: «4242 4242 4242 4242». */
export function formatCardNumber(input: string): string {
  const s = normalizeCardNumber(input)
  return s.replace(/(.{4})/g, '$1 ').trim()
}

/** Маска для отображения: «•••• •••• •••• 4242». */
export function maskCard(last4: string): string {
  return `•••• •••• •••• ${(last4 || '').slice(-4)}`
}

/** Срок действия «MM/YY». */
export function formatExpiry(month: number | null, year: number | null): string {
  if (!month || !year) return ''
  const mm = String(month).padStart(2, '0')
  const yy = String(year % 100).padStart(2, '0')
  return `${mm}/${yy}`
}

/** Разбирает ввод «MM/YY» или «MM/YYYY» в месяц и полный год. */
export function parseExpiry(
  input: string,
): { month: number; year: number } | null {
  const m = (input || '').match(/^\s*(\d{1,2})\s*[/\-.]\s*(\d{2}|\d{4})\s*$/)
  if (!m) return null
  const month = parseInt(m[1], 10)
  let year = parseInt(m[2], 10)
  if (m[2].length === 2) year += 2000
  if (month < 1 || month > 12) return null
  if (year < 2000 || year > 2100) return null
  return { month, year }
}

/** Срок действия не истёк (по концу указанного месяца). */
export function isExpiryValid(month: number, year: number): boolean {
  const now = new Date()
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  return endOfMonth.getTime() >= now.getTime()
}
