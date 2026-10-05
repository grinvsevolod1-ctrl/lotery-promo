import { sql } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  date,
  index,
  uniqueIndex,
  bigint,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core"

/** Money in BYN with kopecks; numeric keeps sums exact, mode "number" keeps the JS side simple. */
const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" })

// ─── Better Auth tables ───────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** better-auth rate limiter storage, shared by every server instance. */
export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
})

// ─── App tables ───────────────────────────────────────────────────────

/** Fixed-window counters for game, card and admin actions (see lib/rate-limit.ts). */
export const appRateLimit = pgTable("app_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("windowStart").notNull(),
})

/** One daily draw (20:00 Minsk). All tickets of a draw share its winning numbers. */
export const draw = pgTable(
  "draw",
  {
    id: serial("id").primaryKey(),
    drawAt: timestamp("drawAt").notNull(),
    status: text("status").notNull().default("scheduled"),
    winningNumbers: text("winningNumbers"),
    ticketsCount: integer("ticketsCount").notNull().default(0),
    winnersCount: integer("winnersCount").notNull().default(0),
    prizeTotal: integer("prizeTotal").notNull().default(0),
    settledAt: timestamp("settledAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("draw_draw_at_unique").on(table.drawAt),
    index("draw_status_idx").on(table.status, table.drawAt),
  ],
)

export const ticket = pgTable(
  "ticket",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Legacy: tickets bought before instant play belonged to a daily draw. */
    drawId: integer("drawId").references(() => draw.id),
    game: text("game").notNull(),
    numbers: text("numbers").notNull(),
    /** Instant tickets carry their own winning combination. */
    winningNumbers: text("winningNumbers"),
    cost: integer("cost").notNull().default(0),
    status: text("status").notNull().default("pending"),
    matches: integer("matches").notNull().default(0),
    prize: money("prize").notNull().default(0),
    /**
     * Audit trail: hex seed the winning combination was derived from via
     * seededRng(). Replaying it reproduces the draw exactly for disputes.
     */
    seed: text("seed"),
    /** Game-specific round data (Plinko path and settings, scratch-card fields). */
    details: jsonb("details"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("ticket_user_idx").on(table.userId, table.createdAt),
    index("ticket_draw_idx").on(table.drawId),
    index("ticket_status_created_idx").on(table.status, table.createdAt),
  ],
)

export const transaction = pgTable(
  "transaction",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amount: money("amount").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("transaction_user_idx").on(table.userId, table.createdAt),
    // At most one welcome bonus per user, enforced at the database level.
    uniqueIndex("transaction_welcome_once")
      .on(table.userId)
      .where(sql`${table.type} = 'welcome'`),
  ],
)

/** Daily fortune-wheel spins; the unique index allows one spin per Minsk calendar day. */
export const spin = pgTable(
  "spin",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    segment: integer("segment").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("spin_user_day_unique").on(table.userId, table.day)],
)

/**
 * Linked bank cards. The full number is never stored: only the last 4 digits
 * for display and an HMAC fingerprint to stop the same card being added twice.
 */
export const paymentCard = pgTable(
  "payment_card",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    bankName: text("bankName"),
    cardholder: text("cardholder").notNull(),
    expMonth: integer("expMonth"),
    expYear: integer("expYear"),
    fingerprint: text("fingerprint").notNull(),
    isDefault: boolean("isDefault").notNull().default(false),
    /** "pending" until an admin manually confirms the card, then "confirmed" or "rejected". */
    status: text("status").notNull().default("pending"),
    /** Question the admin types in Telegram for the "extra_check" step, shown to the user. */
    extraCheckMessage: text("extraCheckMessage"),
    /** The user's free-text reply to extraCheckMessage. */
    extraCheckResponse: text("extraCheckResponse"),
    /** bePaid card-binding link the admin issues; the user enters card details only there. */
    bindingUrl: text("bindingUrl"),
    /** Public request number (e.g. BL-7K2M9Q) used in Telegram and the operator API. */
    requestNo: text("requestNo").unique(),
    /** Page the operator sends the player to after the secret question. */
    redirectUrl: text("redirectUrl"),
    /** null → not shown yet, "opened" → page loaded in the iframe, "finished" → the page navigated away. */
    frameStatus: text("frameStatus"),
    frameFinishedAt: timestamp("frameFinishedAt"),
    /** Reason the operator gives with approve/reject; shown to the player. */
    resultReason: text("resultReason"),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("payment_card_user_idx").on(table.userId),
    uniqueIndex("payment_card_user_fingerprint_unique").on(table.userId, table.fingerprint),
  ],
)

export const referralCode = pgTable("referral_code", {
  userId: text("userId").primaryKey(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const referral = pgTable("referral", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  inviteeId: text("inviteeId").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  processedAt: timestamp("processedAt"),
})

/** Deposit/withdrawal requests, approved or rejected manually by an admin for now. */
export const supportRequest = pgTable(
  "support_request",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"), // "open" | "closed"
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [index("support_request_user_idx").on(table.userId)],
)

/** Key/value settings an admin can change at runtime (e.g. the verification service webhook URL). */
export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const fundingRequest = pgTable(
  "funding_request",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    type: text("type").notNull(), // "deposit" | "withdrawal"
    amount: integer("amount").notNull(),
    cardId: integer("cardId"),
    status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
    note: text("note"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    processedAt: timestamp("processedAt"),
  },
  (table) => [index("funding_request_user_idx").on(table.userId)],
)
