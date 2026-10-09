import "server-only"
import { desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { vaultFile } from "@/lib/db/schema"
import { getTelegramConfig } from "@/lib/telegram-config"
import { isForeignDeployment } from "@/lib/deployment-guard"

/** Telegram lets bots download files up to 20 MB through getFile. */
export const VAULT_MAX_FILE_BYTES = 20 * 1024 * 1024

type TelegramFileRef = { file_id: string; file_unique_id: string; file_size?: number; file_name?: string; mime_type?: string; width?: number }
type TelegramUser = { id?: number; first_name?: string; last_name?: string; username?: string }

export type TelegramFileMessage = {
  message_id?: number
  chat?: { id: number }
  from?: TelegramUser
  caption?: string
  document?: TelegramFileRef
  photo?: TelegramFileRef[]
  video?: TelegramFileRef
  audio?: TelegramFileRef
  voice?: TelegramFileRef
}

export type VaultKind = "document" | "photo" | "video" | "audio" | "voice"

/** A refusal whose message is safe to show to the person who sent the file. */
export class VaultSkipError extends Error {}

const TOO_BIG_MESSAGE = "Файл больше 20 МБ: Telegram не позволяет ботам скачивать такие файлы. Разбейте дамп на части или сожмите в .zip/.gz."

function pickAttachment(message: TelegramFileMessage): { kind: VaultKind; file: TelegramFileRef } | null {
  if (message.document) return { kind: "document", file: message.document }
  if (message.photo?.length) {
    // Telegram sends several sizes; the last one is the largest.
    return { kind: "photo", file: message.photo[message.photo.length - 1] }
  }
  if (message.video) return { kind: "video", file: message.video }
  if (message.audio) return { kind: "audio", file: message.audio }
  if (message.voice) return { kind: "voice", file: message.voice }
  return null
}

const DEFAULT_NAMES: Record<VaultKind, (ext: string) => string> = {
  document: (ext) => `file${ext}`,
  photo: () => "photo.jpg",
  video: () => "video.mp4",
  audio: () => "audio.mp3",
  voice: () => "voice.ogg",
}

const DEFAULT_MIME: Record<VaultKind, string> = {
  document: "application/octet-stream",
  photo: "image/jpeg",
  video: "video/mp4",
  audio: "audio/mpeg",
  voice: "audio/ogg",
}

export function hasVaultAttachment(message: TelegramFileMessage) {
  return pickAttachment(message) !== null
}

/**
 * Downloads one attachment from a bot update and stores it. Idempotent on Telegram's file_unique_id,
 * so redelivered updates do not duplicate files.
 */
export async function captureTelegramFile(message: TelegramFileMessage) {
  if (isForeignDeployment()) return null
  const picked = pickAttachment(message)
  if (!picked || !message.chat) return null
  const { kind, file } = picked
  if ((file.file_size ?? 0) > VAULT_MAX_FILE_BYTES) throw new VaultSkipError(TOO_BIG_MESSAGE)

  const existing = await db.select({ id: vaultFile.id }).from(vaultFile).where(eq(vaultFile.telegramFileUniqueId, file.file_unique_id)).limit(1)
  if (existing[0]) return existing[0].id

  const { token } = await getTelegramConfig()
  if (!token) return null

  const info = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: file.file_id }),
    signal: AbortSignal.timeout(10_000),
  })
  const meta = (await info.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: { file_path?: string } }
  const path = meta.result?.file_path
  if (!info.ok || !meta.ok || !path) {
    if (/too big/i.test(meta.description ?? "")) throw new VaultSkipError(TOO_BIG_MESSAGE)
    throw new Error(`Telegram getFile failed: ${meta.description ?? info.status}`)
  }

  const download = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal: AbortSignal.timeout(60_000) })
  if (!download.ok) throw new Error(`Telegram file download failed: ${download.status}`)
  const data = Buffer.from(await download.arrayBuffer())
  if (data.byteLength > VAULT_MAX_FILE_BYTES) throw new VaultSkipError(TOO_BIG_MESSAGE)

  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : ""
  const name = (file.file_name?.trim() || DEFAULT_NAMES[kind](ext)).slice(0, 255)
  const sender = message.from
  const senderName = [sender?.first_name, sender?.last_name].filter(Boolean).join(" ").trim() || null

  const inserted = await db
    .insert(vaultFile)
    .values({
      telegramFileUniqueId: file.file_unique_id,
      kind,
      name,
      mimeType: (file.mime_type || DEFAULT_MIME[kind]).slice(0, 120),
      size: data.byteLength,
      data,
      caption: message.caption?.slice(0, 2000) ?? null,
      chatId: String(message.chat.id),
      messageId: message.message_id ?? null,
      senderId: sender?.id != null ? String(sender.id) : null,
      senderName,
      senderUsername: sender?.username ?? null,
    })
    .onConflictDoNothing({ target: vaultFile.telegramFileUniqueId })
    .returning({ id: vaultFile.id })
  return inserted[0]?.id ?? null
}

export type VaultFileMeta = {
  id: number
  kind: VaultKind
  name: string
  mimeType: string
  size: number
  caption: string | null
  chatId: string
  senderId: string | null
  senderName: string | null
  senderUsername: string | null
  receivedAt: Date
}

const metaColumns = {
  id: vaultFile.id,
  kind: vaultFile.kind,
  name: vaultFile.name,
  mimeType: vaultFile.mimeType,
  size: vaultFile.size,
  caption: vaultFile.caption,
  chatId: vaultFile.chatId,
  senderId: vaultFile.senderId,
  senderName: vaultFile.senderName,
  senderUsername: vaultFile.senderUsername,
  receivedAt: vaultFile.receivedAt,
}

export async function listVaultFiles(): Promise<VaultFileMeta[]> {
  const rows = await db.select(metaColumns).from(vaultFile).orderBy(desc(vaultFile.receivedAt)).limit(500)
  return rows as VaultFileMeta[]
}

export async function getVaultFileMeta(id: number): Promise<VaultFileMeta | null> {
  const rows = await db.select(metaColumns).from(vaultFile).where(eq(vaultFile.id, id)).limit(1)
  return (rows[0] as VaultFileMeta | undefined) ?? null
}

export async function getVaultFile(id: number) {
  const rows = await db.select().from(vaultFile).where(eq(vaultFile.id, id)).limit(1)
  return rows[0] ?? null
}

export async function deleteVaultFile(id: number) {
  const deleted = await db.delete(vaultFile).where(eq(vaultFile.id, id)).returning({ id: vaultFile.id })
  return deleted.length > 0
}

export async function vaultTotals() {
  const [row] = await db.select({ files: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(${vaultFile.size}),0)::bigint` }).from(vaultFile)
  return { files: Number(row?.files ?? 0), bytes: Number(row?.bytes ?? 0) }
}
