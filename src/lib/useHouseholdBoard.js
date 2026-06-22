import { useCallback, useEffect, useState } from "react";
import {
  arrayUnion,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import {
  choresRef,
  householdRef,
  membersRef,
  shoppingItemsRef,
  withAuditFields,
  withUpdateFields
} from "./firestore";
import {
  createId,
  getCadenceLabel,
  normalizeChore,
  normalizeWeekdays,
  starterChores,
  starterShoppingItems,
  todayDateKey
} from "./householdData";
import { useLocalStorage } from "./useLocalStorage";

export const householdId =
  import.meta.env.VITE_FIREBASE_HOUSEHOLD_ID || "linhgiang-home";

function sortByBoardOrder(left, right) {
  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return (left.title || left.name || left.id).localeCompare(right.title || right.name || right.id);
}

function getFriendlyFirestoreError(error) {
  if (error?.code === "permission-denied") {
    return "This account is not a member of the configured household yet.";
  }

  return error?.message || "Cloud household data is unavailable right now.";
}

function buildStarterChore(chore, index) {
  return {
    ...normalizeChore(chore, index),
    completedByUid: null,
    sortOrder: index
  };
}

function buildStarterShoppingItem(item, index) {
  return {
    ...item,
    offers: item.offers.map((offer) => ({
      ...offer,
      observedByUid: null
    })),
    sortOrder: index
  };
}

function cleanText(value, fallback) {
  const cleaned = String(value || "").trim();

  return cleaned || fallback;
}

function buildChoreFields(taskForm, startsOn, sortOrder, completionHistory = {}) {
  const repeatType = ["once", "daily", "weekdays"].includes(taskForm.repeatType)
    ? taskForm.repeatType
    : "daily";
  const weekdays = repeatType === "weekdays" ? normalizeWeekdays(taskForm.weekdays) : [];
  const difficulty = ["easy", "medium", "difficult"].includes(taskForm.difficulty)
    ? taskForm.difficulty
    : "medium";

  return {
    area: cleanText(taskForm.area, "Home"),
    assignee: cleanText(taskForm.assignee, "Anyone"),
    cadence: getCadenceLabel(repeatType, weekdays),
    completedAt: null,
    completedBy: null,
    completedByUid: null,
    completionHistory,
    difficulty,
    done: false,
    doneByBoth: false,
    due: cleanText(taskForm.due, "Anytime"),
    repeatType,
    retiredOn: null,
    sortOrder,
    startsOn,
    title: cleanText(taskForm.title, "Untitled task"),
    weekdays
  };
}

function hasHistoryBefore(chore, effectiveDate) {
  if (chore.startsOn < effectiveDate) {
    return true;
  }

  return Object.keys(chore.completionHistory || {}).some(
    (completionDate) => completionDate < effectiveDate
  );
}

function shouldUpdateChoreInPlace(chore, effectiveDate) {
  return chore.startsOn >= effectiveDate && !hasHistoryBefore(chore, effectiveDate);
}

function getLatestCompletion(completionHistory) {
  return Object.values(completionHistory || {})
    .filter((completion) => completion?.completedAt)
    .sort((left, right) => String(right.completedAt).localeCompare(String(left.completedAt)))[0];
}

function buildChoreTogglePatch(chore, taskState, activeMember, userId = null) {
  const normalizedChore = normalizeChore(chore);
  const completionHistory = { ...normalizedChore.completionHistory };
  const selectedDate = taskState?.selectedDate || todayDateKey;

  if (taskState?.done) {
    const datesToClear =
      taskState.completedDates?.length > 0
        ? taskState.completedDates
        : [taskState.occurrenceDate || selectedDate];

    datesToClear.forEach((dateKey) => {
      delete completionHistory[dateKey];
    });

    const latestCompletion = getLatestCompletion(completionHistory);

    return {
      completedAt: latestCompletion?.completedAt || null,
      completedBy: latestCompletion?.completedBy || null,
      completedByUid: latestCompletion?.completedByUid || null,
      completionHistory,
      done: false,
      doneByBoth: false
    };
  }

  const completedAt = new Date().toISOString();
  const completion = {
    completedAt,
    completedBy: activeMember,
    completedByUid: userId,
    doneByBoth: Boolean(taskState?.doneByBoth)
  };
  const datesToComplete =
    taskState?.pendingDates?.length > 0
      ? taskState.pendingDates
      : [taskState?.occurrenceDate || selectedDate];

  datesToComplete.forEach((dateKey) => {
    completionHistory[dateKey] = completion;
  });

  return {
    completedAt,
    completedBy: activeMember,
    completedByUid: userId,
    completionHistory,
    done: true,
    doneByBoth: completion.doneByBoth
  };
}

function buildChoreResetPatch(chore, taskState) {
  const normalizedChore = normalizeChore(chore);
  const completionHistory = { ...normalizedChore.completionHistory };
  const datesToClear =
    taskState?.completedDates?.length > 0
      ? taskState.completedDates
      : [taskState?.occurrenceDate || taskState?.selectedDate || todayDateKey];

  datesToClear.forEach((dateKey) => {
    delete completionHistory[dateKey];
  });

  const latestCompletion = getLatestCompletion(completionHistory);

  return {
    completedAt: latestCompletion?.completedAt || null,
    completedBy: latestCompletion?.completedBy || null,
    completedByUid: latestCompletion?.completedByUid || null,
    completionHistory,
    done: false,
    doneByBoth: false
  };
}

async function seedStarterBoard(user) {
  const choreSnapshot = await getDocs(choresRef(db, householdId));
  const shoppingSnapshot = await getDocs(shoppingItemsRef(db, householdId));

  if (!choreSnapshot.empty && !shoppingSnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  if (choreSnapshot.empty) {
    starterChores.forEach((chore, index) => {
      batch.set(
        doc(choresRef(db, householdId), chore.id),
        withAuditFields(buildStarterChore(chore, index), user.uid)
      );
    });
  }

  if (shoppingSnapshot.empty) {
    starterShoppingItems.forEach((item, index) => {
      batch.set(
        doc(shoppingItemsRef(db, householdId), item.id),
        withAuditFields(buildStarterShoppingItem(item, index), user.uid)
      );
    });
  }

  await batch.commit();
}

async function ensureHousehold(user, displayName) {
  const targetHouseholdRef = householdRef(db, householdId);

  await setDoc(
    targetHouseholdRef,
    {
      memberIds: arrayUnion(user.uid),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    },
    { merge: true }
  );

  const householdSnapshot = await getDoc(targetHouseholdRef);

  if (!householdSnapshot.exists() || !householdSnapshot.data().memberIds?.includes(user.uid)) {
    const error = new Error("This account is not a member of the configured household yet.");
    error.code = "permission-denied";
    throw error;
  }

  const householdData = householdSnapshot.data();

  if (!householdData.name || !householdData.createdAt || !householdData.createdBy) {
    await updateDoc(
      targetHouseholdRef,
      withUpdateFields(
        {
          createdAt: householdData.createdAt || serverTimestamp(),
          createdBy: householdData.createdBy || user.uid,
          name: householdData.name || "Linhgiang Home"
        },
        user.uid
      )
    );
  }

  const memberRef = doc(membersRef(db, householdId), user.uid);
  const memberSnapshot = await getDoc(memberRef);
  const isFirstMember = (householdData.memberIds || []).length <= 1;

  await setDoc(
    memberRef,
    {
      createdAt: memberSnapshot.exists()
        ? memberSnapshot.data().createdAt
        : serverTimestamp(),
      createdBy: memberSnapshot.exists() ? memberSnapshot.data().createdBy : user.uid,
      displayName,
      role: memberSnapshot.exists()
        ? memberSnapshot.data().role || "member"
        : isFirstMember
          ? "owner"
          : "member",
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    },
    { merge: true }
  );

  await seedStarterBoard(user);
}

export function useLocalHouseholdBoard(activeMember) {
  const [chores, setChores] = useLocalStorage("linhgiang:chores", starterChores);
  const [shoppingItems, setShoppingItems] = useLocalStorage(
    "linhgiang:shopping-items",
    starterShoppingItems
  );

  const addChore = useCallback(
    async (taskForm, startsOn = todayDateKey) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      const newChore = {
        ...buildChoreFields(taskForm, startsOn, Date.now()),
        id: createId("chore")
      };

      setChores((currentChores) => [newChore, ...currentChores]);
      return newChore.id;
    },
    [setChores]
  );

  const updateChore = useCallback(
    async (choreId, taskForm, effectiveDate = todayDateKey) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      const newChoreId = createId("chore");

      setChores((currentChores) => {
        const normalizedChores = currentChores.map((chore, index) =>
          normalizeChore(chore, index)
        );
        const chore = normalizedChores.find((candidate) => candidate.id === choreId);

        if (!chore) {
          return currentChores;
        }

        if (shouldUpdateChoreInPlace(chore, effectiveDate)) {
          return normalizedChores.map((candidate) =>
            candidate.id === choreId
              ? {
                  ...candidate,
                  ...buildChoreFields(
                    taskForm,
                    candidate.startsOn,
                    candidate.sortOrder,
                    candidate.completionHistory
                  ),
                  id: candidate.id
                }
              : candidate
          );
        }

        const retiredChores = normalizedChores.map((candidate) =>
          candidate.id === choreId
            ? {
                ...candidate,
                retiredOn: effectiveDate
              }
            : candidate
        );

        return [
          {
            ...buildChoreFields(taskForm, effectiveDate, chore.sortOrder),
            id: newChoreId,
            relatedChoreId: chore.relatedChoreId || chore.id
          },
          ...retiredChores
        ];
      });

      return newChoreId;
    },
    [setChores]
  );

  const removeChore = useCallback(
    async (choreId, effectiveDate = todayDateKey) => {
      setChores((currentChores) =>
        currentChores.map((chore, index) => {
          const normalizedChore = normalizeChore(chore, index);

          return normalizedChore.id === choreId
            ? {
                ...normalizedChore,
                retiredOn: effectiveDate
              }
            : normalizedChore;
        })
      );

      return true;
    },
    [setChores]
  );

  const toggleChore = useCallback(
    async (choreId, taskState = {}) => {
      setChores((currentChores) =>
        currentChores.map((chore, index) => {
          const normalizedChore = normalizeChore(chore, index);

          return normalizedChore.id === choreId
            ? {
                ...normalizedChore,
                ...buildChoreTogglePatch(normalizedChore, taskState, activeMember)
              }
            : normalizedChore;
        })
      );
    },
    [activeMember, setChores]
  );

  const resetChores = useCallback(
    async (tasks = []) => {
      setChores((currentChores) =>
        currentChores.map((chore, index) => {
          const normalizedChore = normalizeChore(chore, index);
          const taskState = tasks.find((task) => task.id === normalizedChore.id);

          return taskState
            ? {
                ...normalizedChore,
                ...buildChoreResetPatch(normalizedChore, taskState)
              }
            : normalizedChore;
        })
      );
    },
    [setChores]
  );

  const addShoppingItem = useCallback(
    async (itemForm) => {
      if (!itemForm.name.trim()) {
        return null;
      }

      const newItem = {
        bought: false,
        category: itemForm.category,
        id: createId("item"),
        name: itemForm.name.trim(),
        offers: [],
        quantity: itemForm.quantity.trim() || "1"
      };

      setShoppingItems((items) => [newItem, ...items]);
      return newItem.id;
    },
    [setShoppingItems]
  );

  const addOffer = useCallback(
    async (offerForm) => {
      const price = Number(offerForm.price);

      if (!offerForm.itemId || !offerForm.store.trim() || !Number.isFinite(price)) {
        return false;
      }

      const offer = {
        id: createId("offer"),
        observedAt: new Date().toISOString().slice(0, 10),
        observedByUid: null,
        price,
        size: offerForm.size.trim() || "1",
        store: offerForm.store.trim(),
        unit: offerForm.unit.trim() || "item"
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

      return true;
    },
    [setShoppingItems]
  );

  const toggleBought = useCallback(
    async (itemId) => {
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
    },
    [setShoppingItems]
  );

  return {
    addChore,
    addOffer,
    addShoppingItem,
    chores: chores.map((chore, index) => normalizeChore(chore, index)).sort(sortByBoardOrder),
    error: "",
    inviteMember: null,
    loading: false,
    members: [],
    mode: "local",
    removeChore,
    resetChores,
    saving: false,
    shoppingItems,
    toggleBought,
    toggleChore,
    updateChore
  };
}

export function useFirestoreHouseholdBoard({ activeMember, user }) {
  const [chores, setChores] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) {
      setChores([]);
      setShoppingItems([]);
      setMembers([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    let cancelled = false;
    let unsubscribers = [];
    const loaded = {
      chores: false,
      shoppingItems: false
    };

    function markLoaded(key) {
      loaded[key] = true;

      if (loaded.chores && loaded.shoppingItems) {
        setLoading(false);
      }
    }

    async function startSync() {
      setLoading(true);
      setError("");

      try {
        await ensureHousehold(user, activeMember);

        if (cancelled) {
          return;
        }

        unsubscribers = [
          onSnapshot(
            choresRef(db, householdId),
            (snapshot) => {
              setChores(
                snapshot.docs
                  .map((choreDoc, index) =>
                    normalizeChore({ id: choreDoc.id, ...choreDoc.data() }, index)
                  )
                  .sort(sortByBoardOrder)
              );
              markLoaded("chores");
            },
            (syncError) => {
              setError(getFriendlyFirestoreError(syncError));
              setLoading(false);
            }
          ),
          onSnapshot(
            shoppingItemsRef(db, householdId),
            (snapshot) => {
              setShoppingItems(
                snapshot.docs
                  .map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }))
                  .sort(sortByBoardOrder)
              );
              markLoaded("shoppingItems");
            },
            (syncError) => {
              setError(getFriendlyFirestoreError(syncError));
              setLoading(false);
            }
          ),
          onSnapshot(membersRef(db, householdId), (snapshot) => {
            setMembers(
              snapshot.docs
                .map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() }))
                .sort((left, right) =>
                  (left.displayName || left.id).localeCompare(right.displayName || right.id)
                )
            );
          })
        ];
      } catch (syncError) {
        setError(getFriendlyFirestoreError(syncError));
        setLoading(false);
      }
    }

    startSync();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [activeMember, user]);

  const runWrite = useCallback(
    async (writeOperation) => {
      if (!user) {
        return null;
      }

      setSaving(true);
      setError("");

      try {
        return await writeOperation();
      } catch (writeError) {
        setError(getFriendlyFirestoreError(writeError));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const addChore = useCallback(
    async (taskForm, startsOn = todayDateKey) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      return runWrite(async () => {
        const newChore = {
          ...buildChoreFields(taskForm, startsOn, Date.now()),
          id: createId("chore")
        };

        await setDoc(
          doc(choresRef(db, householdId), newChore.id),
          withAuditFields(newChore, user.uid)
        );

        return newChore.id;
      });
    },
    [runWrite, user]
  );

  const updateChore = useCallback(
    async (choreId, taskForm, effectiveDate = todayDateKey) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      const chore = chores.find((candidate) => candidate.id === choreId);

      if (!chore) {
        return null;
      }

      return runWrite(async () => {
        if (shouldUpdateChoreInPlace(chore, effectiveDate)) {
          await updateDoc(
            doc(choresRef(db, householdId), choreId),
            withUpdateFields(
              {
                ...buildChoreFields(
                  taskForm,
                  chore.startsOn,
                  chore.sortOrder,
                  chore.completionHistory
                ),
                id: chore.id
              },
              user.uid
            )
          );

          return chore.id;
        }

        const newChore = {
          ...buildChoreFields(taskForm, effectiveDate, chore.sortOrder),
          id: createId("chore"),
          relatedChoreId: chore.relatedChoreId || chore.id
        };
        const batch = writeBatch(db);

        batch.update(
          doc(choresRef(db, householdId), choreId),
          withUpdateFields({ retiredOn: effectiveDate }, user.uid)
        );
        batch.set(
          doc(choresRef(db, householdId), newChore.id),
          withAuditFields(newChore, user.uid)
        );

        await batch.commit();
        return newChore.id;
      });
    },
    [chores, runWrite, user]
  );

  const removeChore = useCallback(
    async (choreId, effectiveDate = todayDateKey) => {
      const chore = chores.find((candidate) => candidate.id === choreId);

      if (!chore) {
        return null;
      }

      return runWrite(async () => {
        await updateDoc(
          doc(choresRef(db, householdId), choreId),
          withUpdateFields({ retiredOn: effectiveDate }, user.uid)
        );

        return true;
      });
    },
    [chores, runWrite, user]
  );

  const toggleChore = useCallback(
    async (choreId, taskState = {}) => {
      const chore = chores.find((candidate) => candidate.id === choreId);

      if (!chore) {
        return null;
      }

      return runWrite(async () => {
        await updateDoc(
          doc(choresRef(db, householdId), choreId),
          withUpdateFields(
            buildChoreTogglePatch(chore, taskState, activeMember, user.uid),
            user.uid
          )
        );

        return true;
      });
    },
    [activeMember, chores, runWrite, user]
  );

  const resetChores = useCallback(async (tasks = []) => {
    return runWrite(async () => {
      const batch = writeBatch(db);

      tasks.forEach((taskState) => {
        const chore = chores.find((candidate) => candidate.id === taskState.id);

        if (!chore) {
          return;
        }

        batch.update(
          doc(choresRef(db, householdId), chore.id),
          withUpdateFields(buildChoreResetPatch(chore, taskState), user.uid)
        );
      });

      await batch.commit();
      return true;
    });
  }, [chores, runWrite, user]);

  const addShoppingItem = useCallback(
    async (itemForm) => {
      if (!itemForm.name.trim()) {
        return null;
      }

      return runWrite(async () => {
        const newItem = {
          bought: false,
          category: itemForm.category,
          id: createId("item"),
          name: itemForm.name.trim(),
          offers: [],
          quantity: itemForm.quantity.trim() || "1",
          sortOrder: Date.now()
        };

        await setDoc(
          doc(shoppingItemsRef(db, householdId), newItem.id),
          withAuditFields(newItem, user.uid)
        );

        return newItem.id;
      });
    },
    [runWrite, user]
  );

  const addOffer = useCallback(
    async (offerForm) => {
      const price = Number(offerForm.price);

      if (!offerForm.itemId || !offerForm.store.trim() || !Number.isFinite(price)) {
        return false;
      }

      const item = shoppingItems.find((candidate) => candidate.id === offerForm.itemId);

      if (!item) {
        return false;
      }

      return runWrite(async () => {
        const offer = {
          id: createId("offer"),
          observedAt: new Date().toISOString().slice(0, 10),
          observedByUid: user.uid,
          price,
          size: offerForm.size.trim() || "1",
          store: offerForm.store.trim(),
          unit: offerForm.unit.trim() || "item"
        };

        await updateDoc(
          doc(shoppingItemsRef(db, householdId), item.id),
          withUpdateFields(
            {
              offers: [offer, ...(item.offers || [])]
            },
            user.uid
          )
        );

        return true;
      });
    },
    [runWrite, shoppingItems, user]
  );

  const toggleBought = useCallback(
    async (itemId) => {
      const item = shoppingItems.find((candidate) => candidate.id === itemId);

      if (!item) {
        return null;
      }

      return runWrite(async () => {
        await updateDoc(
          doc(shoppingItemsRef(db, householdId), item.id),
          withUpdateFields(
            {
              bought: !item.bought
            },
            user.uid
          )
        );

        return true;
      });
    },
    [runWrite, shoppingItems, user]
  );

  const inviteMember = useCallback(
    async ({ displayName, memberId }) => {
      const cleanMemberId = memberId.trim();

      if (!cleanMemberId) {
        return false;
      }

      return runWrite(async () => {
        await updateDoc(
          householdRef(db, householdId),
          withUpdateFields(
            {
              memberIds: arrayUnion(cleanMemberId)
            },
            user.uid
          )
        );

        await setDoc(
          doc(membersRef(db, householdId), cleanMemberId),
          {
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            displayName: displayName.trim() || "Partner",
            role: "member",
            updatedAt: serverTimestamp(),
            updatedBy: user.uid
          },
          { merge: true }
        );

        return true;
      });
    },
    [runWrite, user]
  );

  return {
    addChore,
    addOffer,
    addShoppingItem,
    chores,
    error,
    inviteMember,
    loading,
    members,
    mode: "cloud",
    removeChore,
    resetChores,
    saving,
    shoppingItems,
    toggleBought,
    toggleChore,
    updateChore
  };
}
