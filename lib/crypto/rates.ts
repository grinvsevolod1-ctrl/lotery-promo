import "server-only"
import { ASSETS, ASSET_IDS, type AssetId } from "@/lib/crypto/assets"

export type Rates = { bynPerUsd: number; byn: Record<AssetId, number>; fetchedAt: number }

const TTL_MS = 60_000
let cache: Rates | null = null
let inflight: Promise<Rates> | null = null

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return (await res.json()) as T
}

async function load(): Promise<Rates> {
  const ids = [...new Set(ASSET_IDS.map((id) => ASSETS[id].coingecko))].join(",")
  const [prices, nbrb] = await Promise.all([
    fetchJson<Record<string, { usd?: number }>>(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`),
    // Official National Bank of Belarus USD rate.
    fetchJson<{ Cur_OfficialRate: number; Cur_Scale: number }>("https://api.nbrb.by/exrates/rates/USD?parammode=2"),
  ])
  const bynPerUsd = nbrb.Cur_OfficialRate / nbrb.Cur_Scale
  if (!(bynPerUsd > 0)) throw new Error("NBRB rate missing")
  const byn = {} as Record<AssetId, number>
  for (const id of ASSET_IDS) {
    const usd = prices[ASSETS[id].coingecko]?.usd
    if (!usd || usd <= 0) throw new Error(`price missing for ${id}`)
    byn[id] = Math.round(usd * bynPerUsd * 1e6) / 1e6
  }
  return { bynPerUsd, byn, fetchedAt: Date.now() }
}

/** Live rates cached for a minute; a failed refresh falls back to the last good snapshot. */
export async function getRates(): Promise<Rates> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache
  inflight ??= load()
    .then((fresh) => (cache = fresh))
    .catch((error) => {
      if (cache) return cache
      throw error
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
