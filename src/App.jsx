import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "./firebase";
import {
  countOpenShoppingItems,
  findLowestOffer,
  formatMoney,
  householdMembers,
  starterShoppingItems,
  summarizeChores
} from "./lib/householdData";
import {
  householdId,
  useFirestoreHouseholdBoard,
  useLocalHouseholdBoard
} from "./lib/useHouseholdBoard";
import { getUserDisplayName, useFirebaseAuth } from "./lib/useFirebaseAuth";
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

const emptyAuthForm = {
  displayName: "",
  email: "",
  password: ""
};

function App() {
  const authSession = useFirebaseAuth();
  const [activeView, setActiveView] = useState("chores");
  const [authMode, setAuthMode] = useState("sign-in");
  const [activeMember, setActiveMember] = useLocalStorage(
    "linhgiang:active-member",
    householdMembers[0]
  );
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [offerForm, setOfferForm] = useState({
    itemId: starterShoppingItems[0].id,
    price: "",
    size: "1",
    store: "",
    unit: "item"
  });

  const signedInMember = getUserDisplayName(authSession.user);
  const actorName = authSession.user ? signedInMember : activeMember;
  const localBoard = useLocalHouseholdBoard(activeMember);
  const cloudBoard = useFirestoreHouseholdBoard({
    activeMember: actorName,
    user: authSession.user
  });
  const board = isFirebaseConfigured && authSession.user ? cloudBoard : localBoard;
  const { chores, shoppingItems } = board;

  const choreSummary = useMemo(() => summarizeChores(chores), [chores]);
  const openShoppingItems = useMemo(
    () => countOpenShoppingItems(shoppingItems),
    [shoppingItems]
  );
  const syncLabel = getSyncLabel({ authSession, board });

  useEffect(() => {
    if (!shoppingItems.length) {
      if (offerForm.itemId) {
        setOfferForm((form) => ({ ...form, itemId: "" }));
      }

      return;
    }

    const selectedItemExists = shoppingItems.some((item) => item.id === offerForm.itemId);

    if (!selectedItemExists) {
      setOfferForm((form) => ({ ...form, itemId: shoppingItems[0].id }));
    }
  }, [offerForm.itemId, shoppingItems]);

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (authMode === "create") {
      await authSession.createAccount(authForm);
      return;
    }

    await authSession.signIn(authForm);
  }

  async function addShoppingItem(event) {
    event.preventDefault();

    const newItemId = await board.addShoppingItem(itemForm);

    if (!newItemId) {
      return;
    }

    setOfferForm((form) => ({ ...form, itemId: newItemId }));
    setItemForm(emptyItemForm);
  }

  async function addOffer(event) {
    event.preventDefault();

    const didAdd = await board.addOffer(offerForm);

    if (!didAdd) {
      return;
    }

    setOfferForm((form) => ({
      ...form,
      price: "",
      store: ""
    }));
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
          <span className="sync-pill">{syncLabel}</span>
          {authSession.user ? (
            <div className="account-chip">
              <span>Signed in</span>
              <strong>{actorName}</strong>
            </div>
          ) : (
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
          )}
        </div>
      </header>

      {isFirebaseConfigured && (
        <section className="cloud-panel" aria-label="Cloud account">
          {authSession.user ? (
            <>
              <div className="cloud-panel-header">
                <div>
                  <p className="eyebrow">Cloud household</p>
                  <h2>{householdId}</h2>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={authSession.signOutUser}
                >
                  Sign out
                </button>
              </div>

              <div className="cloud-grid">
                <label>
                  <span>Email</span>
                  <input value={authSession.user.email || ""} readOnly />
                </label>
                <label>
                  <span>Your UID</span>
                  <input value={authSession.user.uid} readOnly />
                </label>
              </div>

              {board.members.length > 0 && (
                <div className="member-list" aria-label="Household members">
                  {board.members.map((member) => (
                    <span key={member.id}>{member.displayName || member.id}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="cloud-panel-header">
                <div>
                  <p className="eyebrow">Cloud account</p>
                  <h2>{authMode === "create" ? "Create account" : "Sign in"}</h2>
                </div>
                <div className="auth-mode-switch" aria-label="Account mode">
                  <button
                    type="button"
                    className={authMode === "sign-in" ? "is-active" : ""}
                    onClick={() => setAuthMode("sign-in")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={authMode === "create" ? "is-active" : ""}
                    onClick={() => setAuthMode("create")}
                  >
                    Create
                  </button>
                </div>
              </div>

              <form className="inline-form auth-form" onSubmit={handleAuthSubmit}>
                {authMode === "create" && (
                  <label>
                    <span>Display name</span>
                    <input
                      value={authForm.displayName}
                      onChange={(event) =>
                        setAuthForm((form) => ({ ...form, displayName: event.target.value }))
                      }
                      placeholder="You"
                    />
                  </label>
                )}
                <label>
                  <span>Email</span>
                  <input
                    value={authForm.email}
                    onChange={(event) =>
                      setAuthForm((form) => ({ ...form, email: event.target.value }))
                    }
                    placeholder="name@example.com"
                    type="email"
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm((form) => ({ ...form, password: event.target.value }))
                    }
                    minLength={6}
                    placeholder="6+ characters"
                    type="password"
                  />
                </label>
                <button type="submit" className="primary-button" disabled={authSession.loading}>
                  {authMode === "create" ? "Create" : "Sign in"}
                </button>
              </form>
            </>
          )}

          {(authSession.error || board.error) && (
            <p className="status-line" role="status">
              {authSession.error || board.error}
            </p>
          )}
        </section>
      )}

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
            <button
              type="button"
              className="ghost-button"
              disabled={board.loading || board.saving || chores.length === 0}
              onClick={board.resetChores}
            >
              Reset day
            </button>
          </div>

          <div className="task-list">
            {board.loading ? (
              <p className="empty-state">Loading household data...</p>
            ) : (
              chores.map((chore) => (
                <article className={chore.done ? "task-card is-done" : "task-card"} key={chore.id}>
                  <div>
                    <div className="task-title-row">
                      <h3>{chore.title}</h3>
                      <span>{chore.area}</span>
                    </div>
                    <p>
                      {chore.cadence} · due {chore.due} · assigned to {chore.assignee}
                    </p>
                    {chore.done && chore.completedAt && (
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
                    disabled={board.saving}
                    onClick={() => board.toggleChore(chore.id)}
                    aria-label={`${chore.done ? "Reopen" : "Done"} ${chore.title}`}
                  >
                    {chore.done ? "Reopen" : "Done"}
                  </button>
                </article>
              ))
            )}
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
              <button
                type="submit"
                className="primary-button"
                disabled={board.loading || board.saving}
              >
                Add item
              </button>
            </form>

            <form className="inline-form" onSubmit={addOffer}>
              <label>
                <span>Price for</span>
                <select
                  value={offerForm.itemId}
                  disabled={!shoppingItems.length}
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
              <button
                type="submit"
                className="secondary-button"
                disabled={board.loading || board.saving || !shoppingItems.length}
              >
                Add price
              </button>
            </form>
          </div>

          <div className="shopping-list">
            {board.loading ? (
              <p className="empty-state">Loading household data...</p>
            ) : (
              shoppingItems.map((item) => {
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
                      disabled={board.saving}
                      onClick={() => board.toggleBought(item.id)}
                      aria-label={`${item.bought ? "Mark needed" : "Mark bought"} ${item.name}`}
                    >
                      {item.bought ? "Needed" : "Bought"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function getSyncLabel({ authSession, board }) {
  if (authSession.loading) {
    return "Checking account";
  }

  if (authSession.user) {
    if (board.saving) {
      return "Saving";
    }

    if (board.loading) {
      return "Loading cloud";
    }

    if (board.error) {
      return "Cloud setup needed";
    }

    return "Cloud synced";
  }

  return isFirebaseConfigured ? "Firebase ready" : "Local starter mode";
}

export default App;
