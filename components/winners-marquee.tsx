import { getRecentWins } from '@/lib/draws'
import { LiveWinsFeed, type FeedItem } from '@/components/live-wins-feed'

export async function WinnersMarquee() {
  let initial: FeedItem[] = []
  let unavailable = false
  try {
    const wins = await getRecentWins(8)
    initial = wins.map((w) => ({
      id: `real-${w.id}`,
      name: w.name,
      game: w.game,
      prize: w.prize,
      at: w.at.toISOString(),
    }))
  } catch {
    unavailable = true
  }
  return <LiveWinsFeed initial={initial} unavailable={unavailable} />
}
