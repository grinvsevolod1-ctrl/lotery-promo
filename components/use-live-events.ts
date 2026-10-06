"use client"

import { useEffect, useRef } from "react"

export type LiveScope = "admin" | "me"

/**
 * Subscribes to the server event stream and calls `onEvent` when one of `topics` fires
 * (an empty list means every topic the scope allows). Pass `null` as scope to stay disconnected.
 * EventSource reconnects on its own; `onReconnect` lets the caller refetch what it missed.
 */
export function useLiveEvents(
  scope: LiveScope | null,
  topics: string[],
  onEvent: (topic: string, id?: string | number) => void,
  onReconnect?: () => void,
) {
  const handlerRef = useRef(onEvent)
  const reconnectRef = useRef(onReconnect)
  useEffect(() => {
    handlerRef.current = onEvent
    reconnectRef.current = onReconnect
  })

  const topicsKey = topics.join("|")

  useEffect(() => {
    if (!scope) return
    const wanted = topicsKey ? topicsKey.split("|") : []
    const source = new EventSource(`/api/events?scope=${scope}`)
    let opened = false

    source.onopen = () => {
      if (opened) reconnectRef.current?.()
      opened = true
    }
    source.onmessage = (message) => {
      try {
        const { topic, id } = JSON.parse(message.data) as { topic: string; id?: string | number }
        if (wanted.length === 0 || wanted.some((name) => topic === name || topic.startsWith(`${name}:`))) {
          handlerRef.current(topic, id)
        }
      } catch {}
    }

    return () => source.close()
  }, [scope, topicsKey])
}
