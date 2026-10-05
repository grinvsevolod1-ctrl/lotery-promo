import { getRecentWins } from "@/lib/draws"
import type { FeedItem } from "@/components/live-wins-feed"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const wins = await getRecentWins(8)
    const items: FeedItem[] = wins.map((w) => ({
      id: `real-${w.id}`,
      name: w.name,
      game: w.game,
      prize: w.prize,
      at: w.at.toISOString(),
    }))
    // A short shared cache absorbs polling from many visitors at once.
    return Response.json(items, { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" } })
  } catch {
    return Response.json({ error: "Unavailable" }, { status: 503 })
  }
}
