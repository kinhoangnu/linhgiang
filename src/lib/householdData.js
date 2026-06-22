export const householdMembers = ["You", "Partner"];

export const starterChores = [
  {
    id: "kitchen-reset",
    title: "Kitchen reset",
    area: "Kitchen",
    cadence: "Daily",
    due: "After dinner",
    assignee: "Shared",
    done: false,
    completedBy: null,
    completedAt: null
  },
  {
    id: "laundry-check",
    title: "Laundry check",
    area: "Utility",
    cadence: "Mon/Wed/Sat",
    due: "20:00",
    assignee: "Partner",
    done: false,
    completedBy: null,
    completedAt: null
  },
  {
    id: "trash-recycling",
    title: "Trash and recycling",
    area: "Entry",
    cadence: "Daily",
    due: "21:00",
    assignee: "You",
    done: false,
    completedBy: null,
    completedAt: null
  },
  {
    id: "bathroom-refresh",
    title: "Bathroom refresh",
    area: "Bathroom",
    cadence: "Tue/Fri",
    due: "Before bed",
    assignee: "Shared",
    done: true,
    completedBy: "Partner",
    completedAt: new Date().toISOString()
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
