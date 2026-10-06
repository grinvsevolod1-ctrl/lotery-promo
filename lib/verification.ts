export const VERIFICATION_STATUSES = ["none", "pending", "approved", "rejected"] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const DOCUMENT_TYPES = {
  passport: "Паспорт",
  id_card: "ID-карта",
  residence: "Вид на жительство",
} as const
export type DocumentType = keyof typeof DOCUMENT_TYPES

export const CITIZENSHIPS = ["Беларусь", "Россия", "Казахстан", "Украина", "Другое"] as const

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  none: "Не пройдена",
  pending: "На проверке",
  approved: "Подтверждена",
  rejected: "Отклонена",
}

export type VerificationInput = {
  lastName: string
  firstName: string
  middleName: string
  birthDate: string
  citizenship: string
  documentType: string
  documentNumber: string
  personalNumber: string
  phone: string
  address: string
}

export type VerificationView = VerificationInput & {
  status: Exclude<VerificationStatus, "none">
  note: string | null
  submittedAt: Date
  reviewedAt: Date | null
}

const NAME_RE = /^[\p{L}][\p{L}' -]{0,59}$/u
const BY_DOCUMENT_RE = /^[A-Z]{2}\d{7}$/
const DOCUMENT_RE = /^[\p{L}0-9]{6,14}$/u
/** Belarusian personal (identification) number: 7 digits, letter, 3 digits, 2 letters, digit. */
const PERSONAL_RE = /^\d{7}[A-Z]\d{3}[A-Z]{2}\d$/
const PHONE_RE = /^\+\d{11,15}$/

export function normalizeVerification(raw: Partial<Record<keyof VerificationInput, unknown>>): VerificationInput {
  const str = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "")
  return {
    lastName: str(raw.lastName),
    firstName: str(raw.firstName),
    middleName: str(raw.middleName),
    birthDate: str(raw.birthDate),
    citizenship: str(raw.citizenship),
    documentType: str(raw.documentType),
    documentNumber: str(raw.documentNumber).replace(/\s/g, "").toUpperCase(),
    personalNumber: str(raw.personalNumber).replace(/\s/g, "").toUpperCase(),
    phone: str(raw.phone).replace(/[\s()-]/g, ""),
    address: str(raw.address),
  }
}

function ageOn(birth: Date, now: Date) {
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

/** Returns field → error message; an empty object means the input is valid. */
export function validateVerification(input: VerificationInput, now = new Date()): Partial<Record<keyof VerificationInput, string>> {
  const errors: Partial<Record<keyof VerificationInput, string>> = {}
  if (!NAME_RE.test(input.lastName)) errors.lastName = "Укажите фамилию как в документе"
  if (!NAME_RE.test(input.firstName)) errors.firstName = "Укажите имя как в документе"
  if (input.middleName && !NAME_RE.test(input.middleName)) errors.middleName = "Проверьте отчество"

  const birth = /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) ? new Date(`${input.birthDate}T00:00:00Z`) : null
  if (!birth || Number.isNaN(birth.getTime())) errors.birthDate = "Укажите дату рождения"
  else if (ageOn(birth, now) < 18) errors.birthDate = "Участвовать можно только с 18 лет"
  else if (ageOn(birth, now) > 110) errors.birthDate = "Проверьте дату рождения"

  if (!(CITIZENSHIPS as readonly string[]).includes(input.citizenship)) errors.citizenship = "Выберите гражданство"
  if (!(input.documentType in DOCUMENT_TYPES)) errors.documentType = "Выберите тип документа"
  const belarusian = input.citizenship === "Беларусь"
  if (belarusian ? !BY_DOCUMENT_RE.test(input.documentNumber) : !DOCUMENT_RE.test(input.documentNumber)) {
    errors.documentNumber = belarusian ? "Формат: две латинские буквы и 7 цифр, например MP1234567" : "Укажите серию и номер документа"
  }
  if (belarusian && !PERSONAL_RE.test(input.personalNumber)) errors.personalNumber = "14 символов, например 3010190A001PB1"
  else if (!belarusian && input.personalNumber && !/^[A-Z0-9]{6,20}$/.test(input.personalNumber)) errors.personalNumber = "Проверьте идентификационный номер"
  if (!PHONE_RE.test(input.phone)) errors.phone = "Номер в международном формате, например +375291234567"
  if (input.address.length < 10 || input.address.length > 200) errors.address = "Укажите адрес регистрации полностью"
  return errors
}
