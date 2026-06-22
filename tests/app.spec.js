import { expect, test } from "@playwright/test";

test("shows chores and shopping price guidance", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Linhgiang" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await page.getByRole("button", { name: "Done Kitchen reset" }).click();
  await expect(page.getByText("Completed by You")).toBeVisible();

  await page.getByRole("button", { name: "Shopping" }).click();
  await expect(page.getByRole("heading", { name: "Shopping list" })).toBeVisible();
  await expect(page.getByText("Asian grocery")).toBeVisible();
  await expect(page.getByText("Needs check")).toBeVisible();
});

test("adds, updates, and removes future chore occurrences", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("Task").fill("Water balcony");
  await page.getByLabel("Area").fill("Plants");
  await page.getByLabel("Due").fill("Morning");
  await page.getByLabel("Repeat").selectOption("daily");
  await page.getByLabel("Difficulty").selectOption("difficult");
  await page.getByRole("button", { name: "Save task" }).click();

  const choreCard = page.locator(".task-card").filter({ hasText: "Water balcony" });

  await expect(choreCard).toBeVisible();
  await expect(choreCard.getByText("Difficult")).toBeVisible();

  await choreCard.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Task").fill("Water balcony plants");
  await page.getByLabel("Difficulty").selectOption("medium");
  await page.getByRole("button", { name: "Save changes" }).click();

  const updatedCard = page.locator(".task-card").filter({ hasText: "Water balcony plants" });

  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText("Medium")).toBeVisible();

  await updatedCard.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Remove future" }).click();

  await expect(page.getByText("Water balcony plants")).toBeHidden();
});

test("carries unfinished chores forward and records both-person completion", async ({ page }) => {
  await page.addInitScript(() => {
    const formatDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    window.localStorage.setItem(
      "linhgiang:chores",
      JSON.stringify([
        {
          area: "Home",
          assignee: "Anyone",
          cadence: "Once",
          completionHistory: {},
          difficulty: "easy",
          due: "Evening",
          id: "missed-dusting",
          repeatType: "once",
          retiredOn: null,
          sortOrder: 0,
          startsOn: formatDateKey(yesterday),
          title: "Missed dusting",
          weekdays: []
        }
      ])
    );
  });

  await page.goto("/");

  const missedCard = page.locator(".task-card").filter({ hasText: "Missed dusting" });

  await expect(missedCard).toBeVisible();
  await expect(missedCard.getByText("1 day unfinished")).toBeVisible();

  await missedCard.getByLabel("Done by both people").check();
  await missedCard.getByRole("button", { name: "Done Missed dusting" }).click();

  await expect(missedCard.getByText("Completed by You")).toBeVisible();
  await expect(missedCard.getByText("Done by both people")).toBeVisible();
});

test("shows Firebase account controls when configured", async ({ page }) => {
  await page.goto("/");

  const cloudAccount = page.getByLabel("Cloud account");

  if ((await cloudAccount.count()) === 0) {
    await expect(page.getByText("Local starter mode")).toBeVisible();
    return;
  }

  await cloudAccount.locator("summary").click();

  const accountMode = cloudAccount.getByLabel("Account mode");

  await expect(accountMode.getByRole("button", { name: "Sign in" })).toBeVisible();

  await accountMode.getByRole("button", { name: "Create" }).click();
  await expect(cloudAccount.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(cloudAccount.getByLabel("Display name")).toBeVisible();
});

test("exposes mobile app install assets", async ({ page }) => {
  await page.goto("/");

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);

  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.orientation).toBe("portrait");
  expect(manifest.theme_color).toBe("#000000");

  const workerResponse = await page.request.get("/sw.js");
  expect(workerResponse.ok()).toBe(true);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest"
  );
});
