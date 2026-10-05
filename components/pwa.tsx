'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DownloadMark, CheckMark } from '@/components/icons'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((fn) => fn())
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

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * "Install the app" CTA. Uses the native prompt when the browser offers one,
 * explains the "Add to Home Screen" gesture on iOS, and hides itself once
 * the app is already installed.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const [state, setState] = useState<'idle' | 'ready' | 'ios' | 'installed' | 'unsupported'>('idle')

  useEffect(() => {
    const update = () => {
      if (isStandalone()) setState('installed')
      else if (deferredPrompt) setState('ready')
      else if (isIos()) setState('ios')
      else setState('unsupported')
    }
    update()
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  const install = async () => {
    if (state === 'ready' && deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setState('installed')
      deferredPrompt = null
      return
    }
    if (state === 'ios') {
      window.alert('Нажмите «Поделиться» в Safari и выберите «На экран “Домой”», чтобы установить bytoloto.com как приложение.')
      return
    }
    window.alert('Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».')
  }

  if (state === 'installed') {
    return (
      <p className={`inline-flex items-center gap-2 text-sm font-semibold text-gold ${className ?? ''}`}>
        <CheckMark className="size-4" />
        Приложение установлено
      </p>
    )
  }

  return (
    <Button
      size="lg"
      onClick={install}
      disabled={state === 'idle'}
      className={`h-14 rounded-full px-10 text-base font-bold uppercase tracking-wide shadow-xl shadow-primary/40 transition-transform hover:scale-[1.03] ${className ?? ''}`}
    >
      <DownloadMark className="size-5" />
      Установить приложение
    </Button>
  )
}
