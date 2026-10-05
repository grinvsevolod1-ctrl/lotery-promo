/**
 * The repository is also auto-deployed by Vercel projects outside our team (e.g. tolottery.vercel.app),
 * each with its own Telegram chat. Only our server (no VERCEL_* vars) and our own Vercel project may
 * run the app; every other deployment redirects to the canonical domain and never talks to Telegram.
 */
const OWN_VERCEL_PROJECT_IDS = new Set(
  ["prj_RyT6GbGxtvaAkYS6DD0HbozvUzOz", process.env.ALLOWED_VERCEL_PROJECT_ID?.trim()].filter(Boolean) as string[],
)

export const CANONICAL_ORIGIN = "https://bytoloto.com"

export function isForeignDeployment() {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim()
  return Boolean(projectId) && !OWN_VERCEL_PROJECT_IDS.has(projectId!)
}
