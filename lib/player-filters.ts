export const PLAYER_FILTERS = ["all", "active", "blocked", "unverified"] as const
export type PlayerFilter = (typeof PLAYER_FILTERS)[number]
