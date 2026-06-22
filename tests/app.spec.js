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
