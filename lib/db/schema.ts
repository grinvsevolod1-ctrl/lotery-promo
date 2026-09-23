import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core"

// ─── Пользователи (телефон + идентификационный номер) ──────────────────
// Регистрация и вход идут по номеру телефона и идентификационному номеру,
// код подтверждения проверяет оператор вручную в админ-панели.
export const appUser = pgTable("app_user", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  fullName: text("fullName").notNull().default(""),
  idNumber: text("idNumber").notNull(), // идентификационный номер
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  isBlocked: boolean("isBlocked").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ─── Сессии (собственные, cookie-based) ────────────────────────────────
// id = sha256(токен из cookie). Для оператора из ENV используется
// userId = 'env-admin' — отдельной записи в app_user у него нет.
export const appSession = pgTable("app_session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ─── Заявки на вход/регистрацию (код подтверждает оператор) ─────────────
export const authRequest = pgTable("auth_request", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  purpose: text("purpose").notNull(), // 'login' | 'register'
  payload: text("payload"), // JSON с данными регистрации
  clientToken: text("clientToken").notNull(), // привязка к заявителю
  enteredCode: text("enteredCode"), // код, введённый заявителем
  // 'pending' | 'code_entered' | 'approved' | 'rejected' | 'done' | 'expired'
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  smsSentAt: timestamp("smsSentAt"), // отметка оператора «код отправлен»
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ─── App tables ────────────────────────────────────────────────────────

export const ticket = pgTable("ticket", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  game: text("game").notNull(),
  numbers: text("numbers").notNull(),
  cost: integer("cost").notNull().default(0),
  status: text("status").notNull().default("pending"),
  prize: integer("prize").notNull().default(0),
  drawAt: timestamp("drawAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const transaction = pgTable("transaction", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export type AppUser = typeof appUser.$inferSelect
export type AuthRequest = typeof authRequest.$inferSelect
