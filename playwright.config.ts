import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests against a running instance.
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e
 *
 * The registration flow needs MAIL_OUTBOX_DIR set on the server so verification
 * links can be read from disk instead of a mailbox; the same path is passed to
 * the tests via E2E_MAIL_OUTBOX_DIR.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "ru-RU",
    timezoneId: "Europe/Minsk",
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
})
