import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

// An idle client losing its connection emits "error"; without a listener Node crashes the whole server.
pool.on("error", (error) => {
  console.error("Postgres pool error:", error.message)
})

export const db = drizzle(pool, { schema })
