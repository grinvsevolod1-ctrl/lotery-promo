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
} from "drizzle-orm/pg-core"

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

// ─── App tables ───────────────────────────────────────────────────────

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
    drawId: integer("drawId")
      .notNull()
      .references(() => draw.id),
    game: text("game").notNull(),
    numbers: text("numbers").notNull(),
    cost: integer("cost").notNull().default(0),
    status: text("status").notNull().default("pending"),
    matches: integer("matches").notNull().default(0),
    prize: integer("prize").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("ticket_user_idx").on(table.userId),
    index("ticket_draw_idx").on(table.drawId),
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
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("transaction_user_idx").on(table.userId),
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
