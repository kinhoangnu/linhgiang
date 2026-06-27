import { expect, test } from "@playwright/test";

test("shows an empty task board and shopping price guidance", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Linhgiang" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("No available tasks yet.")).toBeVisible();

  await page.getByRole("button", { name: "Shopping" }).click();
  await expect(page.getByRole("heading", { name: "Shopping list" })).toBeVisible();
  await expect(page.getByText("Asian grocery")).toBeVisible();
  await expect(page.getByText("Needs check")).toBeVisible();
});

test("adds, updates, and removes available tasks", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("Task").fill("Water balcony");
  await page.getByLabel("Area").fill("Plants");
  await page.getByLabel("Due").fill("Morning");
  await page.getByLabel("Difficulty").selectOption("hard");
  await page.getByRole("button", { name: "Save task" }).click();

  const choreCard = page.locator(".task-card").filter({ hasText: "Water balcony" });

  await expect(choreCard).toBeVisible();
  await expect(choreCard.getByText("Hard")).toBeVisible();

  await choreCard.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Task").fill("Water balcony plants");
  await page.getByLabel("Difficulty").selectOption("medium");
  await page.getByRole("button", { name: "Save changes" }).click();

  const updatedCard = page.locator(".task-card").filter({ hasText: "Water balcony plants" });

  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText("Medium")).toBeVisible();

  await updatedCard.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Remove task" }).click();

  await expect(page.getByText("Water balcony plants")).toBeHidden();
});

test("carries unfinished tasks forward and ranks saved tasks by completion", async ({ page }) => {
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
          done: false,
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
  await expect(missedCard.getByText("1 day not done")).toBeVisible();

  await missedCard.getByLabel("Done by both people").check();
  await missedCard.getByRole("button", { name: "Done Missed dusting" }).click();

  await expect(missedCard).toBeHidden();
  await expect(page.getByText("No available tasks yet.")).toBeVisible();

  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByLabel("Saved task")).toContainText("Missed dusting - 1 done");
  await page.getByLabel("Saved task").selectOption({ label: "Missed dusting - 1 done" });
  await page.getByRole("button", { name: "Save task" }).click();

  await expect(missedCard).toBeVisible();

  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("Saved task").selectOption({ label: "Missed dusting - 1 done" });
  await expect(page.getByText("Already available")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save task" })).toBeDisabled();
});

test("removes saved task suggestions and offers saved areas", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "linhgiang:task-profiles",
      JSON.stringify([
        {
          area: "Hallway",
          assignee: "Anyone",
          completedCount: 3,
          difficulty: "medium",
          due: "Anytime",
          id: "task-profile-vacuum-hallway",
          title: "Vacuum hallway"
        },
        {
          area: "Kitchen",
          assignee: "Anyone",
          completedCount: 1,
          difficulty: "easy",
          due: "Morning",
          id: "task-profile-wipe-counter",
          title: "Wipe counter"
        }
      ])
    );
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Add task" }).click();

  await expect(page.getByLabel("Saved task")).toContainText("Vacuum hallway - 3 done");

  const areaOptions = await page.locator("#task-area-options option").evaluateAll((options) =>
    options.map((option) => option.value)
  );

  expect(areaOptions).toEqual(expect.arrayContaining(["Home", "Hallway", "Kitchen"]));

  await page.getByLabel("Saved task").selectOption({ label: "Vacuum hallway - 3 done" });
  await expect(page.getByLabel("Area")).toHaveValue("Hallway");

  await page.getByRole("button", { name: "Remove saved" }).click();

  await expect(page.getByLabel("Saved task")).not.toContainText("Vacuum hallway");
  await expect(page.getByLabel("Saved task")).toContainText("Wipe counter - 1 done");
  await expect(page.getByLabel("Area")).toHaveValue("Home");
});

test("records chore history and summarizes weekly and monthly points", async ({ page }) => {
  await page.goto("/");

  await addTask(page, {
    area: "Kitchen",
    difficulty: "easy",
    title: "Wipe counter"
  });
  await completeTask(page, "Wipe counter");

  await page.getByLabel("Acting as").selectOption("Partner");

  await addTask(page, {
    area: "Living room",
    difficulty: "medium",
    title: "Mop floor"
  });
  await completeTask(page, "Mop floor");

  await addTask(page, {
    area: "Kitchen",
    difficulty: "hard",
    title: "Clean oven"
  });
  await completeTask(page, "Clean oven", { doneByBoth: true });

  await page.getByLabel("Acting as").selectOption("You");

  await addTask(page, {
    area: "Home",
    difficulty: "exceptional",
    title: "Reset storage room"
  });
  await completeTask(page, "Reset storage room");

  await page.getByRole("button", { name: "Summary" }).click();

  const firstPeriod = page.locator(".summary-period").first();

  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(firstPeriod.locator("summary")).toContainText(/Week \d+/);
  await expect(firstPeriod.locator("summary")).toContainText(
    "You - 3 tasks done 11 points"
  );
  await expect(firstPeriod.locator("summary")).toContainText(
    "Partner - 2 tasks done 6 points"
  );

  const ovenCompletion = page.locator(".completion-row").filter({ hasText: "Clean oven" });

  await expect(ovenCompletion).toContainText("Both");
  await expect(ovenCompletion).toContainText("Hard");
  await expect(ovenCompletion).toContainText("4 points");

  const storageCompletion = page.locator(".completion-row").filter({ hasText: "Reset storage room" });

  await expect(storageCompletion).toContainText("Exceptional");
  await expect(storageCompletion).toContainText("6 points");

  await page.getByRole("button", { name: "Months" }).click();

  const currentMonth = await page.evaluate(() =>
    new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric"
    }).format(new Date())
  );

  await expect(page.locator(".summary-period").first().locator("summary")).toContainText(
    currentMonth
  );
});

test("allows duplicate task titles when task details differ", async ({ page }) => {
  await page.goto("/");

  await addTask(page, {
    area: "Kitchen",
    difficulty: "hard",
    title: "Install new light"
  });
  await addTask(page, {
    area: "Living room",
    difficulty: "hard",
    title: "Install new light"
  });

  await expect(page.locator(".task-card").filter({ hasText: "Install new light" })).toHaveCount(2);

  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByRole("textbox", { name: "Task" }).fill("Install new light");
  await page.getByLabel("Area").fill("Kitchen");
  await page.getByLabel("Due").fill("Anytime");
  await page.getByLabel("Difficulty").selectOption("hard");

  await expect(page.getByText("Already available")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save task" })).toBeDisabled();
});

test("shows Firebase account controls when configured", async ({ page }) => {
  await page.goto("/");

  const cloudAccount = page.getByLabel("Cloud account");

  if ((await cloudAccount.count()) === 0) {
    await expect(page.getByText("Local starter mode")).toBeVisible();
    return;
  }

  const isOpen = await cloudAccount.evaluate((element) => element.open);

  if (!isOpen) {
    await cloudAccount.locator("summary").click();
  }

  const accountMode = cloudAccount.getByLabel("Account mode");

  await expect(accountMode.getByRole("button", { name: "Sign in" })).toBeVisible();

  await accountMode.getByRole("button", { name: "Create" }).click();
  await expect(cloudAccount.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(cloudAccount.getByLabel("Display name")).toBeVisible();
});

test("requires sign-in before using cloud household data when configured", async ({ page }) => {
  await page.goto("/");

  const cloudAccount = page.getByLabel("Cloud account");

  if ((await cloudAccount.count()) === 0) {
    await expect(page.getByText("Local starter mode")).toBeVisible();
    return;
  }

  await expect(page.getByText("Sign in for cloud")).toBeVisible();
  await expect(cloudAccount.getByText("Sign in to load household data.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add task" })).toBeDisabled();

  await page.getByRole("button", { name: "Shopping" }).click();
  await page.locator(".tool-panel").filter({ hasText: "Add item" }).locator("summary").click();
  await expect(page.getByRole("button", { name: "Add item" })).toBeDisabled();
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

async function addTask(page, { area = "Home", difficulty = "medium", due = "Anytime", title }) {
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByRole("textbox", { name: "Task" }).fill(title);
  await page.getByLabel("Area").fill(area);
  await page.getByLabel("Due").fill(due);
  await page.getByLabel("Difficulty").selectOption(difficulty);
  await page.getByRole("button", { name: "Save task" }).click();
}

async function completeTask(page, title, options = {}) {
  const choreCard = page.locator(".task-card").filter({ hasText: title });

  if (options.doneByBoth) {
    await choreCard.getByLabel("Done by both people").check();
  }

  await choreCard.getByRole("button", { name: `Done ${title}` }).click();
  await expect(choreCard).toBeHidden();
}
