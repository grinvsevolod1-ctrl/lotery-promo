"use client"

import { useActionState, useState } from "react"
import { Ban, ChevronDown, ShieldCheck, Wallet } from "lucide-react"
import {
  adjustPlayerBalance,
  requestPlayerAdditionalVerification,
  requestPlayerVerification,
  setPlayerBlock,
  type ActionResult,
  type PlayerRow,
} from "@/app/actions/admin-players"
import { ActionMessage, fieldClass, labelClass } from "@/components/admin/player-form-ui"

const VERIFICATION_LABEL: Record<string, { text: string; className: string }> = {
  approved: { text: "Верифицирован", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  pending: { text: "На проверке", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  code: { text: "Ждём код", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  code_review: { text: "Проверить код", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  rejected: { text: "Отклонена", className: "bg-destructive/15 text-destructive" },
}

const money = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

export function PlayersPanel({ players }: { players: PlayerRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (players.length === 0) {
    return <p className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">Пользователи не найдены</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => {
        const open = openId === player.id
        const verification = player.verification ? VERIFICATION_LABEL[player.verification] : null
        return (
          <li key={player.id} className="overflow-hidden rounded-2xl border border-border/60 bg-background">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : player.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-foreground">{player.name || "Без имени"}</span>
                  {player.blockedAt && (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Заблокирован</span>
                  )}
                  {verification ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${verification.className}`}>{verification.text}</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Без верификации</span>
                  )}
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {player.email}
                  {!player.emailVerified && " · почта не подтверждена"}
                </span>
                <span className="text-xs text-muted-foreground">Регистрация {date.format(new Date(player.createdAt))}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-display text-base font-extrabold tabular-nums text-foreground">{money.format(player.balance)}</span>
                <span className="text-xs text-muted-foreground">BYN</span>
              </div>
              <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {open && <PlayerActions player={player} />}
          </li>
        )
      })}
    </ul>
  )
}

function PlayerActions({ player }: { player: PlayerRow }) {
  return (
    <div className="grid gap-4 border-t border-border/60 p-4 lg:grid-cols-3">
      {player.blockedAt && player.blockReason && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive lg:col-span-3">
          Причина блокировки: {player.blockReason}
        </p>
      )}
      <BalanceForm userId={player.id} />
      <BlockForm player={player} />
      <VerificationForm userId={player.id} approved={player.verification === "approved"} />
    </div>
  )
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function BalanceForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(adjustPlayerBalance, null)
  return (
    <Card icon={<Wallet className="size-4 text-primary" aria-hidden />} title="Баланс">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="userId" value={userId} />
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            Действие
            <select name="operation" defaultValue="credit" className={fieldClass}>
              <option value="credit">Начислить</option>
              <option value="debit">Списать</option>
            </select>
          </label>
          <label className={labelClass}>
            Тип
            <select name="kind" defaultValue="real" className={fieldClass}>
              <option value="real">Реальные</option>
              <option value="bonus">Бонус</option>
            </select>
          </label>
        </div>
        <label className={labelClass}>
          Сумма, BYN
          <input name="amount" inputMode="decimal" required placeholder="10,00" className={fieldClass} />
        </label>
        <label className={labelClass}>
          Комментарий
          <input name="comment" maxLength={300} placeholder="Компенсация за тираж" className={fieldClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="sendEmail" defaultChecked className="size-4 accent-primary" />
          Уведомить на почту
        </label>
        <button type="submit" disabled={pending} className="h-10 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? "Сохранение…" : "Применить"}
        </button>
        <ActionMessage state={state} />
      </form>
    </Card>
  )
}

function BlockForm({ player }: { player: PlayerRow }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(setPlayerBlock, null)
  const blocked = Boolean(player.blockedAt)
  return (
    <Card icon={<Ban className="size-4 text-destructive" aria-hidden />} title={blocked ? "Разблокировка" : "Блокировка"}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="userId" value={player.id} />
        <input type="hidden" name="block" value={blocked ? "0" : "1"} />
        {!blocked && (
          <label className={labelClass}>
            Причина
            <textarea name="reason" required rows={3} maxLength={300} placeholder="Мультиаккаунт" className={`${fieldClass} h-auto py-2`} />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="sendEmail" defaultChecked className="size-4 accent-primary" />
          Уведомить на почту
        </label>
        <button
          type="submit"
          disabled={pending}
          className={
            blocked
              ? "h-10 rounded-full border border-border text-sm font-semibold text-foreground disabled:opacity-60"
              : "h-10 rounded-full bg-destructive text-sm font-semibold text-white disabled:opacity-60"
          }
        >
          {pending ? "Сохранение…" : blocked ? "Разблокировать" : "Заблокировать"}
        </button>
        <ActionMessage state={state} />
      </form>
    </Card>
  )
}

function AdditionalVerificationForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(requestPlayerAdditionalVerification, null)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-sm text-muted-foreground">Пользователь уже прошёл верификацию.</p>
      <label className={labelClass}>
        Сообщение (необязательно)
        <textarea name="note" rows={3} maxLength={500} placeholder="Например: подтвердите номер телефона" className={`${fieldClass} h-auto py-2`} />
      </label>
      <p className="text-xs text-muted-foreground">
        Пользователь получит уведомление в кабинете и письмо на почту, ему выдадут новый код подтверждения.
      </p>
      <button type="submit" disabled={pending} className="h-10 rounded-full bg-foreground text-sm font-semibold text-background disabled:opacity-60">
        {pending ? "Отправка…" : "Дополнительная верификация"}
      </button>
      <ActionMessage state={state} />
    </form>
  )
}

function VerificationForm({ userId, approved }: { userId: string; approved: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(requestPlayerVerification, null)
  return (
    <Card icon={<ShieldCheck className="size-4 text-primary" aria-hidden />} title="Верификация">
      {approved ? (
        <AdditionalVerificationForm userId={userId} />
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="userId" value={userId} />
          <label className={labelClass}>
            Сообщение (необязательно)
            <textarea name="note" rows={3} maxLength={500} placeholder="Для вывода выигрыша нужно подтвердить личность" className={`${fieldClass} h-auto py-2`} />
          </label>
          <p className="text-xs text-muted-foreground">Пользователь получит уведомление в кабинете и письмо на почту.</p>
          <button type="submit" disabled={pending} className="h-10 rounded-full bg-foreground text-sm font-semibold text-background disabled:opacity-60">
            {pending ? "Отправка…" : "Запросить верификацию"}
          </button>
          <ActionMessage state={state} />
        </form>
      )}
    </Card>
  )
}
