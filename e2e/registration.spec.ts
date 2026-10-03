import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"

const outboxDir = process.env.E2E_MAIL_OUTBOX_DIR

type OutboxMessage = { to: string; subject: string; text: string; sentAt: string }

async function waitForMail(to: string, subjectPattern: RegExp, timeoutMs = 15_000): Promise<OutboxMessage> {
  if (!outboxDir) throw new Error("E2E_MAIL_OUTBOX_DIR is not set")
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const files = await readdir(outboxDir).catch(() => [] as string[])
    for (const file of files.sort().reverse()) {
      const raw = await readFile(path.join(outboxDir, file), "utf8").catch(() => null)
      if (!raw) continue
      const message = JSON.parse(raw) as OutboxMessage
      if (message.to === to && subjectPattern.test(message.subject)) return message
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No e-mail for ${to} matching ${subjectPattern}`)
}

function firstUrl(text: string) {
  const match = text.match(/https?:\/\/\S+/)
  if (!match) throw new Error("No URL in e-mail text")
  return match[0]
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Пароль", { exact: true }).fill(password)
  await page.getByRole("button", { name: /войти/i }).click()
  await expect(page).toHaveURL(/\/cabinet/)
}

test.describe("registration and cabinet", () => {
  test.skip(!outboxDir, "set E2E_MAIL_OUTBOX_DIR (and MAIL_OUTBOX_DIR on the server) to run the e-mail flow")

  const stamp = Date.now()
  const email = `e2e-${stamp}@example.test`
  const password = `Pw-${stamp}-strong`

  test("sign-up requires the 18+ consent, verifies e-mail, grants the bonus and buys a ticket", async ({ page }) => {
    await page.goto("/sign-up")
    await page.getByLabel("Имя").fill("E2E Тест")
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Пароль", { exact: true }).fill(password)

    // Browser-native validation blocks submit until the consent box is ticked.
    const consent = page.getByRole("checkbox")
    await expect(consent).not.toBeChecked()
    await page.getByRole("button", { name: /зарегистрироваться/i }).click()
    await expect(page).toHaveURL(/\/sign-up/)

    await consent.check()
    await page.getByRole("button", { name: /зарегистрироваться/i }).click()
    await expect(page.getByText(/подтвердите e-mail|письмо/i).first()).toBeVisible()

    const verification = await waitForMail(email, /подтвер/i)
    await page.goto(firstUrl(verification.text))
    await expect(page.getByText(/подтверждён|подтвержден|успешно/i).first()).toBeVisible()

    await signIn(page, email, password)

    await page.getByRole("button", { name: /получить \d+ BYN/i }).click()
    await expect(page.getByText(/бонус зачислен|баланс/i).first()).toBeVisible()

    await page.getByRole("button", { name: /случайные числа/i }).click()
    await page.getByRole("button", { name: /билет за \d+ BYN/i }).click()
    await expect(page.getByText(/билет №|ваши билеты/i).first()).toBeVisible()
  })

  test("profile page exposes password, e-mail, sessions and deletion", async ({ page }) => {
    await signIn(page, email, password)
    await page.goto("/cabinet/profile")
    await expect(page.getByRole("heading", { name: /пароль/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /e-mail/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /сеанс|устройств/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /удалить аккаунт/i })).toBeVisible()
  })
})
