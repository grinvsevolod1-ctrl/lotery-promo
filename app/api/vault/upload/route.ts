import { isVaultUnlocked } from "@/lib/vault-auth"
import { UPLOAD_CHUNK_BYTES, UPLOAD_MAX_CHUNK_BYTES, abortUpload, appendChunk, finishUpload, isUploadId, startUpload } from "@/lib/vault-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } })

/** Chunked upload, three steps: POST {step:"init"} -> PUT chunks at their offset -> POST {step:"done"}. */
export async function POST(request: Request) {
  if (!(await isVaultUnlocked())) return json({ error: "Сессия истекла. Войдите заново." }, 401)
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return json({ error: "Некорректный запрос." }, 400)

  if (body.step === "init") {
    const id = await startUpload()
    return json({ id, chunkSize: UPLOAD_CHUNK_BYTES })
  }

  if (body.step === "abort" && isUploadId(body.id)) {
    await abortUpload(body.id)
    return json({ ok: true })
  }

  if (body.step === "done") {
    const { id, name, size, mimeType, caption } = body
    if (!isUploadId(id) || typeof name !== "string" || typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) {
      return json({ error: "Некорректные данные файла." }, 400)
    }
    const cleanName = name.replace(/[\\/\u0000-\u001f]/g, "_").trim().slice(0, 255) || "file"
    const result = await finishUpload(id, {
      name: cleanName,
      size,
      mimeType: (typeof mimeType === "string" && mimeType ? mimeType : "application/octet-stream").slice(0, 120),
      caption: typeof caption === "string" && caption.trim() ? caption.trim().slice(0, 2000) : null,
    })
    if (!result.ok) return json({ error: "Размер файла на сервере не совпал с исходным.", received: result.received }, 409)
    return json({ ok: true, fileId: result.fileId })
  }

  return json({ error: "Неизвестный шаг." }, 400)
}

export async function PUT(request: Request) {
  if (!(await isVaultUnlocked())) return json({ error: "Сессия истекла. Войдите заново." }, 401)
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  const offset = Number(url.searchParams.get("offset"))
  if (!isUploadId(id) || !Number.isSafeInteger(offset) || offset < 0) return json({ error: "Некорректный запрос." }, 400)

  const chunk = Buffer.from(await request.arrayBuffer())
  if (chunk.byteLength === 0 || chunk.byteLength > UPLOAD_MAX_CHUNK_BYTES) return json({ error: "Недопустимый размер части." }, 400)

  const result = await appendChunk(id, offset, chunk)
  if (!result.ok) return json({ error: "Часть пришла не по порядку.", received: result.received }, 409)
  return json({ received: result.received })
}
