export const DEMO_CARD_NUMBER = "4242424242424242"
export const DEMO_CARDHOLDER = "TEST USER"
export const DEMO_EXPIRY = "12/99"
export const DEMO_CARD_CODE = "demo-success"

export function isDemoCard(number: string, cardholder: string, month: number, year: number) {
  return number === DEMO_CARD_NUMBER && cardholder === DEMO_CARDHOLDER && month === 12 && year === 2099
}
