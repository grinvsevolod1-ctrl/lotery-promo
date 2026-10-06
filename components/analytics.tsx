import Script from "next/script"

const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

/** Optional self-hosted Umami. Funnel goals go to our own activity log (see lib/analytics.ts). */
export function Analytics() {
  if (process.env.NODE_ENV !== "production" || !umamiUrl || !umamiId) return null
  return <Script src={umamiUrl} data-website-id={umamiId} strategy="lazyOnload" />
}
