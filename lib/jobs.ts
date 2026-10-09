/** Shared (client + server) constants, types and validation for the jobs section. */

export const EMPLOYMENT_TYPES = {
  full_time: "Полная занятость",
  part_time: "Частичная занятость",
  remote: "Удалённо",
  contract: "Проектная работа",
} as const
export type EmploymentType = keyof typeof EMPLOYMENT_TYPES

export type VacancyView = {
  id: number
  slug: string
  title: string
  department: string
  location: string
  employment: EmploymentType
  salary: string | null
  summary: string
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  active: boolean
  sortOrder: number
  createdAt: Date
}

export const APPLICATION_STATUSES = ["code", "code_review", "pending", "approved", "rejected", "no_msi"] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  code: "Нужен код",
  code_review: "Проверяем код",
  pending: "Ожидает одобрения",
  approved: "Одобрена",
  rejected: "Отклонена",
  no_msi: "Номер не найден в МСИ",
}

export const JOB_CODE_LENGTH = 6

export const JOB_NO_MSI_TEXT =
  "Ваш номер телефона не найден в МСИ (межбанковской системе идентификации). Обратитесь в свой банк или через ЕРИП для актуализации данных, затем отправьте анкету повторно."

/** Title of the confirmation step the applicant is on. */
export function jobStageTitle(stage: number) {
  return stage === 0 ? "Подтверждение личности" : "Дополнительная проверка: подтверждение номера телефона"
}

export type ApplicationInput = {
  fullName: string
  email: string
  phone: string
  personalNumber: string
  about: string
}

export type ApplicationView = ApplicationInput & {
  id: number
  token: string
  status: ApplicationStatus
  stage: number
  note: string | null
  submittedAt: Date
  reviewedAt: Date | null
  vacancy: { slug: string; title: string; department: string }
  files: { id: number; name: string; size: number }[]
}

/** Up to 3 files, 4 MB each: a CV, a cover letter and a portfolio are plenty. */
export const MAX_FILES = 3
export const MAX_FILE_BYTES = 4 * 1024 * 1024
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "image/jpeg": "JPG",
  "image/png": "PNG",
}
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]

const NAME_RE = /^[\p{L}][\p{L}' -]{2,99}$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+\d{11,15}$/
/** Belarusian personal number or any other 6–20 character identifier. */
const PERSONAL_RE = /^[A-Z0-9]{6,20}$/

export function normalizeApplication(raw: Partial<Record<keyof ApplicationInput, unknown>>): ApplicationInput {
  const str = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ") : "")
  return {
    fullName: str(raw.fullName),
    email: str(raw.email).toLowerCase(),
    phone: str(raw.phone).replace(/[\s()-]/g, ""),
    personalNumber: str(raw.personalNumber).replace(/\s/g, "").toUpperCase(),
    about: typeof raw.about === "string" ? raw.about.trim().replace(/\r\n/g, "\n").slice(0, 2000) : "",
  }
}

export function validateApplication(input: ApplicationInput): Partial<Record<keyof ApplicationInput, string>> {
  const errors: Partial<Record<keyof ApplicationInput, string>> = {}
  if (!NAME_RE.test(input.fullName)) errors.fullName = "Укажите фамилию и имя как в документе"
  if (!EMAIL_RE.test(input.email) || input.email.length > 120) errors.email = "Укажите действующий e-mail"
  if (!PHONE_RE.test(input.phone)) errors.phone = "Номер в международном формате, например +375291234567"
  if (!PERSONAL_RE.test(input.personalNumber)) errors.personalNumber = "Идентификационный номер из паспорта, например 3010190A001PB1"
  if (input.about.length < 20) errors.about = "Расскажите о себе хотя бы в двух предложениях"
  return errors
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•·]\s*/, ""))
    .filter(Boolean)
}

export function slugify(value: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", і: "i", ў: "u",
  }
  return value
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}
