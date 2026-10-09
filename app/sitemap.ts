import type { MetadataRoute } from "next"
import { legalLinks, site } from "@/lib/site"

function parseRuDate(value: string) {
  const [day, month, year] = value.split(".").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = parseRuDate(site.legalUpdatedAt)
  const now = new Date()
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/results`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${site.url}/sign-up`, lastModified: legalUpdated, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/sign-in`, lastModified: legalUpdated, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/jobs`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...legalLinks.map((link) => ({
      url: `${site.url}${link.href}`,
      lastModified: legalUpdated,
      changeFrequency: "monthly" as const,
      priority: link.href === "/rules" ? 0.7 : 0.4,
    })),
  ]
}
