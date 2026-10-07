/**
 * Input masks for the verification form. In a mask "0" is a digit, "A" a Latin letter,
 * anything else is a literal inserted automatically as the player types.
 */

// Cyrillic letters that look like Latin ones: players often type the document series in the Russian layout.
const LOOKALIKES: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y", І: "I",
}

function toLatin(char: string) {
  const upper = char.toUpperCase()
  return LOOKALIKES[upper] ?? upper
}

export function applyMask(raw: string, mask: string) {
  const chars = [...raw]
  let out = ""
  let i = 0
  for (const slot of mask) {
    if (i >= chars.length) break
    if (slot === "0" || slot === "A") {
      let placed = false
      while (i < chars.length) {
        const c = slot === "A" ? toLatin(chars[i++]) : chars[i++]
        if (slot === "0" ? /\d/.test(c) : /[A-Z]/.test(c)) {
          out += c
          placed = true
          break
        }
      }
      if (!placed) break
    } else {
      out += slot
      if (chars[i] === slot) i++
    }
  }
  return out
}

/** Example values shown as grey ghost text after what the player already typed. */
export const EXAMPLES = {
  birthDate: "ДД.ММ.ГГГГ",
  documentNumberBy: "MP1234567",
  documentNumber: "AB1234567",
  personalNumber: "3010190A001PB1",
} as const

export const MASKS = {
  birthDate: "00.00.0000",
  documentNumberBy: "AA0000000",
  personalNumberBy: "0000000A000AA0",
} as const

/** Typing "5" for the day means "05": pad single digits that cannot start a two-digit day or month. */
export function maskBirthDate(raw: string) {
  let digits = raw.replace(/\D/g, "")
  if (digits.length >= 1 && Number(digits[0]) > 3) digits = `0${digits}`
  if (digits.length >= 3 && Number(digits[2]) > 1) digits = `${digits.slice(0, 2)}0${digits.slice(2)}`
  return applyMask(digits, MASKS.birthDate)
}

export function isoToDisplayDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

export function displayToIsoDate(display: string) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(display)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : display
}

type PhoneFormat = { code: string; national: string; example: string }

export const PHONE_FORMATS: Record<string, PhoneFormat> = {
  Беларусь: { code: "375", national: "00 000-00-00", example: "+375 29 123-45-67" },
  Россия: { code: "7", national: "000 000-00-00", example: "+7 912 345-67-89" },
  Казахстан: { code: "7", national: "000 000-00-00", example: "+7 701 234-56-78" },
  Украина: { code: "380", national: "00 000-00-00", example: "+380 50 123-45-67" },
}

export function phoneExample(citizenship: string) {
  return PHONE_FORMATS[citizenship]?.example ?? "+48 512 345 678"
}

/** Formats a phone for the player's country; accepts pasted numbers with or without the country or trunk prefix. */
export function maskPhone(raw: string, citizenship: string) {
  const format = PHONE_FORMATS[citizenship]
  let digits = raw.replace(/\D/g, "")
  if (!format) return `+${digits.slice(0, 15)}`
  if (digits.startsWith(format.code)) digits = digits.slice(format.code.length)
  else if (format.code === "375" && digits.startsWith("80")) digits = digits.slice(2)
  else if (format.code === "7" && digits.startsWith("8") && digits.length === 11) digits = digits.slice(1)
  const national = applyMask(digits, format.national)
  return `+${format.code} ${national}`
}

/** Letters, spaces, hyphens and apostrophes only; each part starts with a capital letter. */
export function maskName(raw: string) {
  return raw
    .replace(/[^\p{L}' -]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s'-]+/, "")
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
    .slice(0, 60)
}

export function maskFreeDocument(raw: string) {
  return [...raw].map(toLatin).join("").replace(/[^A-Z0-9]/g, "").slice(0, 14)
}
