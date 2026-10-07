import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { userVerification } from "@/lib/db/schema"

export const VERIFICATION_REQUIRED_ERROR = "Сначала пройдите верификацию личности: Профиль → Верификация."

export async function isUserVerified(userId: string) {
  const [row] = await db
    .select({ status: userVerification.status })
    .from(userVerification)
    .where(eq(userVerification.userId, userId))
    .limit(1)
  return row?.status === "approved"
}

/** Returns an error message when the player may not play or move money yet, otherwise null. */
export async function verificationBlock(userId: string) {
  return (await isUserVerified(userId)) ? null : VERIFICATION_REQUIRED_ERROR
}
