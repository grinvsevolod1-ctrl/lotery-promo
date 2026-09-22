'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Search, Ticket, XCircle } from 'lucide-react'

type Result =
  | { status: 'win'; amount: string }
  | { status: 'lose' }
  | { status: 'invalid' }

export function TicketChecker() {
  const [draw, setDraw] = useState('')
  const [serial, setSerial] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  function handleCheck(e: React.FormEvent) {
    e.preventDefault()

    const clean = serial.replace(/\s/g, '')
    if (draw.trim().length < 3 || clean.length < 6) {
      setResult({ status: 'invalid' })
      return
    }

    // Демонстрационная проверка: последняя цифра серии определяет исход
    const last = Number(clean[clean.length - 1])
    if (Number.isNaN(last)) {
      setResult({ status: 'invalid' })
      return
    }
    if (last >= 7) {
      const amounts = ['15 Br', '120 Br', '1 500 Br']
      setResult({ status: 'win', amount: amounts[last % amounts.length] })
    } else {
      setResult({ status: 'lose' })
    }
  }

  return (
    <section id="check" className="scroll-mt-24 bg-primary py-16 text-primary-foreground md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            Мгновенная проверка
          </p>
          <h2 className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-balance md:text-4xl">
            Проверьте свой билет за пару секунд
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80 text-pretty">
            Введите номер тиража и серию билета. Система сверит комбинацию с
            официальными результатами розыгрыша. Выплата выигрышей — в любом
            пункте продаж или на карту.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-primary-foreground/80">
            {[
              'Выигрыши до 200 Br — в любом киоске',
              'Крупные суммы — в отделениях банка-агента',
              'Срок получения выигрыша — 6 месяцев',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-primary-foreground/15 bg-card p-6 text-card-foreground shadow-2xl md:p-8">
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label
                htmlFor="draw"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Номер тиража
              </label>
              <input
                id="draw"
                value={draw}
                onChange={(e) => setDraw(e.target.value)}
                inputMode="numeric"
                placeholder="Например, 1486"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label
                htmlFor="serial"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Серия и номер билета
              </label>
              <input
                id="serial"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="AB 123456"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              size="lg"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Проверить билет
            </Button>
          </form>

          {result && (
            <div
              className="mt-5 rounded-lg border p-4 text-sm"
              role="status"
              aria-live="polite"
            >
              {result.status === 'win' && (
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
                  Поздравляем! Ваш билет выиграл{' '}
                  <span className="font-heading font-bold text-primary">
                    {result.amount}
                  </span>
                </p>
              )}
              {result.status === 'lose' && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-5 w-5" aria-hidden="true" />
                  Этот билет не выиграл. Попробуйте в следующем тираже!
                </p>
              )}
              {result.status === 'invalid' && (
                <p className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" aria-hidden="true" />
                  Проверьте правильность номера тиража и серии билета.
                </p>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Демонстрационная проверка. Официальные данные — в личном кабинете.
          </p>
        </div>
      </div>
    </section>
  )
}
