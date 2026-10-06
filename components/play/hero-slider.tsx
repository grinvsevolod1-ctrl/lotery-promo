"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type HeroSlide = { id: string; href: string; eyebrow: string; title: string; text: string; image: string; cta: string }

const INTERVAL = 5000

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const track = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root: el, threshold: 0.6 },
    )
    el.querySelectorAll("li").forEach((li) => observer.observe(li))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => goTo((active + 1) % slides.length), INTERVAL)
    return () => clearInterval(id)
  }, [active, paused, slides.length])

  function goTo(index: number) {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Акции и игры"
      className="relative"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ul ref={track} className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((slide, i) => (
          <li
            key={slide.id}
            data-index={i}
            aria-roledescription="slide"
            aria-label={`${i + 1} из ${slides.length}`}
            className="relative w-full shrink-0 snap-center"
          >
            <Link href={slide.href} className="group relative flex aspect-[16/9] w-full flex-col justify-end overflow-hidden bg-[#141a2a] p-5 text-background sm:aspect-[16/7] sm:p-7">
              <Image
                src={slide.image}
                alt=""
                fill
                priority={i === 0}
                sizes="(min-width: 768px) 720px, 100vw"
                className="object-cover transition duration-700 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-gradient-to-r from-[#0d1220]/90 via-[#0d1220]/45 to-transparent" aria-hidden="true" />
              <span className="relative flex max-w-[70%] flex-col items-start gap-1.5">
                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground">
                  {slide.eyebrow}
                </span>
                <span className="font-display text-2xl font-black leading-tight text-balance sm:text-4xl">{slide.title}</span>
                <span className="text-sm leading-relaxed text-background/85 text-pretty">{slide.text}</span>
                <span className="mt-2 inline-flex items-center rounded-xl bg-background px-4 py-2 text-sm font-extrabold text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                  {slide.cta}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Слайд ${i + 1}`}
            aria-current={i === active}
            className={cn("h-1.5 rounded-full transition-all duration-300", i === active ? "w-6 bg-primary" : "w-1.5 bg-background/60")}
          />
        ))}
      </div>
    </section>
  )
}
