import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { jobApplicationFile } from "@/lib/db/schema"
import { isAdmin } from "@/lib/admin-auth"

export const runtime = "nodejs"

/** Attachments are only ever served to an admin session; the browser gets a download, never an inline render. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 })
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 })
  const [file] = await db.select().from(jobApplicationFile).where(eq(jobApplicationFile.id, id)).limit(1)
  if (!file) return new Response("Not found", { status: 404 })

  const ascii = file.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'")
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
