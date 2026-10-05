import { expect, test, type Page } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function signIn(page: Page) {
  await page.goto("/sign-in")
  await page.getByLabel("E-mail").fill(email!)
  await page.getByLabel("Пароль", { exact: true }).fill(password!)
  await page.getByRole("button", { name: /войти/i }).click()
  await expect(page).toHaveURL(/\/cabinet/)
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe("cabinet on mobile", () => {
  test.skip(!email || !password, "set E2E_EMAIL and E2E_PASSWORD of an existing verified account")

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test("bottom dock opens quick actions and reaches the deposit page", async ({ page }) => {
    await expectNoHorizontalScroll(page)
    await page.getByRole("button", { name: /быстрые действия/i }).click()
    await page.getByRole("link", { name: /пополнить/i }).first().click()
    await expect(page).toHaveURL(/\/cabinet\/deposit/)
    await expectNoHorizontalScroll(page)
  })

  test("cards page validates the binding form without layout overflow", async ({ page }) => {
    await page.goto("/cabinet/cards")
    await expectNoHorizontalScroll(page)
    await page.getByRole("button", { name: /привязать новую карту/i }).click()
    await page.getByLabel("Номер карты").fill("4111 1111 1111 1112")
    await expect(page.getByText("Номер карты введён с ошибкой")).toBeVisible()
    await page.getByRole("button", { name: "Отмена" }).click()
    await expect(page.getByRole("button", { name: /привязать новую карту/i })).toBeVisible()
  })

  test("unknown card confirmation shows a friendly fallback", async ({ page }) => {
    await page.goto("/cabinet/cards/999999999")
    await expect(page.getByText("Заявка не найдена")).toBeVisible()
    await expectNoHorizontalScroll(page)
  })

  test("support page is reachable", async ({ page }) => {
    await page.goto("/cabinet/support")
    await expect(page.getByRole("heading").first()).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
})
