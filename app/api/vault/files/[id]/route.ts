import { isVaultUnlocked } from "@/lib/vault-auth"
import { getVaultFile } from "@/lib/vault-files"

export const runtime = "nodejs"

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
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": inline ? file.mimeType : "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${safeName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
