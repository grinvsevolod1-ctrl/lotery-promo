"use client"

import { useEffect, useRef } from "react"

type Scope = "admin" | "me"

/**
 * Subscribes to the server event stream and calls `onEvent` when one of `topics` fires.
 * EventSource reconnects on its own; `onReconnect` lets the caller refetch what it missed.
 */
export function useLiveEvents(
  scope: Scope,
  topics: string[],
  onEvent: (topic: string) => void,
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
    const wanted = topicsKey ? topicsKey.split("|") : []
    const source = new EventSource(`/api/events?scope=${scope}`)
    let opened = false

    source.onopen = () => {
      if (opened) reconnectRef.current?.()
      opened = true
    }
    source.onmessage = (message) => {
      try {
        const { topic } = JSON.parse(message.data) as { topic: string }
        if (wanted.some((wantedTopic) => topic === wantedTopic || topic.startsWith(`${wantedTopic}:`)) || wanted.length === 0) {
          handlerRef.current(topic)
        }
      } catch {}
    }

    return () => source.close()
  }, [scope, topicsKey])
}
