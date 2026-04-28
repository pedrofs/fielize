import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@cdljaguarao.test";
const ADMIN_PASSWORD = "fielize-dev-1234";

test.describe("CDL Jaguarão admin", () => {
  test("tenant landing renders branded home", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "CDL Jaguarão", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /admin/i })).toBeVisible();
  });

  test("/admin redirects to /admin/login when unauthed", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
    await expect(
      page.getByRole("heading", { name: "Admin", level: 1 }),
    ).toBeVisible();
  });

  test("admin signs in and lands on A-01 home", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Bem-vindo", level: 2 }),
    ).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
  });
});
