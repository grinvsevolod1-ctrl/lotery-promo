/** Which viewer a stored file gets. Decided from the extension first, the MIME type second. */
export type ViewerKind = "sql" | "json" | "csv" | "text" | "image" | "pdf" | "audio" | "video" | "binary"

const EXT: Record<string, ViewerKind> = {
  sql: "sql",
  dump: "sql",
  json: "json",
  geojson: "json",
  csv: "csv",
  tsv: "csv",
  txt: "text",
  md: "text",
  log: "text",
  env: "text",
  yml: "text",
  yaml: "text",
  xml: "text",
  html: "text",
  js: "text",
  ts: "text",
  tsx: "text",
  py: "text",
  sh: "text",
  conf: "text",
  ini: "text",
  toml: "text",
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  mp3: "audio",
  ogg: "audio",
  oga: "audio",
  wav: "audio",
  m4a: "audio",
  mp4: "video",
  webm: "video",
  mov: "video",
}

export function extensionOf(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith(".sql.gz")) return "sql.gz"
  const dot = lower.lastIndexOf(".")
  return dot === -1 ? "" : lower.slice(dot + 1)
}

export function viewerKind(name: string, mimeType: string): ViewerKind {
  const ext = extensionOf(name)
  if (ext === "sql.gz" || ext === "gz") return "sql"
  if (EXT[ext]) return EXT[ext]
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType === "application/json") return "json"
  if (mimeType === "application/sql" || mimeType === "text/x-sql") return "sql"
  if (mimeType.startsWith("text/")) return "text"
  return "binary"
}

export const KIND_LABEL: Record<ViewerKind, string> = {
  sql: "SQL",
  json: "JSON",
  csv: "CSV",
  text: "Текст",
  image: "Изображение",
  pdf: "PDF",
  audio: "Аудио",
  video: "Видео",
  binary: "Файл",
}
