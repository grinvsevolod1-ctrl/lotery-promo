import "server-only"
import { randomUUID } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, open, readdir, rename, rm, stat } from "node:fs/promises"
import { join } from "node:path"
import { Readable } from "node:stream"
import { createGunzip } from "node:zlib"
import { db } from "@/lib/db"
import { vaultFile } from "@/lib/db/schema"

/** Browser uploads are cut into pieces of this size, so no proxy or body limit ever applies to the whole file. */
export const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024
export const UPLOAD_MAX_CHUNK_BYTES = 8 * 1024 * 1024

const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function root() {
  return process.env.VAULT_DIR || join(process.cwd(), ".vault")
}

const tmpDir = () => join(root(), "tmp")
const filesDir = () => join(root(), "files")

export const isUploadId = (value: unknown): value is string => typeof value === "string" && ID_PATTERN.test(value)

/** Final file location. `storagePath` is a bare UUID, so it can never point outside the vault directory. */
export function storedFilePath(storagePath: string) {
  if (!ID_PATTERN.test(storagePath)) throw new Error("Invalid vault storage path")
  return join(filesDir(), storagePath)
}

async function dropStaleUploads() {
  const names = await readdir(tmpDir()).catch(() => [] as string[])
  const now = Date.now()
  await Promise.all(
    names.map(async (name) => {
      const info = await stat(join(tmpDir(), name)).catch(() => null)
      if (info && now - info.mtimeMs > STALE_UPLOAD_MS) await rm(join(tmpDir(), name), { force: true })
    }),
  )
}

export async function startUpload() {
  await mkdir(tmpDir(), { recursive: true })
  await mkdir(filesDir(), { recursive: true })
  await dropStaleUploads()
  const id = randomUUID()
  const handle = await open(join(tmpDir(), id), "w")
  await handle.close()
  return id
}

/** Writes one piece at its exact offset. A repeated or out-of-order piece is refused so the client can resync. */
export async function appendChunk(id: string, offset: number, chunk: Buffer): Promise<{ ok: true; received: number } | { ok: false; received: number | null }> {
  const path = join(tmpDir(), id)
  const info = await stat(path).catch(() => null)
  if (!info) return { ok: false, received: null }
  if (info.size !== offset) return { ok: false, received: info.size }
  const handle = await open(path, "r+")
  try {
    await handle.write(chunk, 0, chunk.byteLength, offset)
  } finally {
    await handle.close()
  }
  return { ok: true, received: offset + chunk.byteLength }
}

export type FinishedUpload = { name: string; size: number; mimeType: string; caption: string | null }

export async function finishUpload(id: string, meta: FinishedUpload): Promise<{ ok: true; fileId: number } | { ok: false; received: number | null }> {
  const tmp = join(tmpDir(), id)
  const info = await stat(tmp).catch(() => null)
  if (!info) return { ok: false, received: null }
  if (info.size !== meta.size) return { ok: false, received: info.size }

  await rename(tmp, storedFilePath(id))
  try {
    const inserted = await db
      .insert(vaultFile)
      .values({
        telegramFileUniqueId: `upload:${id}`,
        kind: "upload",
        name: meta.name,
        mimeType: meta.mimeType,
        size: meta.size,
        storagePath: id,
        caption: meta.caption,
        chatId: "manual",
        senderName: "Загружено вручную",
      })
      .returning({ id: vaultFile.id })
    return { ok: true, fileId: inserted[0].id }
  } catch (error) {
    await rm(storedFilePath(id), { force: true })
    throw error
  }
}

export async function abortUpload(id: string) {
  await rm(join(tmpDir(), id), { force: true })
}

export async function removeStoredFile(storagePath: string) {
  await rm(storedFilePath(storagePath), { force: true })
}

/**
 * Reads the beginning of a stored file as bytes for the text viewers, unpacking .gz on the fly.
 * Stops after `cap` bytes, so a multi-gigabyte dump never has to fit in memory.
 */
export async function readHead(
  file: { storagePath: string | null; data: Buffer | null },
  gzip: boolean,
  cap: number,
): Promise<{ bytes: Buffer; truncated: boolean } | { error: string }> {
  const source: Readable = file.storagePath ? createReadStream(storedFilePath(file.storagePath)) : Readable.from([file.data ?? Buffer.alloc(0)])
  let stream: Readable = source
  if (gzip) {
    const gunzip = createGunzip()
    source.on("error", (error) => gunzip.destroy(error))
    stream = source.pipe(gunzip)
  }

  const parts: Buffer[] = []
  let total = 0
  try {
    for await (const chunk of stream) {
      parts.push(chunk as Buffer)
      total += (chunk as Buffer).byteLength
      if (total > cap) break
    }
  } catch {
    return { error: gzip ? "Не удалось распаковать gzip." : "Не удалось прочитать файл." }
  } finally {
    stream.destroy()
    source.destroy()
  }
  const all = Buffer.concat(parts)
  return { bytes: all.subarray(0, cap), truncated: total > cap }
}
