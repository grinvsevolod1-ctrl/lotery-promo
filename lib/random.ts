import { createHmac, randomBytes, randomInt } from "node:crypto"
import type { Rng } from "@/lib/lottery"

// crypto.randomInt requires max - min <= 2^48 - 1, so the span is one short of 2^48.
const SPAN = 2 ** 48 - 1

/** Cryptographically seeded uniform [0, 1) for everything that pays out. */
export const secureRng: Rng = () => randomInt(0, SPAN) / SPAN

/** 32 random bytes as hex: the per-ticket seed stored for audits. */
export function newSeed() {
  return randomBytes(32).toString("hex")
}

/**
 * Deterministic uniform [0, 1) stream: value n is the first 48 bits of
 * HMAC-SHA256(seed, n). The same seed always replays the same draw, so a
 * stored ticket seed proves how its winning numbers were produced.
 */
export function seededRng(seed: string): Rng {
  let counter = 0
  return () => {
    const digest = createHmac("sha256", seed).update(String(counter++)).digest()
    return digest.readUIntBE(0, 6) / 2 ** 48
  }
}
