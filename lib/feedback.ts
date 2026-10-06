"use client"

import { useSyncExternalStore } from "react"

const STORAGE_KEY = "bytoloto:sound"
const listeners = new Set<() => void>()
let audio: AudioContext | null = null

function read(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(STORAGE_KEY) !== "off"
}

export function setFeedbackEnabled(enabled: boolean) {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")
  listeners.forEach((l) => l())
  if (enabled) tap()
}

export function useFeedbackEnabled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => false,
  )
}

function ctx() {
  if (!audio) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audio = new Ctor()
  }
  if (audio.state === "suspended") void audio.resume()
  return audio
}

function tone(freq: number, start: number, duration: number, volume = 0.08, type: OscillatorType = "triangle") {
  const ac = ctx()
  if (!ac) return
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern)
}

export function tap() {
  if (!read()) return
  tone(880, 0, 0.06, 0.04, "sine")
  vibrate(8)
}

/** Ball/peg style tick, intentionally quiet so many balls don't get loud. */
export function tick() {
  if (!read()) return
  tone(1200 + Math.random() * 400, 0, 0.03, 0.015, "sine")
}

export function win(multiplier: number) {
  if (!read()) return
  if (multiplier >= 5) {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.25, 0.07))
    vibrate([30, 40, 30, 40, 80])
  } else if (multiplier > 1) {
    ;[659, 988].forEach((f, i) => tone(f, i * 0.07, 0.18, 0.06))
    vibrate(20)
  } else {
    tone(330, 0, 0.12, 0.04, "sine")
  }
}
