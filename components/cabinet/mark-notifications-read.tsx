"use client"

import { useEffect } from "react"
import { markAllNotificationsRead } from "@/app/actions/notifications"

/** Opening the inbox counts as reading it; the highlighted items stay visible until the next visit. */
export function MarkNotificationsRead() {
  useEffect(() => {
    const timer = setTimeout(() => void markAllNotificationsRead(), 1500)
    return () => clearTimeout(timer)
  }, [])
  return null
}
