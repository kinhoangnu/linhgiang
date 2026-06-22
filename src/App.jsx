import { useMemo, useState } from "react";
import { isFirebaseConfigured } from "./firebase";
import {
  countOpenShoppingItems,
  createId,
  findLowestOffer,
  formatMoney,
  householdMembers,
  starterChores,
  starterShoppingItems,
  summarizeChores
} from "./lib/householdData";
import { useLocalStorage } from "./lib/useLocalStorage";

const todayLabel = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric"
}).format(new Date());

const emptyItemForm = {
  name: "",
  quantity: "",
  category: "Fresh"
};

function App() {
  const [activeView, setActiveView] = useState("chores");
  const [activeMember, setActiveMember] = useLocalStorage(
    "linhgiang:active-member",
    householdMembers[0]
  );
  const [chores, setChores] = useLocalStorage("linhgiang:chores", starterChores);
  const [shoppingItems, setShoppingItems] = useLocalStorage(
    "linhgiang:shopping-items",
    starterShoppingItems
  );
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [offerForm, setOfferForm] = useState({
    itemId: starterShoppingItems[0].id,
    store: "",
    price: "",
    size: "1",
    unit: "item"
  });

  const choreSummary = useMemo(() => summarizeChores(chores), [chores]);
  const openShoppingItems = useMemo(
    () => countOpenShoppingItems(shoppingItems),
    [shoppingItems]
  );

  function toggleChore(choreId) {
    setChores((currentChores) =>
      currentChores.map((chore) => {
        if (chore.id !== choreId) {
          return chore;
        }

        if (chore.done) {
          return {
            ...chore,
            done: false,
            completedBy: null,
            completedAt: null
          };
        }

        return {
          ...chore,
          done: true,
          completedBy: activeMember,
          completedAt: new Date().toISOString()
        };
      })
    );
  }

  function resetChores() {
    setChores((currentChores) =>
      currentChores.map((chore) => ({
        ...chore,
        done: false,
        completedBy: null,
        completedAt: null
      }))
    );
  }

  function addShoppingItem(event) {
    event.preventDefault();

    if (!itemForm.name.trim()) {
      return;
    }

    const newItem = {
      id: createId("item"),
      name: itemForm.name.trim(),
      quantity: itemForm.quantity.trim() || "1",
      category: itemForm.category,
      bought: false,
      offers: []
    };

    setShoppingItems((items) => [newItem, ...items]);
    setOfferForm((form) => ({ ...form, itemId: newItem.id }));
    setItemForm(emptyItemForm);
  }

  function addOffer(event) {
    event.preventDefault();

    const price = Number(offerForm.price);

    if (!offerForm.itemId || !offerForm.store.trim() || !Number.isFinite(price)) {
      return;
    }

    const offer = {
      id: createId("offer"),
      store: offerForm.store.trim(),
      price,
      size: offerForm.size.trim() || "1",
      unit: offerForm.unit.trim() || "item",
      observedAt: new Date().toISOString().slice(0, 10)
    };

    setShoppingItems((items) =>
      items.map((item) =>
        item.id === offerForm.itemId
          ? {
              ...item,
              offers: [offer, ...item.offers]
            }
          : item
      )
    );
    setOfferForm((form) => ({
      ...form,
      store: "",
      price: ""
    }));
  }

  function toggleBought(itemId) {
    setShoppingItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              bought: !item.bought
            }
          : item
      )
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img src="/icon.svg" alt="" className="brand-icon" />
          <div>
            <p className="eyebrow">{todayLabel}</p>
            <h1>Linhgiang</h1>
          </div>
        </div>

        <div className="topbar-controls">
          <span className="sync-pill">
            {isFirebaseConfigured ? "Firebase ready" : "Local starter mode"}
          </span>
          <label className="member-select">
            <span>Acting as</span>
            <select
              value={activeMember}
              onChange={(event) => setActiveMember(event.target.value)}
            >
              {householdMembers.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="overview-grid" aria-label="Household overview">
        <article className="metric-panel">
          <span className="metric-label">Chores left</span>
          <strong>{choreSummary.open}</strong>
          <span>{choreSummary.completed} completed today</span>
        </article>
        <article className="metric-panel">
          <span className="metric-label">Shopping open</span>
          <strong>{openShoppingItems}</strong>
          <span>items still needed</span>
        </article>
        <article className="metric-panel">
          <span className="metric-label">Next focus</span>
          <strong>{choreSummary.open ? "Finish chores" : "Price check"}</strong>
          <span>{choreSummary.open ? "Keep the home moving" : "Refresh market data"}</span>
        </article>
      </section>

      <nav className="view-switch" aria-label="Household sections">
        <button
          type="button"
          className={activeView === "chores" ? "is-active" : ""}
          aria-pressed={activeView === "chores"}
          onClick={() => setActiveView("chores")}
        >
          Today
        </button>
        <button
          type="button"
          className={activeView === "shopping" ? "is-active" : ""}
          aria-pressed={activeView === "shopping"}
          onClick={() => setActiveView("shopping")}
        >
          Shopping
        </button>
      </nav>

      {activeView === "chores" ? (
        <section className="workspace" aria-labelledby="chores-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Daily board</p>
              <h2 id="chores-title">Daily household tasks</h2>
            </div>
            <button type="button" className="ghost-button" onClick={resetChores}>
              Reset day
            </button>
          </div>

          <div className="task-list">
            {chores.map((chore) => (
              <article className={chore.done ? "task-card is-done" : "task-card"} key={chore.id}>
                <div>
                  <div className="task-title-row">
                    <h3>{chore.title}</h3>
                    <span>{chore.area}</span>
                  </div>
                  <p>
                    {chore.cadence} · due {chore.due} · assigned to {chore.assignee}
                  </p>
                  {chore.done && (
                    <p className="completion-line">
                      Completed by {chore.completedBy} at{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(new Date(chore.completedAt))}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className={chore.done ? "secondary-button" : "primary-button"}
                  onClick={() => toggleChore(chore.id)}
                  aria-label={`${chore.done ? "Reopen" : "Done"} ${chore.title}`}
                >
                  {chore.done ? "Reopen" : "Done"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="workspace" aria-labelledby="shopping-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Buying list</p>
              <h2 id="shopping-title">Lowest known market prices</h2>
            </div>
          </div>

          <div className="shopping-tools">
            <form className="inline-form" onSubmit={addShoppingItem}>
              <label>
                <span>Item</span>
                <input
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm((form) => ({ ...form, name: event.target.value }))
                  }
                  placeholder="Coffee beans"
                />
              </label>
              <label>
                <span>Quantity</span>
                <input
                  value={itemForm.quantity}
                  onChange={(event) =>
                    setItemForm((form) => ({ ...form, quantity: event.target.value }))
                  }
                  placeholder="1 bag"
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={itemForm.category}
                  onChange={(event) =>
                    setItemForm((form) => ({ ...form, category: event.target.value }))
                  }
                >
                  <option>Fresh</option>
                  <option>Pantry</option>
                  <option>Cleaning</option>
                  <option>Home</option>
                </select>
              </label>
              <button type="submit" className="primary-button">
                Add item
              </button>
            </form>

            <form className="inline-form" onSubmit={addOffer}>
              <label>
                <span>Price for</span>
                <select
                  value={offerForm.itemId}
                  onChange={(event) =>
                    setOfferForm((form) => ({ ...form, itemId: event.target.value }))
                  }
                >
                  {shoppingItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Store</span>
                <input
                  value={offerForm.store}
                  onChange={(event) =>
                    setOfferForm((form) => ({ ...form, store: event.target.value }))
                  }
                  placeholder="Store name"
                />
              </label>
              <label>
                <span>Price</span>
                <input
                  value={offerForm.price}
                  onChange={(event) =>
                    setOfferForm((form) => ({ ...form, price: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="3.49"
                />
              </label>
              <label>
                <span>Size</span>
                <input
                  value={offerForm.size}
                  onChange={(event) =>
                    setOfferForm((form) => ({ ...form, size: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Unit</span>
                <input
                  value={offerForm.unit}
                  onChange={(event) =>
                    setOfferForm((form) => ({ ...form, unit: event.target.value }))
                  }
                />
              </label>
              <button type="submit" className="secondary-button">
                Add price
              </button>
            </form>
          </div>

          <div className="shopping-list">
            {shoppingItems.map((item) => {
              const lowestOffer = findLowestOffer(item);

              return (
                <article
                  className={item.bought ? "shopping-card is-bought" : "shopping-card"}
                  key={item.id}
                >
                  <div className="shopping-card-main">
                    <span className="category-chip">{item.category}</span>
                    <h3>{item.name}</h3>
                    <p>{item.quantity}</p>
                  </div>

                  <div className="price-block">
                    {lowestOffer ? (
                      <>
                        <span>Lowest known</span>
                        <strong>{formatMoney(lowestOffer.price)}</strong>
                        <p>
                          {lowestOffer.store} · {lowestOffer.size} {lowestOffer.unit} ·{" "}
                          {lowestOffer.observedAt}
                        </p>
                      </>
                    ) : (
                      <>
                        <span>Lowest known</span>
                        <strong>Needs check</strong>
                        <p>Add a store price before shopping.</p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    className={item.bought ? "secondary-button" : "primary-button"}
                    onClick={() => toggleBought(item.id)}
                    aria-label={`${item.bought ? "Mark needed" : "Mark bought"} ${item.name}`}
                  >
                    {item.bought ? "Needed" : "Bought"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
