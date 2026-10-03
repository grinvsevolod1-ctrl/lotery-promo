import type { MetadataRoute } from "next"
import { legalLinks, site } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/results`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/sign-up`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/sign-in`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    ...legalLinks.map((link) => ({
      url: `${site.url}${link.href}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ]
}
