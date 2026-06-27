import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "./firebase";
import {
  countOpenShoppingItems,
  difficultyOptions,
  findLowestOffer,
  formatDisplayDate,
  formatMoney,
  getAvailableChoresForDate,
  getDateFromKey,
  getDifficultyLabel,
  hasMatchingAvailableChore,
  householdMembers,
  starterShoppingItems,
  summarizeChores,
  todayDateKey
} from "./lib/householdData";
import {
  useFirestoreHouseholdBoard,
  useLocalHouseholdBoard
} from "./lib/useHouseholdBoard";
import { getUserDisplayName, useFirebaseAuth } from "./lib/useFirebaseAuth";
import { useLocalStorage } from "./lib/useLocalStorage";
import InstallPrompt from "./components/InstallPrompt";

const todayLabel = formatDisplayDate(todayDateKey, {
  weekday: "long",
  month: "short",
  day: "numeric"
});

const emptyItemForm = {
  name: "",
  quantity: "",
  category: "Fresh"
};

const emptyTaskForm = {
  area: "Home",
  assignee: "Anyone",
  difficulty: "medium",
  due: "Anytime",
  profileId: "",
  title: ""
};

const emptyAuthForm = {
  displayName: "",
  email: "",
  password: ""
};

const cloudSignInBoard = {
  addChore: async () => null,
  addOffer: async () => false,
  addShoppingItem: async () => null,
  choreCompletions: [],
  chores: [],
  error: "",
  inviteMember: null,
  loading: false,
  members: [],
  mode: "auth",
  removeChore: async () => null,
  removeTaskProfile: async () => null,
  resetChores: async () => null,
  saving: false,
  shoppingItems: [],
  taskProfiles: [],
  toggleBought: async () => null,
  toggleChore: async () => null,
  updateChore: async () => null
};

const checkingAccountBoard = {
  ...cloudSignInBoard,
  loading: true
};

function App() {
  const authSession = useFirebaseAuth();
  const [activeView, setActiveView] = useState("chores");
  const [authMode, setAuthMode] = useState("sign-in");
  const [summaryMode, setSummaryMode] = useState("weeks");
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [editingChoreId, setEditingChoreId] = useState("");
  const [activeMember, setActiveMember] = useLocalStorage(
    "linhgiang:active-member",
    householdMembers[0]
  );
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [doneByBothByTask, setDoneByBothByTask] = useState({});
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
  const board = isFirebaseConfigured
    ? authSession.user
      ? cloudBoard
      : authSession.loading
        ? checkingAccountBoard
        : cloudSignInBoard
    : localBoard;
  const { choreCompletions = [], chores, shoppingItems, taskProfiles = [] } = board;
  const needsCloudAccount = isFirebaseConfigured && !authSession.user;
  const cloudAccessMessage = authSession.loading
    ? "Checking your account..."
    : "Sign in to load household data.";
  const availableChores = useMemo(
    () => getAvailableChoresForDate(chores, todayDateKey),
    [chores]
  );
  const taskAlreadyAvailable = useMemo(
    () => hasMatchingAvailableChore(chores, taskForm, editingChoreId, todayDateKey),
    [chores, editingChoreId, taskForm]
  );

  const choreSummary = useMemo(() => summarizeChores(availableChores), [availableChores]);
  const taskAreaOptions = useMemo(
    () => getTaskAreaOptions(taskProfiles, chores),
    [chores, taskProfiles]
  );
  const summaryMembers = useMemo(() => getSummaryMembers(board.members), [board.members]);
  const completionSummary = useMemo(
    () => buildCompletionSummary(choreCompletions, summaryMode, summaryMembers),
    [choreCompletions, summaryMembers, summaryMode]
  );
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

  function openAddTaskForm() {
    setEditingChoreId("");
    setTaskForm(emptyTaskForm);
    setIsTaskPanelOpen(true);
  }

  function openEditTaskForm(chore) {
    setEditingChoreId(chore.id);
    setTaskForm(getTaskFormFromChore(chore));
    setIsTaskPanelOpen(true);
  }

  function closeTaskForm() {
    setEditingChoreId("");
    setTaskForm(emptyTaskForm);
    setIsTaskPanelOpen(false);
  }

  function updateTaskForm(field, value) {
    const shouldClearProfile = ["area", "assignee", "difficulty", "due", "title"].includes(field);

    setTaskForm((form) => ({
      ...form,
      [field]: value,
      profileId: shouldClearProfile ? "" : form.profileId
    }));
  }

  function selectTaskProfile(profileId) {
    const profile = taskProfiles.find((taskProfile) => taskProfile.id === profileId);

    if (!profile) {
      updateTaskForm("profileId", "");
      return;
    }

    setTaskForm((form) => {
      return {
        ...form,
        area: profile.area,
        assignee: profile.assignee,
        difficulty: profile.difficulty,
        due: profile.due,
        profileId: profile.id,
        title: profile.title
      };
    });
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();

    if (taskAlreadyAvailable) {
      return;
    }

    if (editingChoreId) {
      await board.updateChore(editingChoreId, taskForm, todayDateKey);
    } else {
      await board.addChore(taskForm, todayDateKey);
    }

    closeTaskForm();
  }

  async function removeEditingTask() {
    if (!editingChoreId) {
      return;
    }

    await board.removeChore(editingChoreId, todayDateKey);
    closeTaskForm();
  }

  async function removeSelectedTaskProfile() {
    if (!taskForm.profileId) {
      return;
    }

    const didRemove = await board.removeTaskProfile(taskForm.profileId);

    if (didRemove) {
      setTaskForm(emptyTaskForm);
    }
  }

  async function toggleChoreCompletion(chore) {
    const doneByBothKey = getDoneByBothKey(chore);

    await board.toggleChore(chore.id, {
      completedDates: chore.completedDates,
      done: chore.done,
      doneByBoth: Boolean(doneByBothByTask[doneByBothKey]),
      occurrenceDate: chore.occurrenceDate,
      pendingDates: chore.pendingDates,
      selectedDate: todayDateKey
    });

    setDoneByBothByTask((current) => ({
      ...current,
      [doneByBothKey]: false
    }));
  }

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
          {syncLabel && <span className="sync-pill">{syncLabel}</span>}
          {authSession.user ? (
            <button type="button" className="ghost-button" onClick={authSession.signOutUser}>
              Sign out
            </button>
          ) : !isFirebaseConfigured ? (
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
          ) : null}
        </div>
      </header>

      {isFirebaseConfigured && authSession.user && (
        <section className="account-panel" aria-label="Cloud account">
          <div className="account-panel-header">
            <div>
              <p className="eyebrow">Household sync</p>
              <h2>{actorName}</h2>
              <p>{authSession.user.email}</p>
            </div>
          </div>

          {board.members.length > 0 && (
            <div className="member-list" aria-label="Household members">
              {board.members.map((member) => (
                <span key={member.id}>{member.displayName || member.id}</span>
              ))}
            </div>
          )}

          {(authSession.error || board.error) && (
            <p className="status-line" role="status">
              {authSession.error || board.error}
            </p>
          )}
        </section>
      )}

      {isFirebaseConfigured && !authSession.user && (
        <details className="account-panel" aria-label="Cloud account" open>
          <summary>
            <div>
              <p className="eyebrow">Household sync</p>
              <h2>{authMode === "create" ? "Create account" : "Sign in"}</h2>
            </div>
          </summary>

          <div className="account-panel-body">
            <p className="status-line" role="status">
              {cloudAccessMessage}
            </p>
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

            {(authSession.error || board.error) && (
              <p className="status-line" role="status">
                {authSession.error || board.error}
              </p>
            )}
          </div>
        </details>
      )}

      <section className="overview-grid" aria-label="Household overview">
        <article className="metric-panel">
          <span className="metric-label">Tasks available</span>
          <strong>{choreSummary.open}</strong>
          <span>{taskProfiles.length} saved</span>
        </article>
        <article className="metric-panel">
          <span className="metric-label">Shopping open</span>
          <strong>{openShoppingItems}</strong>
          <span>items still needed</span>
        </article>
        <article className="metric-panel">
          <span className="metric-label">Chore points</span>
          <strong>{completionSummary.totalPoints}</strong>
          <span>{completionSummary.totalTasks} tasks recorded</span>
        </article>
      </section>

      <nav className="view-switch" aria-label="Household sections">
        <button
          type="button"
          className={activeView === "chores" ? "is-active" : ""}
          aria-pressed={activeView === "chores"}
          onClick={() => setActiveView("chores")}
        >
          Chores
        </button>
        <button
          type="button"
          className={activeView === "summary" ? "is-active" : ""}
          aria-pressed={activeView === "summary"}
          onClick={() => setActiveView("summary")}
        >
          Summary
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

      {activeView === "chores" && (
        <section className="workspace" aria-labelledby="chores-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Available tasks</p>
              <h2 id="chores-title">Today</h2>
              <p>
                {choreSummary.open} available · {taskProfiles.length} saved
              </p>
            </div>
            <div className="section-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={needsCloudAccount}
                onClick={openAddTaskForm}
              >
                Add task
              </button>
            </div>
          </div>

          <details
            className="tool-panel task-form-panel"
            open={isTaskPanelOpen}
            onToggle={(event) => setIsTaskPanelOpen(event.currentTarget.open)}
          >
            <summary>{editingChoreId ? "Edit task" : "Task details"}</summary>
            <form className="inline-form task-form" onSubmit={handleTaskSubmit}>
              {!editingChoreId && taskProfiles.length > 0 && (
                <div className="saved-task-control">
                  <label>
                    <span>Saved task</span>
                    <select
                      value={taskForm.profileId}
                      onChange={(event) => selectTaskProfile(event.target.value)}
                    >
                      <option value="">New task</option>
                      {taskProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {getTaskProfileOptionLabel(profile)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={needsCloudAccount || board.saving || !taskForm.profileId}
                    onClick={removeSelectedTaskProfile}
                  >
                    Remove saved
                  </button>
                </div>
              )}
              <label>
                <span>Task</span>
                <input
                  value={taskForm.title}
                  onChange={(event) => updateTaskForm("title", event.target.value)}
                  placeholder="Kitchen reset"
                />
              </label>
              <label>
                <span>Area</span>
                <input
                  value={taskForm.area}
                  list="task-area-options"
                  onChange={(event) => updateTaskForm("area", event.target.value)}
                  placeholder="Kitchen"
                />
                <datalist id="task-area-options">
                  {taskAreaOptions.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Owner</span>
                <select
                  value={taskForm.assignee}
                  onChange={(event) => updateTaskForm("assignee", event.target.value)}
                >
                  <option>Anyone</option>
                  {householdMembers.map((member) => (
                    <option key={member}>{member}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Due</span>
                <input
                  value={taskForm.due}
                  onChange={(event) => updateTaskForm("due", event.target.value)}
                  placeholder="After dinner"
                />
              </label>
              <label>
                <span>Difficulty</span>
                <select
                  value={taskForm.difficulty}
                  onChange={(event) => updateTaskForm("difficulty", event.target.value)}
                >
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {taskAlreadyAvailable && (
                <p className="form-note" role="status">
                  Already available
                </p>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    needsCloudAccount ||
                    board.loading ||
                    board.saving ||
                    !taskForm.title.trim() ||
                    taskAlreadyAvailable
                  }
                >
                  {editingChoreId ? "Save changes" : "Save task"}
                </button>
                {editingChoreId && (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={board.saving}
                    onClick={removeEditingTask}
                  >
                    Remove task
                  </button>
                )}
                <button type="button" className="ghost-button" onClick={closeTaskForm}>
                  Cancel
                </button>
              </div>
            </form>
          </details>

          <div className="task-list">
            {needsCloudAccount ? (
              <p className="empty-state">{cloudAccessMessage}</p>
            ) : board.loading ? (
              <p className="empty-state">Loading household data...</p>
            ) : availableChores.length === 0 ? (
              <p className="empty-state">No available tasks yet.</p>
            ) : (
              availableChores.map((chore) => (
                <article
                  className={`task-card difficulty-${chore.difficulty}`}
                  key={chore.id}
                >
                  <div>
                    <div className="task-title-row">
                      <h3>{chore.title}</h3>
                      <span className="area-chip">{chore.area}</span>
                      <span className={`difficulty-chip difficulty-${chore.difficulty}`}>
                        {getDifficultyLabel(chore.difficulty)}
                      </span>
                      {chore.overdueDays > 0 && (
                        <span className="overdue-chip">
                          {chore.overdueDays} {chore.overdueDays === 1 ? "day" : "days"} not done
                        </span>
                      )}
                    </div>
                    <p>{chore.assignee} · {chore.due}</p>
                  </div>
                  <div className="task-actions">
                    <label className="done-by-both">
                      <input
                        type="checkbox"
                        checked={Boolean(doneByBothByTask[getDoneByBothKey(chore)])}
                        onChange={(event) =>
                          setDoneByBothByTask((current) => ({
                            ...current,
                            [getDoneByBothKey(chore)]: event.target.checked
                          }))
                        }
                      />
                      <span>Done by both people</span>
                    </label>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={board.saving}
                      onClick={() => toggleChoreCompletion(chore)}
                      aria-label={`Done ${chore.title}`}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={board.saving}
                      onClick={() => openEditTaskForm(chore)}
                    >
                      Edit
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {activeView === "summary" && (
        <section className="workspace" aria-labelledby="summary-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Chore history</p>
              <h2 id="summary-title">Summary</h2>
              <p>
                {completionSummary.totalTasks} tasks done · {completionSummary.totalPoints} points
              </p>
            </div>
            <div className="summary-mode-switch" aria-label="Summary period">
              <button
                type="button"
                className={summaryMode === "weeks" ? "is-active" : ""}
                aria-pressed={summaryMode === "weeks"}
                onClick={() => setSummaryMode("weeks")}
              >
                Weeks
              </button>
              <button
                type="button"
                className={summaryMode === "months" ? "is-active" : ""}
                aria-pressed={summaryMode === "months"}
                onClick={() => setSummaryMode("months")}
              >
                Months
              </button>
            </div>
          </div>

          <div className="summary-list">
            {needsCloudAccount ? (
              <p className="empty-state">{cloudAccessMessage}</p>
            ) : board.loading ? (
              <p className="empty-state">Loading household data...</p>
            ) : completionSummary.periods.length === 0 ? (
              <p className="empty-state">No completed chores yet.</p>
            ) : (
              completionSummary.periods.map((period, index) => (
                <details className="summary-period" key={period.key} open={index === 0}>
                  <summary>
                    <span className="summary-period-title">{period.label}</span>
                    <span className="summary-period-totals">
                      {formatMemberTotals(period.memberTotals)}
                    </span>
                  </summary>

                  <div className="completion-list">
                    {period.completions.map((completion) => (
                      <article className="completion-row" key={completion.id}>
                        <div>
                          <h3>{completion.title}</h3>
                          <p>
                            {formatCompletionDate(completion.completedDate)} ·{" "}
                            {getCompletionActorLabel(completion)} ·{" "}
                            {getDifficultyLabel(completion.difficulty)}
                          </p>
                        </div>
                        <div className="completion-meta">
                          <span>{completion.area}</span>
                          <strong>
                            {completion.points} {completion.points === 1 ? "point" : "points"}
                          </strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              ))
            )}
          </div>
        </section>
      )}

      {activeView === "shopping" && (
        <section className="workspace" aria-labelledby="shopping-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Buying list</p>
              <h2 id="shopping-title">Shopping list</h2>
              <p>{openShoppingItems} still needed</p>
            </div>
          </div>

          <div className="shopping-tools">
            <details className="tool-panel">
              <summary>Add item</summary>
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
                  disabled={needsCloudAccount || board.loading || board.saving}
                >
                  Add item
                </button>
              </form>
            </details>

            <details className="tool-panel">
              <summary>Add price</summary>
              <form className="inline-form" onSubmit={addOffer}>
                <label>
                  <span>Price for</span>
                  <select
                    value={offerForm.itemId}
                    disabled={needsCloudAccount || !shoppingItems.length}
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
                  disabled={
                    needsCloudAccount || board.loading || board.saving || !shoppingItems.length
                  }
                >
                  Add price
                </button>
              </form>
            </details>
          </div>

          <div className="shopping-list">
            {needsCloudAccount ? (
              <p className="empty-state">{cloudAccessMessage}</p>
            ) : board.loading ? (
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
                      <p>{item.bought ? `${item.quantity} · bought` : item.quantity}</p>
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
                      {item.bought ? "Need" : "Bought"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
      <InstallPrompt />
    </main>
  );
}

function getTaskFormFromChore(chore) {
  return {
    area: chore.area || "Home",
    assignee: chore.assignee || "Anyone",
    difficulty: chore.difficulty || "medium",
    due: chore.due || "Anytime",
    profileId: chore.profileId || "",
    title: chore.title || ""
  };
}

function getDoneByBothKey(chore) {
  return chore.id;
}

function getTaskAreaOptions(taskProfiles, chores) {
  const areas = new Set(["Home"]);

  [...taskProfiles, ...chores].forEach((source) => {
    const area = String(source.area || "").trim();

    if (area) {
      areas.add(area);
    }
  });

  return Array.from(areas);
}

function getTaskProfileOptionLabel(profile) {
  const completedCount = Number(profile.completedCount) || 0;

  return `${profile.title} - ${completedCount} ${completedCount === 1 ? "done" : "done"}`;
}

function getSummaryMembers(members = []) {
  const memberNames = members
    .map((member) => String(member.displayName || member.id || "").trim())
    .filter(Boolean);

  return memberNames.length > 0 ? memberNames : householdMembers;
}

function buildCompletionSummary(completions, mode, members) {
  const periodMap = new Map();
  let totalPoints = 0;

  completions.forEach((completion) => {
    const points = Number(completion.points) || 0;
    const period = getCompletionPeriod(completion.completedDate, mode);

    totalPoints += points;

    if (!periodMap.has(period.key)) {
      periodMap.set(period.key, {
        ...period,
        completions: [],
        totalsByMember: new Map(members.map((member) => [member, { member, points: 0, tasks: 0 }]))
      });
    }

    const bucket = periodMap.get(period.key);
    const creditedMembers =
      Array.isArray(completion.creditedMembers) && completion.creditedMembers.length > 0
        ? completion.creditedMembers
        : [completion.completedBy || "Someone"];

    bucket.completions.push(completion);
    creditedMembers.forEach((member) => {
      if (!bucket.totalsByMember.has(member)) {
        bucket.totalsByMember.set(member, { member, points: 0, tasks: 0 });
      }

      const memberTotal = bucket.totalsByMember.get(member);
      memberTotal.tasks += 1;
      memberTotal.points += points;
    });
  });

  return {
    periods: Array.from(periodMap.values())
      .map((period) => ({
        ...period,
        completions: period.completions.sort((left, right) =>
          String(right.completedAt).localeCompare(String(left.completedAt))
        ),
        memberTotals: Array.from(period.totalsByMember.values())
      }))
      .sort((left, right) => right.sortKey.localeCompare(left.sortKey)),
    totalPoints,
    totalTasks: completions.length
  };
}

function getCompletionPeriod(dateKey, mode) {
  if (mode === "months") {
    const monthKey = String(dateKey || todayDateKey).slice(0, 7);

    return {
      key: monthKey,
      label: formatDisplayDate(`${monthKey}-01`, { month: "long", year: "numeric" }),
      sortKey: monthKey
    };
  }

  const { week, year } = getIsoWeekInfo(dateKey || todayDateKey);

  return {
    key: `${year}-W${String(week).padStart(2, "0")}`,
    label: `Week ${week}`,
    sortKey: `${year}-W${String(week).padStart(2, "0")}`
  };
}

function getIsoWeekInfo(dateKey) {
  const date = getDateFromKey(dateKey);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const year = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

  return { week, year };
}

function formatMemberTotals(memberTotals) {
  return memberTotals
    .map(
      (total) =>
        `${total.member} - ${total.tasks} ${total.tasks === 1 ? "task" : "tasks"} done ${total.points} ${
          total.points === 1 ? "point" : "points"
        }`
    )
    .join(", ");
}

function formatCompletionDate(dateKey) {
  return formatDisplayDate(dateKey, { month: "short", day: "numeric" });
}

function getCompletionActorLabel(completion) {
  return completion.doneByBoth ? "Both" : completion.completedBy || "Someone";
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

    return "";
  }

  return isFirebaseConfigured ? "Sign in for cloud" : "Local starter mode";
}

export default App;
