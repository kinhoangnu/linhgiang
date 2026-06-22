import { expect, test } from "@playwright/test";

test("shows chores and shopping price guidance", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Linhgiang" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily household tasks" })).toBeVisible();

  await page.getByRole("button", { name: "Done Kitchen reset" }).click();
  await expect(page.getByText("Completed by You")).toBeVisible();

  await page.getByRole("button", { name: "Shopping" }).click();
  await expect(page.getByRole("heading", { name: "Lowest known market prices" })).toBeVisible();
  await expect(page.getByText("Asian grocery")).toBeVisible();
  await expect(page.getByText("Needs check")).toBeVisible();
});

test("shows Firebase account controls when configured", async ({ page }) => {
  await page.goto("/");

  const cloudAccount = page.getByLabel("Cloud account");

  if ((await cloudAccount.count()) === 0) {
    await expect(page.getByText("Local starter mode")).toBeVisible();
    return;
  }

  const accountMode = cloudAccount.getByLabel("Account mode");

  await expect(accountMode.getByRole("button", { name: "Sign in" })).toBeVisible();

  await accountMode.getByRole("button", { name: "Create" }).click();
  await expect(cloudAccount.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(cloudAccount.getByLabel("Display name")).toBeVisible();
});
