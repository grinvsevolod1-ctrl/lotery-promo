export const ASSET_IDS = ["USDT_TRC20", "USDT_ERC20", "BTC", "ETH", "TON", "TRX", "LTC", "USDC_ERC20"] as const
export type AssetId = (typeof ASSET_IDS)[number]

export type AssetInfo = {
  id: AssetId
  symbol: string
  name: string
  network: string
  /** CoinGecko id used for the USD price. */
  coingecko: string
  /** Digits the invoice amount is quoted and matched at; the unique tail lives in the last digit. */
  precision: number
  color: string
  /** Hint shown next to the address so users do not send over the wrong network. */
  warning: string
}

export const ASSETS: Record<AssetId, AssetInfo> = {
  USDT_TRC20: { id: "USDT_TRC20", symbol: "USDT", name: "Tether", network: "TRC20 (Tron)", coingecko: "tether", precision: 2, color: "#26a17b", warning: "Только USDT в сети TRON (TRC20)" },
  USDT_ERC20: { id: "USDT_ERC20", symbol: "USDT", name: "Tether", network: "ERC20 (Ethereum)", coingecko: "tether", precision: 2, color: "#26a17b", warning: "Только USDT в сети Ethereum (ERC20)" },
  BTC: { id: "BTC", symbol: "BTC", name: "Bitcoin", network: "Bitcoin", coingecko: "bitcoin", precision: 7, color: "#f7931a", warning: "Только BTC в сети Bitcoin" },
  ETH: { id: "ETH", symbol: "ETH", name: "Ethereum", network: "Ethereum", coingecko: "ethereum", precision: 6, color: "#627eea", warning: "Только ETH в сети Ethereum" },
  TON: { id: "TON", symbol: "TON", name: "Toncoin", network: "TON", coingecko: "the-open-network", precision: 3, color: "#0098ea", warning: "Только TON, без комментария-мемо" },
  TRX: { id: "TRX", symbol: "TRX", name: "Tron", network: "TRON", coingecko: "tron", precision: 2, color: "#eb0029", warning: "Только TRX в сети TRON" },
  LTC: { id: "LTC", symbol: "LTC", name: "Litecoin", network: "Litecoin", coingecko: "litecoin", precision: 5, color: "#345d9d", warning: "Только LTC в сети Litecoin" },
  USDC_ERC20: { id: "USDC_ERC20", symbol: "USDC", name: "USD Coin", network: "ERC20 (Ethereum)", coingecko: "usd-coin", precision: 2, color: "#2775ca", warning: "Только USDC в сети Ethereum (ERC20)" },
}

export function isAssetId(value: unknown): value is AssetId {
  return typeof value === "string" && (ASSET_IDS as readonly string[]).includes(value)
}

export const INVOICE_TTL_MINUTES = 30
/** A transfer broadcast just before the deadline can land in a block a bit later. */
export const INVOICE_GRACE_MINUTES = 15
export const MIN_DEPOSIT_BYN = 10
export const MAX_DEPOSIT_BYN = 50_000
/** Unique tails 1..TAIL_MAX in the last quoted digit tell parallel invoices apart. */
export const TAIL_MAX = 99

// Plain BigInt() calls: the tsconfig target predates bigint literals.
function pow10(n: number): bigint {
  return BigInt("1" + "0".repeat(n))
}

/** "100.020000000" -> 10002n at precision 2. Extra digits are truncated. */
export function toUnits(amount: string, precision: number): bigint {
  const [whole, frac = ""] = amount.trim().split(".")
  const digits = (frac + "0".repeat(precision)).slice(0, precision)
  return BigInt(whole || "0") * pow10(precision) + BigInt(digits || "0")
}

export function fromUnits(units: bigint, precision: number): string {
  if (precision === 0) return units.toString()
  const scale = pow10(precision)
  const frac = (units % scale).toString().padStart(precision, "0")
  return `${units / scale}.${frac}`
}

/** On-chain integer amount (sats, wei, sun, nanoton) truncated to the quoting precision. */
export function chainToUnits(raw: bigint, chainDecimals: number, precision: number): bigint {
  if (chainDecimals >= precision) return raw / pow10(chainDecimals - precision)
  return raw * pow10(precision - chainDecimals)
}

/** Crypto amount (in quoting units) covering `byn` at `rateByn` BYN per coin, rounded up. */
export function baseUnitsFor(byn: number, rateByn: number, precision: number): bigint {
  return BigInt(Math.ceil((byn / rateByn) * 10 ** precision))
}

/** BYN credited for a crypto amount, rounded to kopecks. */
export function bynFor(units: bigint, precision: number, rateByn: number): number {
  return Math.round((Number(units) / 10 ** precision) * rateByn * 100) / 100
}

/** Picks a free tail so (asset, amount) is unique among pending invoices. Returns null when all are taken. */
export function pickTail(base: bigint, taken: ReadonlySet<bigint>, random: () => number = Math.random): bigint | null {
  const free: bigint[] = []
  for (let t = BigInt(1); t <= BigInt(TAIL_MAX); t += BigInt(1)) if (!taken.has(base + t)) free.push(base + t)
  if (free.length === 0) return null
  return free[Math.floor(random() * free.length)]
}

export function isPlausibleAddress(asset: AssetId, address: string): boolean {
  const a = address.trim()
  switch (asset) {
    case "BTC":
      return /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a)
    case "LTC":
      return /^(ltc1[a-z0-9]{25,62}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a)
    case "ETH":
    case "USDT_ERC20":
    case "USDC_ERC20":
      return /^0x[a-fA-F0-9]{40}$/.test(a)
    case "TRX":
    case "USDT_TRC20":
      return /^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(a)
    case "TON":
      return /^([UE]Q[A-Za-z0-9_-]{46}|-?\d:[a-fA-F0-9]{64})$/.test(a)
  }
}

const BASE58 = "[1-9A-HJ-NP-Za-km-z]"
const ADDRESS_PATTERNS: Record<AssetId, RegExp> = {
  USDT_TRC20: new RegExp(`^T${BASE58}{33}$`),
  TRX: new RegExp(`^T${BASE58}{33}$`),
  USDT_ERC20: /^0x[a-fA-F0-9]{40}$/,
  USDC_ERC20: /^0x[a-fA-F0-9]{40}$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  BTC: new RegExp(`^(bc1[a-z0-9]{25,87}|[13]${BASE58}{25,34})$`),
  LTC: new RegExp(`^(ltc1[a-z0-9]{25,87}|[LM3]${BASE58}{26,33})$`),
  TON: /^((EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}|-?\d:[a-fA-F0-9]{64})$/,
}

/** Format check only — catches typos and wrong-network addresses before an admin pays out. */
export function isValidAddress(asset: AssetId, address: string): boolean {
  return ADDRESS_PATTERNS[asset].test(address.trim())
}
