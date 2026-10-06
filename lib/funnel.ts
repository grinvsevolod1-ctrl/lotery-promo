import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

export const FUNNEL_PERIODS = [1, 7, 30] as const
export type FunnelPeriod = (typeof FUNNEL_PERIODS)[number]

export type FunnelStep = { key: string; label: string; hint: string; count: number }
export type FunnelReport = { steps: FunnelStep[]; byDevice: { device: string; visitors: number; signups: number; deposits: number }[] }

const goal = (names: string[]) =>
  sql.raw(`(e.type = 'funnel' and split_part(e.label, ' ', 1) in (${names.map((n) => `'${n}'`).join(",")}))`)

/**
 * Cohort funnel: devices first seen within the period (bots excluded) and how many of them
 * reached each step. Server-logged events (sign_up, deposit, game) are counted together with
 * client goals so the numbers stay correct even when a beacon is blocked.
 */
export async function getFunnelReport(days: FunnelPeriod): Promise<FunnelReport> {
  const since = new Date(Date.now() - days * 86_400_000)

  const promo = goal(["promo_view"])
  const cta = goal(["promo_signup_click", "header_signup_click", "banner_click", "guest_game_click"])
  const form = goal(["signup_view"])
  const signup = sql.raw(`(e.type = 'sign_up' or (e.type = 'funnel' and split_part(e.label, ' ', 1) = 'signup_success'))`)
  const depositView = goal(["deposit_view"])
  const deposit = sql.raw(`(e.type = 'deposit' or (e.type = 'funnel' and split_part(e.label, ' ', 1) in ('deposit_request','crypto_invoice')))`)
  const game = sql.raw(`(e.type = 'game' or (e.type = 'funnel' and split_part(e.label, ' ', 1) = 'game_open'))`)

  const result = await db.execute<Record<string, string | number>>(sql`
    select
      count(distinct v.id) as visitors,
      count(distinct v.id) filter (where ${promo}) as promo,
      count(distinct v.id) filter (where ${cta}) as cta,
      count(distinct v.id) filter (where ${form}) as form,
      count(distinct v.id) filter (where ${signup}) as signup,
      count(distinct v.id) filter (where ${depositView}) as deposit_view,
      count(distinct v.id) filter (where ${deposit}) as deposit,
      count(distinct v.id) filter (where ${game}) as game
    from visitor v
    left join visitor_event e on e."visitorId" = v.id
    where v."firstSeenAt" >= ${since} and v."deviceType" <> 'bot'
  `)
  const row = result.rows[0] ?? {}
  const n = (key: string) => Number(row[key] ?? 0)

  const devices = await db.execute<{ device: string; visitors: string; signups: string; deposits: string }>(sql`
    select v."deviceType" as device,
      count(distinct v.id) as visitors,
      count(distinct v.id) filter (where ${signup}) as signups,
      count(distinct v.id) filter (where ${deposit}) as deposits
    from visitor v
    left join visitor_event e on e."visitorId" = v.id
    where v."firstSeenAt" >= ${since} and v."deviceType" <> 'bot'
    group by v."deviceType"
    order by visitors desc
  `)

  return {
    steps: [
      { key: "visitors", label: "Зашли на сайт", hint: "Новые устройства за период", count: n("visitors") },
      { key: "promo", label: "Увидели окно «100 BYN»", hint: "Показ приветственной модалки", count: n("promo") },
      { key: "cta", label: "Нажали «Регистрация»", hint: "Модалка, шапка, баннер или клик по игре", count: n("cta") },
      { key: "form", label: "Открыли форму", hint: "Страница регистрации", count: n("form") },
      { key: "signup", label: "Зарегистрировались", hint: "Аккаунт создан", count: n("signup") },
      { key: "deposit_view", label: "Открыли пополнение", hint: "Страница кошелька", count: n("deposit_view") },
      { key: "deposit", label: "Отправили пополнение", hint: "Заявка картой или крипто-счёт", count: n("deposit") },
      { key: "game", label: "Запустили игру", hint: "Открыли любую игру", count: n("game") },
    ],
    byDevice: devices.rows.map((d) => ({
      device: d.device,
      visitors: Number(d.visitors),
      signups: Number(d.signups),
      deposits: Number(d.deposits),
    })),
  }
}
