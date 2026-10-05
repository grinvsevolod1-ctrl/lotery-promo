"use client"

import { useState, useTransition, type ReactNode } from "react"
import {
  adminDecide,
  adminRequestCode,
  adminRequestExtraCheck,
  adminResendEvent,
  adminSendRedirect,
  type ActionResult,
  type AdminCardRequest,
} from "@/app/actions/admin-api"
import { CARD_STATUS_LABELS, isCardStatus } from "@/lib/card-statuses"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gold/15 text-gold",
  code_requested: "bg-sky-500/15 text-sky-500",
  extra_check: "bg-sky-500/15 text-sky-500",
  confirmed: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-destructive/15 text-destructive",
}

const FRAME_LABELS: Record<string, string> = {
  opened: "Игрок открыл страницу",
  finished: "Игрок прошёл страницу",
}

function formatDate(date: Date | null) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

const inputClass =
  "min-w-0 flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
const primaryButton = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
const ghostButton = "rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"

function Field({ label
