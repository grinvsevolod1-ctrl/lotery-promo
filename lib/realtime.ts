import { Client } from "pg"
import { pool } from "@/lib/db"

const CHANNEL = "bytoloto_events"

/** Topic names. Admin topics start with "admin:", per-user topics with "user:<id>:". */
export const topics = {
  adminCards: "admin:cards",
  adminUsers: "admin:users",
  adminCounts: "admin:counts",
  adminVerification: "admin:verification",
  userCards: (userId: string) => `user:${userId}:cards`,
  userBalance: (userId: string) => `user:${userId}:balance`,
  userVerification: (userId: string) => `user:${userId}:verification`,
} as const

export type LiveEvent = { topic: string; id?: string | number }

/** Fire-and-forget: a failed notification must never break the action that triggered it. */
export async function publish(topic: string, id?: string | number) {
  try {
    const payload: LiveEvent = id === undefined ? { topic } : { topic, id }
    await pool.query("select pg_notify($1, $2)", [CHANNEL, JSON.stringify(payload)])
  } catch (error) {
    console.error("realtime publish failed:", error instanceof Error ? error.message : error)
  }
}

/** A card request was created or changed: refresh the admin lists, the badges and the owner's cabinet. */
export async function notifyCardChange(userId?: string | null) {
  await Promise.all([
    publish(topics.adminCards),
    publish(topics.adminCounts),
    userId ? publish(topics.userCards(userId)) : Promise.resolve(),
  ])
}

type Listener = (event: LiveEvent) => void

type Hub = {
  listeners: Set<Listener>
  client: Client | null
  connecting: boolean
}

const globalForHub = globalThis as unknown as { __bytolotoHub?: Hub }
const hub: Hub = (globalForHub.__bytolotoHub ??= { listeners: new Set(), client: null, connecting: false })

async function connect() {
  if (hub.client || hub.connecting) return
  hub.connecting = true
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  const reconnect = () => {
    if (hub.client !== client && hub.client !== null) return
    hub.client = null
    client.removeAllListeners()
    client.end().catch(() => {})
    if (hub.listeners.size > 0) setTimeout(() => void connect(), 3_000)
  }

  client.on("error", reconnect)
  client.on("end", reconnect)
  client.on("notification", (message) => {
    if (message.channel !== CHANNEL || !message.payload) return
    let event: LiveEvent
    try {
      event = JSON.parse(message.payload) as LiveEvent
    } catch {
      return
    }
    for (const listener of hub.listeners) listener(event)
  })

  try {
    await client.connect()
    await client.query(`LISTEN ${CHANNEL}`)
    hub.client = client
  } catch (error) {
    console.error("realtime listen failed:", error instanceof Error ? error.message : error)
    client.removeAllListeners()
    client.end().catch(() => {})
    setTimeout(() => void connect(), 3_000)
  } finally {
    hub.connecting = false
  }
}

/** One shared Postgres connection per process fans events out to every open stream. */
export function subscribe(listener: Listener) {
  hub.listeners.add(listener)
  void connect()
  return () => {
    hub.listeners.delete(listener)
    if (hub.listeners.size === 0 && hub.client) {
      const client = hub.client
      hub.client = null
      client.removeAllListeners()
      client.end().catch(() => {})
    }
  }
}
