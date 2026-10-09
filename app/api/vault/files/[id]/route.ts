import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { isVaultUnlocked } from "@/lib/vault-auth"
import { getVaultFile } from "@/lib/vault-files"
import { storedFilePath } from "@/lib/vault-storage"

export const runtime = "nodejs"

/** `Range: bytes=a-b` for one range; returns null when absent or malformed, "invalid" when outside the file. */
function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (match[1] === "" && match[2] === "")) return null
  let start: number
  let end: number
  if (match[1] === "") {
    const suffix = Number(match[2])
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1)
  }
  return start > end || start >= size ? "invalid" : { start, end }
}

/** Serves a stored file; `?inline=1` renders it in the browser (images, PDF, media), otherwise it downloads. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isVaultUnlocked())) return new Response("Unauthorized", { status: 401 })
  const { id } = await params
  const fileId = Number(id)
  if (!Number.isInteger(fileId) || fileId <= 0) return new Response("Not found", { status: 404 })
  const file = await getVaultFile(fileId)
  if (!file) return new Response("Not found", { status: 404 })

  const inline = new URL(request.url).searchParams.get("inline") === "1"
  const safeName = encodeURIComponent(file.name).replace(/['()]/g, escape)
  const baseHeaders = {
    "Content-Type": inline ? file.mimeType : "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${safeName}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  }

  if (!file.storagePath) {
    return new Response(new Uint8Array(file.data ?? Buffer.alloc(0)), { headers: { ...baseHeaders, "Content-Length": String(file.size) } })
  }

  const path = storedFilePath(file.storagePath)
  const info = await stat(path).catch(() => null)
  if (!info) return new Response("File is missing on disk", { status: 410 })

  const range = parseRange(request.headers.get("range"), info.size)
  if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } })

  const start = range?.start ?? 0
  const end = range?.end ?? info.size - 1
  const stream = createReadStream(path, { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: range ? 206 : 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(end - start + 1),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
    },
  })
}
