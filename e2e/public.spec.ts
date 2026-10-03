import { expect, test } from "@playwright/test"

test.describe("public pages", () => {
  test("landing renders the hero and the sign-up call to action", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: /зарегистрироваться|получить бонус|участвовать/i }).first()).toBeVisible()
    await expect(page.getByRole("contentinfo")).toContainText(/18\+/)
  })

  test("results page lists draws or an empty state", async ({ page }) => {
    await page.goto("/results")
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/результат/i)
  })

  for (const path of ["/rules", "/terms", "/privacy", "/contacts"]) {
    test(`legal page ${path} renders`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(page.getByRole("contentinfo")).toBeVisible()
    })
  }

  test("unknown routes show the branded 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: /на главную/i })).toBeVisible()
  })

  test("health endpoint reports the database", async ({ request }) => {
    const response = await request.get("/api/health")
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.db).toBe("up")
  })

  test("sitemap, robots and manifest are served", async ({ request }) => {
    for (const path of ["/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/sw.js", "/icons/icon-192.png"]) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
    }
  })

  test("cabinet redirects anonymous visitors to sign-in", async ({ page }) => {
    await page.goto("/cabinet")
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
