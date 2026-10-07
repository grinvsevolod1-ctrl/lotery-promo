import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

export async function getUserBlock(userId: string) {
  const [row] = await db
    .select({ blockedAt: user.blockedAt, blockReason: user.blockReason })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return row?.blockedAt ? { blockedAt: row.blockedAt, reason: row.blockReason } : null
}

export async function isUserBlocked(userId: string) {
  return (await getUserBlock(userId)) !== null
}
