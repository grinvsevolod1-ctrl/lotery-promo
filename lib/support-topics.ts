export const SUPPORT_TOPICS = {
  account: "Аккаунт и вход",
  cards: "Привязка карты",
  balance: "Пополнение и вывод",
  games: "Игры и выигрыши",
  other: "Другое",
} as const

export type SupportTopic = keyof typeof SUPPORT_TOPICS
