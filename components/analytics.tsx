import Script from "next/script"

const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

/**
 * Self-hosted Umami analytics (cookie-free). Renders nothing until both
 * NEXT_PUBLIC_UMAMI_SCRIPT_URL and NEXT_PUBLIC_UMAMI_WEBSITE_ID are set.
 */
export function Analytics() {
  if (!scriptUrl || !websiteId || process.env.NODE_ENV !== "production") return null
  return <Script src={scriptUrl} data-website-id={websiteId} strategy="afterInteractive" />
}
