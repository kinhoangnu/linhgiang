export const householdMembers = ["You", "Partner"];

const oneDayMs = 24 * 60 * 60 * 1000;

export const weekDayOptions = [
  { value: 1, label: "Mon", longLabel: "Monday" },
  { value: 2, label: "Tue", longLabel: "Tuesday" },
  { value: 3, label: "Wed", longLabel: "Wednesday" },
  { value: 4, label: "Thu", longLabel: "Thursday" },
  { value: 5, label: "Fri", longLabel: "Friday" },
  { value: 6, label: "Sat", longLabel: "Saturday" },
  { value: 0, label: "Sun", longLabel: "Sunday" }
];

export const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "difficult", label: "Difficult" }
];

const validRepeatTypes = new Set(["once", "daily", "weekdays"]);
const validDifficulties = new Set(difficultyOptions.map((option) => option.value));
const weekdayByToken = {
  fri: 5,
  friday: 5,
  mon: 1,
  monday: 1,
  sat: 6,
  saturday: 6,
  sun: 0,
  sunday: 0,
  thu: 4,
  thursday: 4,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3
};

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

export function addDays(dateKey, days) {
  const date = getDateFromKey(dateKey);
  date.setDate(date.getDate() + days);

  return formatDateKey(date);
}

export function diffDays(startDateKey, endDateKey) {
  return Math.round((getDateFromKey(endDateKey) - getDateFromKey(startDateKey)) / oneDayMs);
}

export function getWeekStart(dateKey) {
  const date = getDateFromKey(dateKey);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);

  return formatDateKey(date);
}

export function getWeekDates(dateKey) {
  const weekStart = getWeekStart(dateKey);

  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatDisplayDate(dateKey, options = {}) {
  return new Intl.DateTimeFormat(undefined, options).format(getDateFromKey(dateKey));
}

export function normalizeWeekdays(weekdays) {
  if (!Array.isArray(weekdays)) {
    return [];
  }

  const weekdaySet = new Set(
    weekdays.map(Number).filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
  );

  return weekDayOptions
    .map((option) => option.value)
    .filter((weekday) => weekdaySet.has(weekday));
}

function parseCadenceWeekdays(cadence) {
  return normalizeWeekdays(
    String(cadence || "")
      .split(/[^a-z]+/i)
      .map((token) => weekdayByToken[token.toLowerCase()])
      .filter((weekday) => weekday !== undefined)
  );
}

export function getCadenceLabel(repeatType, weekdays = []) {
  if (repeatType === "once") {
    return "Once";
  }

  if (repeatType === "daily") {
    return "Daily";
  }

  const normalizedWeekdays = normalizeWeekdays(weekdays);

  if (!normalizedWeekdays.length) {
    return "Selected days";
  }

  return normalizedWeekdays
    .map((weekday) => weekDayOptions.find((option) => option.value === weekday)?.label)
    .filter(Boolean)
    .join("/");
}

function inferRepeatType(chore) {
  if (validRepeatTypes.has(chore.repeatType)) {
    return chore.repeatType;
  }

  if (String(chore.cadence || "").toLowerCase() === "daily") {
    return "daily";
  }

  if (parseCadenceWeekdays(chore.cadence).length) {
    return "weekdays";
  }

  return "daily";
}

function inferWeekdays(chore, repeatType) {
  if (repeatType !== "weekdays") {
    return [];
  }

  const explicitWeekdays = normalizeWeekdays(chore.weekdays);

  if (explicitWeekdays.length) {
    return explicitWeekdays;
  }

  return parseCadenceWeekdays(chore.cadence);
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

export function normalizeChore(chore, index = 0) {
  const repeatType = inferRepeatType(chore);
  const weekdays = inferWeekdays(chore, repeatType);
  const startsOn = chore.startsOn || todayDateKey;
  const difficulty = validDifficulties.has(chore.difficulty) ? chore.difficulty : "medium";
  const completionHistory = normalizeCompletionHistory(chore, startsOn);

  return {
    ...chore,
    area: chore.area || "Home",
    assignee: chore.assignee || "Anyone",
    cadence: getCadenceLabel(repeatType, weekdays),
    completionHistory,
    difficulty,
    due: chore.due || "Anytime",
    repeatType,
    retiredOn: chore.retiredOn || null,
    sortOrder: chore.sortOrder ?? index,
    startsOn,
    title: chore.title || "Untitled task",
    weekdays
  };
}

export function isChoreScheduledOnDate(chore, dateKey) {
  const normalizedChore = normalizeChore(chore);

  if (dateKey < normalizedChore.startsOn) {
    return false;
  }

  if (normalizedChore.retiredOn && dateKey >= normalizedChore.retiredOn) {
    return false;
  }

  if (normalizedChore.repeatType === "once") {
    return dateKey === normalizedChore.startsOn;
  }

  if (normalizedChore.repeatType === "daily") {
    return true;
  }

  return normalizedChore.weekdays.includes(getDateFromKey(dateKey).getDay());
}

export function getScheduledDatesThrough(chore, dateKey) {
  const normalizedChore = normalizeChore(chore);
  const dates = [];

  if (dateKey < normalizedChore.startsOn) {
    return dates;
  }

  for (
    let currentDateKey = normalizedChore.startsOn;
    currentDateKey <= dateKey;
    currentDateKey = addDays(currentDateKey, 1)
  ) {
    if (isChoreScheduledOnDate(normalizedChore, currentDateKey)) {
      dates.push(currentDateKey);
    }
  }

  return dates;
}

export function getVisibleChoresForDate(chores, dateKey) {
  return chores
    .map((chore, index) => normalizeChore(chore, index))
    .flatMap((chore) => {
      if (chore.retiredOn && dateKey >= chore.retiredOn) {
        return [];
      }

      const scheduledDates = getScheduledDatesThrough(chore, dateKey);
      const openDates = scheduledDates.filter((scheduledDate) => !chore.completionHistory[scheduledDate]);

      if (openDates.length) {
        const occurrenceDate = openDates[0];

        return [
          {
            ...chore,
            completedDates: [],
            completion: null,
            done: false,
            occurrenceDate,
            overdueDays: diffDays(occurrenceDate, dateKey),
            pendingDates: openDates
          }
        ];
      }

      if (isChoreScheduledOnDate(chore, dateKey) && chore.completionHistory[dateKey]) {
        return [
          {
            ...chore,
            completedDates: [dateKey],
            completion: chore.completionHistory[dateKey],
            done: true,
            occurrenceDate: dateKey,
            overdueDays: 0,
            pendingDates: []
          }
        ];
      }

      const completedTodayDates = Object.entries(chore.completionHistory)
        .filter(([, completion]) => {
          if (!completion?.completedAt) {
            return false;
          }

          return formatDateKey(new Date(completion.completedAt)) === dateKey;
        })
        .map(([completionDateKey]) => completionDateKey)
        .sort();

      if (!completedTodayDates.length) {
        return [];
      }

      const occurrenceDate = completedTodayDates[0];

      return [
        {
          ...chore,
          completedDates: completedTodayDates,
          completion: chore.completionHistory[occurrenceDate],
          done: true,
          occurrenceDate,
          overdueDays: diffDays(occurrenceDate, dateKey),
          pendingDates: []
        }
      ];
    })
    .sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.title.localeCompare(right.title);
    });
}

export const starterChores = [
  {
    id: "kitchen-reset",
    title: "Kitchen reset",
    area: "Kitchen",
    cadence: "Daily",
    repeatType: "daily",
    weekdays: [],
    startsOn: todayDateKey,
    retiredOn: null,
    difficulty: "medium",
    due: "After dinner",
    assignee: "Anyone",
    done: false,
    completedBy: null,
    completedAt: null,
    completionHistory: {}
  },
  {
    id: "laundry-check",
    title: "Laundry check",
    area: "Utility",
    cadence: "Mon/Wed/Sat",
    repeatType: "weekdays",
    weekdays: [1, 3, 6],
    startsOn: todayDateKey,
    retiredOn: null,
    difficulty: "easy",
    due: "20:00",
    assignee: "Partner",
    done: false,
    completedBy: null,
    completedAt: null,
    completionHistory: {}
  },
  {
    id: "trash-recycling",
    title: "Trash and recycling",
    area: "Entry",
    cadence: "Daily",
    repeatType: "daily",
    weekdays: [],
    startsOn: todayDateKey,
    retiredOn: null,
    difficulty: "easy",
    due: "21:00",
    assignee: "You",
    done: false,
    completedBy: null,
    completedAt: null,
    completionHistory: {}
  },
  {
    id: "bathroom-refresh",
    title: "Bathroom refresh",
    area: "Bathroom",
    cadence: "Tue/Fri",
    repeatType: "weekdays",
    weekdays: [2, 5],
    startsOn: todayDateKey,
    retiredOn: null,
    difficulty: "difficult",
    due: "Before bed",
    assignee: "Anyone",
    done: false,
    completedBy: null,
    completedAt: null,
    completionHistory: {}
  }
];

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
