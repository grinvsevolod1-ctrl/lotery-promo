export async function reviewFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Не удалось обновить статус. Перезагрузите страницу или войдите заново.")
  return response.json() as Promise<T>
}
