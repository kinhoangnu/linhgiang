export const householdMembers = ["You", "Partner"];

const oneDayMs = 24 * 60 * 60 * 1000;

export const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "difficult", label: "Difficult" }
];

const validDifficulties = new Set(difficultyOptions.map((option) => option.value));

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export const todayDateKey = formatDateKey(new Date());

export function getDateFromKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function diffDays(startDateKey, endDateKey) {
  return Math.round((getDateFromKey(endDateKey) - getDateFromKey(startDateKey)) / oneDayMs);
}

export function formatDisplayDate(dateKey, options = {}) {
  return new Intl.DateTimeFormat(undefined, options).format(getDateFromKey(dateKey));
}

export function getCadenceLabel() {
  return "Once";
}

function normalizeCompletionHistory(chore, startsOn) {
  const completionHistory =
    chore.completionHistory && typeof chore.completionHistory === "object"
      ? { ...chore.completionHistory }
      : {};

  if (chore.done && chore.completedAt) {
    const completedDateKey = formatDateKey(new Date(chore.completedAt));
    const occurrenceDateKey = completionHistory[startsOn] ? startsOn : completedDateKey;

    completionHistory[occurrenceDateKey] ||= {
      completedAt: chore.completedAt,
      completedBy: chore.completedBy || "Someone",
      completedByUid: chore.completedByUid || null,
      doneByBoth: Boolean(chore.doneByBoth)
    };
  }

  return completionHistory;
}

export function normalizeTaskTitle(title) {
  return String(title || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getTaskProfileId(title) {
  const normalizedTitle = normalizeTaskTitle(title);
  const slug = normalizedTitle
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `task-profile-${slug || "untitled"}`;
}

export function normalizeTaskProfile(profile, index = 0) {
  const title = profile.title || "Untitled task";
  const completedCount = Number(profile.completedCount);

  return {
    ...profile,
    area: profile.area || "Home",
    assignee: profile.assignee || "Anyone",
    completedCount: Number.isFinite(completedCount) && completedCount > 0 ? completedCount : 0,
    difficulty: validDifficulties.has(profile.difficulty) ? profile.difficulty : "medium",
    due: profile.due || "Anytime",
    id: profile.id || getTaskProfileId(title),
    lastAddedAt: profile.lastAddedAt || null,
    lastCompletedAt: profile.lastCompletedAt || null,
    normalizedTitle: normalizeTaskTitle(title),
    sortOrder: profile.sortOrder ?? index,
    title
  };
}

export function sortTaskProfiles(left, right) {
  const leftCount = Number(left.completedCount) || 0;
  const rightCount = Number(right.completedCount) || 0;

  if (leftCount !== rightCount) {
    return rightCount - leftCount;
  }

  const leftRecent = left.lastCompletedAt || left.lastAddedAt || "";
  const rightRecent = right.lastCompletedAt || right.lastAddedAt || "";

  if (leftRecent !== rightRecent) {
    return String(rightRecent).localeCompare(String(leftRecent));
  }

  return left.title.localeCompare(right.title);
}

export function normalizeChore(chore, index = 0) {
  const startsOn = chore.startsOn || todayDateKey;
  const difficulty = validDifficulties.has(chore.difficulty) ? chore.difficulty : "medium";
  const completionHistory = normalizeCompletionHistory(chore, startsOn);
  const title = chore.title || "Untitled task";

  return {
    ...chore,
    area: chore.area || "Home",
    assignee: chore.assignee || "Anyone",
    cadence: getCadenceLabel(),
    completionHistory,
    difficulty,
    due: chore.due || "Anytime",
    normalizedTitle: normalizeTaskTitle(title),
    profileId: chore.profileId || getTaskProfileId(title),
    repeatType: "once",
    retiredOn: chore.retiredOn || null,
    sortOrder: chore.sortOrder ?? index,
    startsOn,
    title,
    weekdays: []
  };
}

function sortByBoardOrder(left, right) {
  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title);
}

export function getAvailableChoresForDate(chores, dateKey = todayDateKey) {
  return chores
    .map((chore, index) => normalizeChore(chore, index))
    .filter((chore) => {
      if (dateKey < chore.startsOn) {
        return false;
      }

      if (chore.retiredOn && dateKey >= chore.retiredOn) {
        return false;
      }

      return !chore.done && !chore.completionHistory[chore.startsOn];
    })
    .map((chore) => ({
      ...chore,
      completedDates: [],
      completion: null,
      done: false,
      occurrenceDate: chore.startsOn,
      overdueDays: Math.max(0, diffDays(chore.startsOn, dateKey)),
      pendingDates: [chore.startsOn]
    }))
    .sort(sortByBoardOrder);
}

export function hasAvailableChoreWithTitle(chores, title, excludeChoreId = "", dateKey = todayDateKey) {
  const normalizedTitle = normalizeTaskTitle(title);

  if (!normalizedTitle) {
    return false;
  }

  return getAvailableChoresForDate(chores, dateKey).some(
    (chore) => chore.id !== excludeChoreId && chore.normalizedTitle === normalizedTitle
  );
}

export const starterChores = [];

export const starterTaskProfiles = [];

export const starterShoppingItems = [
  {
    id: "rice",
    name: "Jasmine rice",
    quantity: "5 kg",
    category: "Pantry",
    bought: false,
    offers: [
      {
        id: "rice-local-market",
        store: "Local market",
        price: 11.95,
        size: "5",
        unit: "kg",
        observedAt: "2026-06-20"
      },
      {
        id: "rice-asian-grocery",
        store: "Asian grocery",
        price: 10.75,
        size: "5",
        unit: "kg",
        observedAt: "2026-06-18"
      }
    ]
  },
  {
    id: "detergent",
    name: "Laundry detergent",
    quantity: "1 bottle",
    category: "Cleaning",
    bought: false,
    offers: [
      {
        id: "detergent-discount",
        store: "Discount grocer",
        price: 5.49,
        size: "1",
        unit: "bottle",
        observedAt: "2026-06-21"
      },
      {
        id: "detergent-supermarket",
        store: "Supermarket",
        price: 6.25,
        size: "1",
        unit: "bottle",
        observedAt: "2026-06-19"
      }
    ]
  },
  {
    id: "eggs",
    name: "Eggs",
    quantity: "12",
    category: "Fresh",
    bought: true,
    offers: [
      {
        id: "eggs-market",
        store: "Neighborhood shop",
        price: 3.29,
        size: "12",
        unit: "eggs",
        observedAt: "2026-06-21"
      }
    ]
  },
  {
    id: "olive-oil",
    name: "Olive oil",
    quantity: "1 bottle",
    category: "Pantry",
    bought: false,
    offers: []
  }
];

export function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

export function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function findLowestOffer(item) {
  const offers = item.offers || [];

  if (!offers.length) {
    return null;
  }

  return offers.reduce((lowest, offer) => {
    if (!lowest || offer.price < lowest.price) {
      return offer;
    }

    return lowest;
  }, null);
}

export function countOpenShoppingItems(items) {
  return items.filter((item) => !item.bought).length;
}

export function summarizeChores(chores) {
  const completed = chores.filter((task) => task.done).length;

  return {
    total: chores.length,
    completed,
    open: chores.length - completed
  };
}
