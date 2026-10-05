"use client"

import { useEffect } from "react"
import { isStaleDeploymentError, reloadForNewDeployment } from "@/lib/action-error"

export function StaleDeploymentGuard() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleDeploymentError(event.reason)) {
        event.preventDefault()
        reloadForNewDeployment()
      }
    }
    window.addEventListener("unhandledrejection", onRejection)
    return () => window.removeEventListener("unhandledrejection", onRejection)
  }, [])
  return null
}
