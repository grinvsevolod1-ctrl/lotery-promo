import { randomInt } from "node:crypto"
import type { Rng } from "@/lib/lottery"

/** Cryptographically seeded uniform [0, 1) for everything that pays out. */
export const secureRng: Rng = () => randomInt(0, 2 ** 48) / 2 ** 48
