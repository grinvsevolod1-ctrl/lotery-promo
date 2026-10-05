'use client'

import { useState } from 'react'
import { Reveal } from '@/components/reveal'
import { PlusMark, QueryMark } from '@/components/icons'
import { FAQ } from '@/lib/faq'
import { site } from '@/lib/site'

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative pt-14 pb-4 sm:pt-20">
      <div className="mx-auto w-full max-w-3xl px-4">
        <Reveal>
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <QueryMark className="h-4 w-4" />
              Вопросы и ответы
            </span>
            <h2 className="mt-5 text-balance font-display text-3xl font-extrabold sm:text-5xl">
              Коротко о главном
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
              Всё, что нужно знать перед первой игрой. Не нашли ответ — напишите нам.
            </p>
          </div>
        </Reveal>

        <div className="flex flex-col gap-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i
            return (
              <Reveal key={item.q} delay={i * 70}>
                <div
                  className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
                    isOpen
                      ? 'border-primary/40 bg-card/80 shadow-[0_0_40px_-12px_var(--color-primary)]'
                      : 'border-border/60 bg-card/40 hover:border-primary/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="font-display text-sm font-bold text-primary/70 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-pretty text-base font-semibold sm:text-lg">
                      {item.q}
                    </span>
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-transform duration-300 ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                    >
                      <PlusMark className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className="text-pretty px-5 pb-6 pl-14 text-muted-foreground sm:px-6 sm:pl-16">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
