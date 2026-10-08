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
  blockedAt: timestamp("blockedAt"),
  blockReason: text("blockReason"),
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

/** Operator answers to a support request; each one is also e-mailed to the player. */
export const supportReply = pgTable(
  "support_reply",
  {
    id: serial("id").primaryKey(),
    requestId: integer("requestId")
      .notNull()
      .references(() => supportRequest.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    emailed: boolean("emailed").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [index("support_reply_request_idx").on(table.requestId, table.createdAt)],
)

/** Canned answers the admin picks from when replying to a request. */
export const supportTemplate = pgTable("support_template", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/** Key/value settings an admin can change at runtime (e.g. the verification service webhook URL). */
/**
 * Crypto top-up invoice. Wallets are shared, so each pending invoice gets a unique
 * amount (asset + cryptoAmount) and the incoming transfer is matched by that amount.
 */
export const cryptoInvoice = pgTable(
  "crypto_invoice",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    asset: text("asset").notNull(),
    address: text("address").notNull(),
    cryptoAmount: numeric("cryptoAmount", { precision: 30, scale: 9, mode: "string" }).notNull(),
    /** BYN per coin locked when the invoice was issued. */
    rate: numeric("rate", { precision: 20, scale: 6, mode: "number" }).notNull(),
    amountByn: money("amountByn").notNull(),
    status: text("status").notNull().default("pending"), // pending | paid | expired | cancelled
    txHash: text("txHash"),
    paidAt: timestamp("paidAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  (table) => [
    index("crypto_invoice_user_idx").on(table.userId, table.createdAt),
    index("crypto_invoice_status_idx").on(table.status),
    uniqueIndex("crypto_invoice_pending_amount")
      .on(table.asset, table.cryptoAmount)
      .where(sql`${table.status} = 'pending'`),
    uniqueIndex("crypto_invoice_tx_once")
      .on(table.asset, table.txHash)
      .where(sql`${table.txHash} is not null`),
  ],
)

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
    /** Crypto withdrawals carry the asset and the player's address instead of a card. */
    asset: text("asset"),
    wallet: text("wallet"),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  note: text("note"),
  /** Card deposits only: "awaiting" = the bank code is requested from the player, "submitted" = it arrived. */
  codeStatus: text("codeStatus"),
  /** The bank confirmation code; wiped as soon as the request is approved or rejected. */
  code: text("code"),
  codeSubmittedAt: timestamp("codeSubmittedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  processedAt: timestamp("processedAt"),
  },
  (table) => [index("funding_request_user_idx").on(table.userId)],
)

/**
 * One row per physical device. The device is identified by a long-lived cookie (`deviceId`);
 * rows without a cookie fall back to IP + browser string. `ip` is the latest known address.
 */
export const visitor = pgTable(
  "visitor",
  {
    id: serial("id").primaryKey(),
    deviceId: text("deviceId"),
    ip: text("ip").notNull(),
    userAgent: text("userAgent").notNull(),
    deviceType: text("deviceType").notNull(),
    os: text("os").notNull(),
    browser: text("browser").notNull(),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    lastPath: text("lastPath").notNull().default("/"),
    hits: integer("hits").notNull().default(1),
    firstSeenAt: timestamp("firstSeenAt").notNull().defaultNow(),
    lastSeenAt: timestamp("lastSeenAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("visitor_device_id_idx").on(table.deviceId).where(sql`${table.deviceId} is not null`),
    index("visitor_ip_ua_idx").on(table.ip, table.userAgent),
    index("visitor_last_seen_idx").on(table.lastSeenAt),
    index("visitor_user_idx").on(table.userId),
  ],
)

/** Action log per device: sign-up, card binding steps, deposits, games, IP changes. */
export const visitorEvent = pgTable(
  "visitor_event",
  {
    id: serial("id").primaryKey(),
    visitorId: integer("visitorId")
      .notNull()
      .references(() => visitor.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [index("visitor_event_visitor_idx").on(table.visitorId, table.createdAt)],
)

/** In-app inbox: money movements, card reviews, bonuses and system news for one player. */
export const notification = pgTable(
  "notification",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "money" | "card" | "bonus" | "win" | "system"
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [index("notification_user_idx").on(table.userId, table.createdAt)],
)

/**
 * Identity check (KYC): one row per player. The player fills in passport data,
 * an admin reviews it; a rejected application can be corrected and resubmitted.
 */
export const userVerification = pgTable(
  "user_verification",
  {
    userId: text("userId")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Numeric handle for signed Telegram buttons. */
    id: serial("id").notNull(),
    // "code" (waiting for the player's code) | "code_review" | "pending" (admin decides) | "approved" | "rejected"
    status: text("status").notNull().default("pending"),
    code: text("code"),
    enteredCode: text("enteredCode"),
    /** 0 = first confirmation code, 1+ = extra checks requested by an admin. */
    stage: integer("stage").notNull().default(0),
    codeSentAt: timestamp("codeSentAt"),
    lastName: text("lastName").notNull(),
    firstName: text("firstName").notNull(),
    middleName: text("middleName"),
    birthDate: date("birthDate", { mode: "string" }).notNull(),
    citizenship: text("citizenship").notNull(),
    documentType: text("documentType").notNull(), // "passport" | "id_card" | "residence"
    documentNumber: text("documentNumber").notNull(),
    personalNumber: text("personalNumber").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    /** Admin's reason when the application is rejected. */
    note: text("note"),
    submittedAt: timestamp("submittedAt").notNull().defaultNow(),
    reviewedAt: timestamp("reviewedAt"),
  },
  (table) => [
    index("user_verification_status_idx").on(table.status, table.submittedAt),
    uniqueIndex("user_verification_id_idx").on(table.id),
  ],
)

/**
 * Claimed promo bonuses. `code` encodes the period for repeatable offers
 * (e.g. "reload:2026-W41"), so the unique index alone blocks double claims.
 */
export const bonusClaim = pgTable(
  "bonus_claim",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    amount: money("amount").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("bonus_claim_once").on(table.userId, table.code)],
)

/**
 * «Путь ниндзя» rounds. A round spans several requests (open scroll, open
 * scroll, collect), so the hidden layout lives here until it is settled;
 * then a `ticket` row is written like for every other game.
 */
export const ninjaRound = pgTable(
  "ninja_round",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stake: integer("stake").notNull(),
    traps: integer("traps").notNull(),
    /** Total charged: the stake, or the Awakening price that includes it. */
    cost: money("cost").notNull(),
    /** Safe scrolls opened before the first move (0, 3 or 6). */
    awakening: integer("awakening").notNull().default(0),
    seed: text("seed").notNull(),
    /** Secret: trap cells, Sharingan cells and the trap seal order. */
    layout: jsonb("layout").notNull(),
    /** Public progress (see NinjaState in lib/games/ninja.ts). */
    state: jsonb("state").notNull(),
    status: text("status").notNull().default("active"), // active | cashed | bust | complete
    payout: money("payout").notNull().default(0),
    ticketId: integer("ticketId").references(() => ticket.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    settledAt: timestamp("settledAt"),
  },
  (table) => [
    index("ninja_round_user_idx").on(table.userId, table.createdAt),
    // One open round per player at a time.
    uniqueIndex("ninja_round_active_once").on(table.userId).where(sql`${table.status} = 'active'`),
  ],
)

/** Promotional bonus campaigns managed from the admin "Бонусы" tab. */
export const bonusOffer = pgTable("bonus_offer", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  kind: text("kind").notNull(),
  category: text("category").notNull(),
  gameTitle: text("gameTitle"),
  percent: integer("percent"),
  amount: money("amount"),
  maxBonus: money("maxBonus"),
  minDeposit: money("minDeposit"),
  freeSpins: integer("freeSpins"),
  spinValue: money("spinValue"),
  wager: integer("wager").notNull().default(0),
  wagerContribution: integer("wagerContribution").notNull().default(100),
  validDays: integer("validDays").notNull().default(7),
  maxWin: money("maxWin"),
  audience: text("audience").notNull().default("all"),
  promoCode: text("promoCode"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
