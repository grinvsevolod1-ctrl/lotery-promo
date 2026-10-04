import { getRecentWins } from '@/lib/draws'
import { LiveWinsFeed, type FeedItem } from '@/components/live-wins-feed'

export async function WinnersMarquee() {
  let initial: FeedItem[] = []
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
    // The feed tops itself up with demo entries if the database is unreachable.
  }
  return <LiveWinsFeed initial={initial} />
}
