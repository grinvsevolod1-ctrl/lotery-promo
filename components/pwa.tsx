'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { DownloadMark, CheckMark } from '@/components/icons'
import { cn } from '@/lib/utils'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

/** Registers the service worker in production so the site becomes installable. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((error) => console.error('[pwa] registration failed', error))
  }, [])
  return null
}

type Platform = 'installed' | 'native' | 'ios-safari' | 'ios-other' | 'android' | 'desktop'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  if (installed || standalone) return 'installed'
  if (deferredPrompt) return 'native'
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (ios) return /crios|fxios|edgios|yabrowser|opios/i.test(ua) ? 'ios-other' : 'ios-safari'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function usePlatform(): Platform | null {
  return useSyncExternalStore(subscribe, detectPlatform, () => null)
}

const STEPS: Record<Exclude<Platform, 'installed' | 'native'>, { title: string; steps: string[] }> = {
  'ios-safari': {
    title: 'Установка на iPhone',
    steps: [
      'Нажмите кнопку «Поделиться» внизу Safari (квадрат со стрелкой вверх).',
      'Пролистайте список и выберите «На экран “Домой”».',
      'Нажмите «Добавить» — иконка bytoloto.com появится на рабочем столе.',
    ],
  },
  'ios-other': {
    title: 'Установка на iPhone',
    steps: [
      'Нажмите кнопку «Поделиться» в адресной строке браузера.',
      'Выберите «На экран “Домой”». Если пункта нет — откройте bytoloto.com в Safari.',
      'Нажмите «Добавить» — приложение появится на рабочем столе.',
    ],
  },
  android: {
    title: 'Установка на Android',
    steps: [
      'Откройте меню браузера — три точки в правом верхнем углу.',
      'Выберите «Установить приложение» или «Добавить на главный экран».',
      'Подтвердите установку — иконка появится среди приложений.',
    ],
  },
  desktop: {
    title: 'Установка на компьютер',
    steps: [
      'Откройте сайт в Chrome, Edge или Яндекс Браузере.',
      'Нажмите значок установки справа в адресной строке или откройте меню браузера.',
      'Выберите «Установить bytoloto.com».',
    ],
  },
}

export function InstallAppButton({ className }: { className?: string }) {
  const platform = usePlatform()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (platform === 'installed') {
    return (
      <p className={cn('inline-flex items-center gap-2 text-sm font-semibold text-gold', className)}>
        <CheckMark className="size-4" />
        Приложение установлено
      </p>
    )
  }

  const install = async () => {
    if (platform === 'native' && deferredPrompt) {
      const prompt = deferredPrompt
      deferredPrompt = null
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') installed = true
      notify()
      return
    }
    setSheetOpen(true)
  }

  return (
    <>
      <Button
        size="lg"
        onClick={install}
        disabled={platform === null}
        className={cn(
          'h-14 rounded-full px-10 text-base font-bold shadow-xl shadow-primary/30 transition-transform duration-200 active:scale-[0.97]',
          className,
        )}
      >
        <DownloadMark className="size-5" />
        Установить приложение
      </Button>
      {platform && platform !== 'native' && (
        <InstallSheet open={sheetOpen} onClose={() => setSheetOpen(false)} guide={STEPS[platform]} />
      )}
    </>
  )
}

function InstallSheet({
  open,
  onClose,
  guide,
}: {
  open: boolean
  onClose: () => void
  guide: { title: string; steps: string[] }
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <div className={cn('fixed inset-0 z-[100]', !open && 'pointer-events-none')} aria-hidden={!open}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Закрыть"
        onClick={onClose}
        className={cn('absolute inset-0 bg-foreground/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className={cn(
          'absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[32px] bg-card px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-3 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:bottom-6 sm:rounded-[32px]',
          open ? 'translate-y-0' : 'translate-y-[110%]',
        )}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" aria-hidden />
        <div className="mt-5 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-14 rounded-2xl shadow-md ring-1 ring-border" />
          <div>
            <h2 id="install-title" className="font-display text-xl font-extrabold tracking-tight">
              {guide.title}
            </h2>
            <p className="text-sm text-muted-foreground">Три шага — и bytoloto.com всегда под рукой</p>
          </div>
        </div>
        <ol className="mt-6 flex flex-col gap-3">
          {guide.steps.map((step, i) => (
            <li key={step} className="flex gap-4 rounded-2xl bg-secondary p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-[15px] leading-snug text-foreground text-pretty">{step}</span>
            </li>
          ))}
        </ol>
        <Button onClick={onClose} variant="secondary" className="mt-6 h-14 w-full rounded-full text-base font-bold">
          Понятно
        </Button>
      </div>
    </div>,
    document.body,
  )
}
