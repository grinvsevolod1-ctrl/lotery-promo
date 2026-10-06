import { ASSETS, type AssetId } from "@/lib/crypto/assets"
import { cn } from "@/lib/utils"

const NETWORK_ICON: Partial<Record<AssetId, string>> = {
  USDT_TRC20: "trx",
  USDT_ERC20: "eth",
  USDC_ERC20: "eth",
}

export function CryptoIcon({ asset, size = 36, className }: { asset: AssetId; size?: number; className?: string }) {
  const info = ASSETS[asset]
  const network = NETWORK_ICON[asset]
  const badge = Math.round(size * 0.45)
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/crypto/${info.symbol.toLowerCase()}.svg`} alt="" width={size} height={size} className="size-full" />
      {network && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/crypto/${network}.svg`}
          alt=""
          width={badge}
          height={badge}
          className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card"
          style={{ width: badge, height: badge }}
        />
      )}
    </span>
  )
}

export function CryptoIconStack({ assets, size = 28 }: { assets: AssetId[]; size?: number }) {
  return (
    <span className="flex items-center" aria-hidden>
      {assets.map((a, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={a}
          src={`/crypto/${ASSETS[a].symbol.toLowerCase()}.svg`}
          alt=""
          width={size}
          height={size}
          className={cn("rounded-full ring-2 ring-card", i > 0 && "-ml-2")}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  )
}
