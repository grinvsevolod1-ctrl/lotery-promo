import { getCardVerificationPreview } from "@/app/actions/cards"
import { GatewayConfirm } from "@/components/pay/gateway-confirm"
import { ShieldMark, WarnMark } from "@/components/icons"

export const metadata = {
  title: "Подтверждение платежа — ToLoto Pay",
  robots: { index: false, follow: false },
}

export default async function PayConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let preview = null
  try {
    preview = await getCardVerificationPreview(token)
  } catch {
    preview = null
  }

  if (!preview) return <ExpiredGateway />

  return <GatewayConfirm token={token} preview={preview} />
}

function ExpiredGateway() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[oklch(0.14_0.02_280)] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2.5 border-b border-foreground/10 bg-gradient-to-r from-primary/15 via-transparent to-transparent px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldMark className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">ToLoto Pay</p>
            <p className="text-[11px] text-muted-foreground">Платёжный шлюз</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <WarnMark className="size-7" />
          </span>
          <p className="text-lg font-bold text-foreground">Сессия подтверждения истекла</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Ссылка действует 5 минут. Вернитесь в кабинет и привяжите карту ещё раз.
          </p>
          <a
            href="/cabinet/cards"
            className="mt-2 flex h-11 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Вернуться в кабинет
          </a>
        </div>
      </div>
    </main>
  )
}
