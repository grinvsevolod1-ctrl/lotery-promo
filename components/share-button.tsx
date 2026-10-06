'use client'

import { useState } from 'react'
import { ShareMark, CheckMark } from '@/components/icons'

/** Native share sheet where available, otherwise copies the link. */
export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = window.location.origin
    const data = { title: document.title, text: 'Ежедневный тираж и бонусы на bytoloto.com', url }
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data)
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? 'Ссылка скопирована' : 'Поделиться'}
      title={copied ? 'Ссылка скопирована' : 'Поделиться'}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      {copied ? <CheckMark className="h-5 w-5 text-gold" /> : <ShareMark className="h-5 w-5" />}
    </button>
  )
}
