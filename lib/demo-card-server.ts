import { createHmac } from "node:crypto"
import { DEMO_CARD_NUMBER } from "@/lib/payment-demo"

export function demoCardFingerprint(userId: string) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("Missing auth secret")
  return createHmac("sha256", secret).update(`${userId}:${DEMO_CARD_NUMBER}`).digest("hex")
}
