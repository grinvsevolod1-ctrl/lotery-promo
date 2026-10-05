import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

const privatePaths = [
  "/cabinet",
  "/play",
  "/admin",
  "/api/",
  "/pay/",
  "/invite/",
  "/verify-email",
  "/reset-password",
  "/forgot-password",
  "/offline",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      // Yandex honours Clean-param: referral and PWA tags must not create duplicate pages.
      { userAgent: "Yandex", allow: "/", disallow: [...privatePaths, "/*?source=", "/*?ref="] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  }
}
