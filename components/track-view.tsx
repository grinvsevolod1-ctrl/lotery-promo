"use client"

import { useEffect } from "react"
import { track, type Goal } from "@/lib/analytics"

export function TrackView({ goal }: { goal: Goal }) {
  useEffect(() => {
    track(goal)
  }, [goal])
  return null
}
