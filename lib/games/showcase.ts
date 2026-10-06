import { CATALOG_LIVE, CATALOG_SLOTS } from "@/lib/games/catalog"

export type ShowcaseGame = {
  id: string
  kicker?: string
  title: string
  subtitle?: string
  provider: string
  cover: string
  tint: string
  rtp?: number
  hue?: number
  isNew?: boolean
}

const cover = (id: string) => `/games/showcase/${id}.webp`

export const SHOWCASE = {
  sweetBonanza: { id: "sweet-bonanza", kicker: "Sweet", title: "Bonanza", subtitle: "1000", provider: "Pragmatic Play", cover: cover("sweet-bonanza"), tint: "#e84aa8", rtp: 96.53 },
  gatesOlympus: { id: "gates-olympus", kicker: "Gates of", title: "Olympus", subtitle: "1000", provider: "Pragmatic Play", cover: cover("gates-olympus"), tint: "#1a1a6e", rtp: 96.5 },
  sugarRush: { id: "sugar-rush", kicker: "Sugar", title: "Rush", subtitle: "1000", provider: "Pragmatic Play", cover: cover("sugar-rush"), tint: "#d94a9a", rtp: 96.53 },
  bigBass: { id: "big-bass", kicker: "Big Bass", title: "Bonanza", provider: "Pragmatic Play", cover: cover("big-bass"), tint: "#1f6a8a", rtp: 96.71 },
  starlightPrincess: { id: "starlight-princess", kicker: "Starlight", title: "Princess", subtitle: "1000", provider: "Pragmatic Play", cover: cover("starlight-princess"), tint: "#6a3a9e", rtp: 96.5 },
  fruitParty: { id: "fruit-party", kicker: "Fruit", title: "Party", provider: "Pragmatic Play", cover: cover("fruit-party"), tint: "#e0782a", rtp: 96.47 },
  zeusHades: { id: "zeus-hades", kicker: "Zeus vs", title: "Hades", subtitle: "Gods of War", provider: "Pragmatic Play", cover: cover("zeus-hades"), tint: "#5a1a3a", rtp: 96.07 },
  dogHouse: { id: "dog-house", title: "The Dog House", provider: "Pragmatic Play", cover: cover("dog-house"), tint: "#2a6a2a", rtp: 96.51 },
  minotauros: { id: "minotauros", title: "Minotauros", provider: "Endorphina", cover: cover("minotauros"), tint: "#3a1d14", rtp: 96 },
  wantedDead: { id: "wanted-dead", kicker: "Wanted Dead", title: "or a Wild", provider: "Hacksaw Gaming", cover: cover("wanted-dead"), tint: "#7a3a14", rtp: 96.38 },
  leBandit: { id: "le-bandit", title: "Le Bandit", provider: "Hacksaw Gaming", cover: cover("le-bandit"), tint: "#7a5a4e", rtp: 96.34 },
  bookOfDead: { id: "book-of-dead", kicker: "Book of", title: "Dead", provider: "Play'n GO", cover: cover("book-of-dead"), tint: "#1a2a5a", rtp: 96.21 },
  moneyTrain: { id: "money-train", kicker: "Money", title: "Train 4", provider: "Relax Gaming", cover: cover("money-train"), tint: "#1a4a4a", rtp: 96.1 },
  wildBounty: { id: "wild-bounty", kicker: "Wild Bounty", title: "Showdown", provider: "PG Soft", cover: cover("wild-bounty"), tint: "#8a3a1a", rtp: 96.75 },
  wildBandito: { id: "wild-bandito", kicker: "Wild", title: "Bandito", provider: "PG Soft", cover: cover("wild-bandito"), tint: "#3a3a9e", rtp: 96.73 },
  bigCatch: { id: "big-catch", kicker: "Big Catch", title: "Fortune", provider: "Nobles Gaming", cover: cover("big-catch"), tint: "#0b8fc4", rtp: 96.4 },

  crazyTime: { id: "crazy-time", kicker: "Crazy", title: "Time", provider: "Evolution", cover: cover("crazy-time"), tint: "#d99a1c", rtp: 96.08 },
  monopolyLive: { id: "monopoly-live", kicker: "Monopoly", title: "Live", provider: "Evolution", cover: cover("monopoly-live"), tint: "#2a7a3a", rtp: 96.23 },
  funkyTime: { id: "funky-time", kicker: "Funky", title: "Time", provider: "Evolution", cover: cover("funky-time"), tint: "#6a2a8a", rtp: 95.99 },
  lightningRoulette: { id: "lightning-roulette", kicker: "Lightning", title: "Roulette", provider: "Evolution", cover: cover("lightning-roulette"), tint: "#6a4028", rtp: 97.3 },
  crazyBalls: { id: "crazy-balls", kicker: "Crazy", title: "Balls", provider: "Evolution", cover: cover("crazy-balls"), tint: "#1f5a3a", rtp: 95.4 },
  dreamCatcher: { id: "dream-catcher", kicker: "Dream", title: "Catcher", provider: "Evolution", cover: cover("dream-catcher"), tint: "#1a4a8a", rtp: 96.58 },
  russianBlackjack: { id: "russian-blackjack", kicker: "Russian Royal", title: "Blackjack 2", provider: "Evolution", cover: cover("russian-blackjack"), tint: "#7a1e9a", rtp: 99.29 },
  sweetBonanzaCandyland: { id: "candyland", kicker: "Sweet Bonanza", title: "Candyland", provider: "Pragmatic Play", cover: cover("candyland"), tint: "#d94a8a", rtp: 96.48 },
  megaRoulette: { id: "mega-roulette", kicker: "Mega", title: "Roulette", provider: "Pragmatic Play", cover: cover("mega-roulette"), tint: "#6a4a1a", rtp: 97.3 },
  baccarat: { id: "baccarat", kicker: "Live", title: "Baccarat A", provider: "Pragmatic Play", cover: cover("baccarat"), tint: "#2e6a64", rtp: 98.94 },
  speedBaccarat: { id: "speed-baccarat", kicker: "Speed", title: "Baccarat", provider: "Pragmatic Play", cover: cover("speed-baccarat"), tint: "#1a2a5a", rtp: 98.94 },
  megaWheel: { id: "mega-wheel", kicker: "Mega", title: "Wheel", provider: "Pragmatic Play", cover: cover("mega-wheel"), tint: "#d23a3a", rtp: 96.5 },
  rouletteRussian: { id: "roulette-russian", kicker: "Roulette 4", title: "Russian", provider: "Pragmatic Play", cover: cover("roulette-russian"), tint: "#2a1a14", rtp: 97.3 },
  royalBlackjack: { id: "royal-blackjack", kicker: "Royal", title: "Blackjack 1", provider: "Winfinity", cover: cover("royal-blackjack"), tint: "#2a1a1a", rtp: 97.5 },
  barRoulette: { id: "bar-roulette", title: "Bar", subtitle: "Roulette 2000x", provider: "Winfinity", cover: cover("bar-roulette"), tint: "#8a4a1a", rtp: 97.2 },
} satisfies Record<string, ShowcaseGame>

const g = SHOWCASE

export const BANNER_SLOTS = [g.sweetBonanza, g.gatesOlympus, g.sugarRush, g.bigBass]
export const BANNER_LIVE = [g.crazyTime, g.monopolyLive, g.funkyTime, g.lightningRoulette]

export const ROW_SLOTS = [
  g.gatesOlympus,
  g.sweetBonanza,
  g.sugarRush,
  g.bigBass,
  g.starlightPrincess,
  g.fruitParty,
  g.zeusHades,
  g.dogHouse,
  g.wantedDead,
  g.leBandit,
  g.bookOfDead,
  g.moneyTrain,
  g.wildBounty,
  g.minotauros,
]
export const ROW_TOP = [g.wildBandito, g.dogHouse, g.bigCatch, g.wantedDead, g.bookOfDead, g.sugarRush, g.crazyTime, g.monopolyLive]
const BASE_LIVE = [
  g.crazyTime,
  g.baccarat,
  g.royalBlackjack,
  g.monopolyLive,
  g.funkyTime,
  g.lightningRoulette,
  g.sweetBonanzaCandyland,
  g.megaRoulette,
  g.dreamCatcher,
  g.crazyBalls,
  g.speedBaccarat,
  g.rouletteRussian,
  g.barRoulette,
  g.russianBlackjack,
  g.megaWheel,
]

function mergeUnique(...lists: readonly (readonly ShowcaseGame[])[]) {
  const seen = new Set<string>()
  const out: ShowcaseGame[] = []
  for (const list of lists) {
    for (const game of list) {
      if (seen.has(game.id)) continue
      seen.add(game.id)
      out.push(game)
    }
  }
  return out
}

const LIVE_IDS = new Set<string>(BASE_LIVE.map((game) => game.id))

export const GRID_LIVE: ShowcaseGame[] = mergeUnique(BASE_LIVE, CATALOG_LIVE)
export const ALL_SLOTS: ShowcaseGame[] = mergeUnique(
  Object.values(SHOWCASE).filter((game) => !LIVE_IDS.has(game.id)),
  CATALOG_SLOTS,
)
export const NEW_GAMES: ShowcaseGame[] = [...ALL_SLOTS, ...GRID_LIVE].filter((game) => game.isNew)
export const TOTAL_GAMES = ALL_SLOTS.length + GRID_LIVE.length

export const SLOTS_COUNT = ALL_SLOTS.length
export const LIVE_COUNT = GRID_LIVE.length

export type ShowcaseCategorySlug = "slots" | "top" | "live" | "new"

export const SHOWCASE_CATEGORIES: Record<ShowcaseCategorySlug, { title: string; description: string; games: readonly ShowcaseGame[] }> = {
  slots: { title: "Слоты", description: "Самые популярные слоты от ведущих провайдеров.", games: ALL_SLOTS },
  top: { title: "Топ", description: "Игры, которые сейчас выбирают чаще всего.", games: ROW_TOP },
  new: { title: "Новинки", description: "Свежие релизы, которые только вышли.", games: NEW_GAMES },
  live: { title: "Live", description: "Столы с живыми дилерами: рулетка, блэкджек, шоу-игры.", games: GRID_LIVE },
}

export function isShowcaseCategory(slug: string): slug is ShowcaseCategorySlug {
  return slug in SHOWCASE_CATEGORIES
}
