export type ShowcaseGame = {
  id: string
  kicker?: string
  title: string
  subtitle?: string
  provider: string
  cover: string
  tint: string
}

const cover = (id: string) => `/games/showcase/${id}.png`

export const SHOWCASE: Record<string, ShowcaseGame> = {
  sweetBonanza: { id: "sweet-bonanza", title: "Sweet Bonanza", subtitle: "1000", provider: "Pragmatic Play", cover: cover("sweet-bonanza"), tint: "#e84aa8" },
  minotauros: { id: "minotauros", title: "Minotauros", provider: "Endorphina", cover: cover("minotauros"), tint: "#3a1d14" },
  dragonTreasures: { id: "dragon-treasures", kicker: "Dragon Money", title: "Treasures", provider: "Endorphina", cover: cover("dragon-treasures"), tint: "#7a1020" },
  dragonOlympus: { id: "dragon-olympus", title: "Dragon of Olympus", provider: "Pragmatic Play", cover: cover("dragon-olympus"), tint: "#5a4030" },
  crazyTime: { id: "crazy-time", title: "Crazy Time", provider: "Evolution", cover: cover("crazy-time"), tint: "#d99a1c" },
  dragonBlackjack: { id: "dragon-blackjack", kicker: "Dragon Money", title: "Blackjack", provider: "Evolution", cover: cover("dragon-blackjack"), tint: "#e07a2a" },
  crazyBalls: { id: "crazy-balls", kicker: "Crazy", title: "Balls", provider: "Evolution", cover: cover("crazy-balls"), tint: "#1f5a3a" },
  fpRoulette: { id: "fp-roulette", kicker: "Dragon Money First Person", title: "Roulette", provider: "Evolution", cover: cover("fp-roulette"), tint: "#6b6b70" },
  gatesOlympus: { id: "gates-olympus", kicker: "Gates of", title: "Olympus", subtitle: "2500", provider: "Pragmatic Play", cover: cover("gates-olympus"), tint: "#1a1a6e" },
  leBandit: { id: "le-bandit", title: "Le Bandit", provider: "Hacksaw Gaming", cover: cover("le-bandit"), tint: "#7a5a4e" },
  wildBounty: { id: "wild-bounty", kicker: "Wild Bounty", title: "Showdown", provider: "PG Soft", cover: cover("wild-bounty"), tint: "#8a3a1a" },
  wildBandito: { id: "wild-bandito", kicker: "Wild", title: "Bandito", provider: "PG Soft", cover: cover("wild-bandito"), tint: "#3a3a9e" },
  dogHouse: { id: "dog-house", title: "The Dog House", provider: "Pragmatic Play", cover: cover("dog-house"), tint: "#2a6a2a" },
  bigCatch: { id: "big-catch", kicker: "Big Catch", title: "Fortune", provider: "Nobles Gaming", cover: cover("big-catch"), tint: "#0b8fc4" },
  baccarat: { id: "baccarat", kicker: "Live", title: "Baccarat A", provider: "Pragmatic Play", cover: cover("baccarat"), tint: "#2e6a64" },
  royalBlackjack: { id: "royal-blackjack", kicker: "Royal", title: "Blackjack 1", provider: "Winfinity", cover: cover("royal-blackjack"), tint: "#2a1a1a" },
  blackjackRare: { id: "blackjack-rare", kicker: "Dragon Money", title: "Blackjack", subtitle: "Rare", provider: "Evolution", cover: cover("blackjack-rare"), tint: "#e0782a" },
  rouletteRussian: { id: "roulette-russian", kicker: "Roulette 4", title: "Russian", provider: "Pragmatic Play", cover: cover("roulette-russian"), tint: "#2a1a14" },
  barRoulette: { id: "bar-roulette", title: "Bar", subtitle: "Roulette 2000x", provider: "Winfinity", cover: cover("bar-roulette"), tint: "#8a4a1a" },
  russianBlackjack: { id: "russian-blackjack", kicker: "Russian Royal", title: "Blackjack 2", provider: "Evolution", cover: cover("russian-blackjack"), tint: "#7a1e9a" },
  megaWheel: { id: "mega-wheel", kicker: "Mega", title: "Wheel", provider: "Pragmatic Play", cover: cover("mega-wheel"), tint: "#d23a3a" },
  lightningRoulette: { id: "lightning-roulette", kicker: "Lightning", title: "Roulette", provider: "Evolution", cover: cover("lightning-roulette"), tint: "#6a4028" },
}

const g = SHOWCASE

export const BANNER_SLOTS = [g.sweetBonanza, g.minotauros, g.dragonTreasures, g.dragonOlympus]
export const BANNER_LIVE = [g.crazyTime, g.dragonBlackjack, g.crazyBalls, g.fpRoulette]

export const ROW_SLOTS = [g.gatesOlympus, g.leBandit, g.wildBounty, g.sweetBonanza, g.minotauros, g.dragonTreasures, g.dragonOlympus]
export const ROW_TOP = [g.wildBandito, g.dogHouse, g.bigCatch, g.gatesOlympus, g.leBandit, g.crazyTime]
export const GRID_LIVE = [
  g.crazyTime,
  g.baccarat,
  g.royalBlackjack,
  g.blackjackRare,
  g.rouletteRussian,
  g.barRoulette,
  g.russianBlackjack,
  g.megaWheel,
  g.lightningRoulette,
]
