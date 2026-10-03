import { randomInt } from "node:crypto"
import type { Rng } from "@/lib/lottery"

// crypto.randomInt requires max - min <= 2^48 - 1, so the span is one short of 2^48.
const SPAN = 2 ** 48 - 1

/** Cryptographically seeded uniform [0, 1) for everything that pays out. */
export const secureRng: Rng = () => randomInt(0, SPAN) / SPAN
