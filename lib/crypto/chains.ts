import "server-only"
import type { AssetId } from "@/lib/crypto/assets"

/** A confirmed incoming transfer to one of our wallets. */
export type IncomingTransfer = { id: string; raw: bigint; decimals: number; time: Date }

const ERC20 = {
  USDT_ERC20: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  USDC_ERC20: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
} as const
const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pxL8otSzgjLj6t"

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`${new URL(url).host} -> ${res.status}`)
  return (await res.json()) as T
}

type EsploraTx = {
  txid: string
  status: { confirmed: boolean; block_time?: number }
  vout: { scriptpubkey_address?: string; value: number }[]
}

async function esplora(base: string, address: string): Promise<IncomingTransfer[]> {
  const txs = await getJson<EsploraTx[]>(`${base}/address/${address}/txs`)
  return txs
    .filter((tx) => tx.status.confirmed && tx.status.block_time)
    .map((tx) => ({
      id: tx.txid,
      raw: BigInt(tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((sum, o) => sum + o.value, 0)),
      decimals: 8,
      time: new Date(tx.status.block_time! * 1000),
    }))
    .filter((t) => t.raw > BigInt(0))
}

async function ethNative(address: string): Promise<IncomingTransfer[]> {
  type Item = { hash: string; value: string; timestamp: string; status: string; result: string; to?: { hash: string } }
  const data = await getJson<{ items: Item[] }>(`https://eth.blockscout.com/api/v2/addresses/${address}/transactions?filter=to`)
  return data.items
    .filter((i) => i.status === "ok" && i.result === "success" && i.to?.hash.toLowerCase() === address.toLowerCase())
    .map((i) => ({ id: i.hash, raw: BigInt(i.value), decimals: 18, time: new Date(i.timestamp) }))
}

async function erc20(address: string, token: string): Promise<IncomingTransfer[]> {
  type Item = {
    transaction_hash: string
    log_index: number
    timestamp: string
    to: { hash: string }
    token: { address_hash?: string; address?: string }
    total: { value: string; decimals: string }
  }
  const data = await getJson<{ items: Item[] }>(
    `https://eth.blockscout.com/api/v2/addresses/${address}/token-transfers?type=ERC-20&filter=to&token=${token}`,
  )
  return data.items
    .filter((i) => i.to.hash.toLowerCase() === address.toLowerCase())
    .filter((i) => (i.token.address_hash ?? i.token.address ?? "").toLowerCase() === token)
    .map((i) => ({
      id: `${i.transaction_hash}:${i.log_index}`,
      raw: BigInt(i.total.value),
      decimals: Number(i.total.decimals),
      time: new Date(i.timestamp),
    }))
}

async function tronNative(address: string): Promise<IncomingTransfer[]> {
  type Tx = {
    txID: string
    block_timestamp: number
    ret?: { contractRet?: string }[]
    raw_data: { contract: { type: string; parameter: { value: { amount?: number } } }[] }
  }
  const data = await getJson<{ data: Tx[] }>(
    `https://api.trongrid.io/v1/accounts/${address}/transactions?only_to=true&only_confirmed=true&limit=50`,
  )
  return data.data
    .filter((tx) => tx.ret?.[0]?.contractRet === "SUCCESS" && tx.raw_data.contract[0]?.type === "TransferContract")
    .map((tx) => ({
      id: tx.txID,
      raw: BigInt(tx.raw_data.contract[0].parameter.value.amount ?? 0),
      decimals: 6,
      time: new Date(tx.block_timestamp),
    }))
}

async function trc20(address: string): Promise<IncomingTransfer[]> {
  type Tx = { transaction_id: string; value: string; block_timestamp: number; to: string; token_info: { decimals: number } }
  const data = await getJson<{ data: Tx[] }>(
    `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_to=true&only_confirmed=true&limit=50&contract_address=${USDT_TRC20_CONTRACT}`,
  )
  return data.data
    .filter((tx) => tx.to === address)
    .map((tx) => ({ id: tx.transaction_id, raw: BigInt(tx.value), decimals: tx.token_info.decimals, time: new Date(tx.block_timestamp) }))
}

async function ton(address: string): Promise<IncomingTransfer[]> {
  type Tx = { utime: number; transaction_id: { hash: string }; in_msg?: { source?: string; value?: string } }
  const data = await getJson<{ ok: boolean; result: Tx[] }>(
    `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=50`,
  )
  return data.result
    .filter((tx) => tx.in_msg?.source && tx.in_msg.value && tx.in_msg.value !== "0")
    .map((tx) => ({ id: tx.transaction_id.hash, raw: BigInt(tx.in_msg!.value!), decimals: 9, time: new Date(tx.utime * 1000) }))
}

export function fetchIncoming(asset: AssetId, address: string): Promise<IncomingTransfer[]> {
  switch (asset) {
    case "BTC":
      return esplora("https://mempool.space/api", address)
    case "LTC":
      return esplora("https://litecoinspace.org/api", address)
    case "ETH":
      return ethNative(address)
    case "USDT_ERC20":
    case "USDC_ERC20":
      return erc20(address, ERC20[asset])
    case "TRX":
      return tronNative(address)
    case "USDT_TRC20":
      return trc20(address)
    case "TON":
      return ton(address)
  }
}
