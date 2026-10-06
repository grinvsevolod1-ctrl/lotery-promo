import { getLuckAttempts } from "@/lib/luck-server"

export async function LuckBanner() {
  const attempts = await getLuckAttempts()
  if (attempts <= 1) return null
  return (
    <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
        {`x${attempts}`}
      </span>
      <p className="leading-relaxed">
        <strong>{`Буст удачи x${attempts} включён.`}</strong>{" "}
        {`Каждый билет и спин разыгрывается ${attempts} раз — вам засчитывается лучший результат.`}
      </p>
    </div>
  )
}
