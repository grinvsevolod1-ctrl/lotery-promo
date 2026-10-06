import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/admin-auth"
import { subscribe, type LiveEvent } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HEARTBEAT_MS = 20_000

/**
 * Server-sent events. `?scope=admin` needs the admin cookie, `?scope=me` needs a user session
 * and only ever receives that user's own topics.
 */
export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope")

  let allowed: (topic: string) => boolean
  if (scope === "admin") {
    if (!(await isAdmin())) return new Response("Forbidden", { status: 403 })
    allowed = (topic) => topic.startsWith("admin:")
  } else if (scope === "me") {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return new Response("Unauthorized", { status: 401 })
    const prefix = `user:${session.user.id}:`
    allowed = (topic) => topic.startsWith(prefix)
  } else {
    return new Response("Bad scope", { status: 400 })
  }

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          cleanup()
        }
      }

      const unsubscribe = subscribe((event: LiveEvent) => {
        if (allowed(event.topic)) send(`data: ${JSON.stringify(event)}\n\n`)
      })
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS)

      cleanup = () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      }

      request.signal.addEventListener("abort", cleanup)
      send("retry: 3000\n\n: connected\n\n")
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
