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
  taskProfilesRef,
  withAuditFields,
  withUpdateFields
} from "./firestore";
import {
  createId,
  getAvailableChoresForDate,
  getCadenceLabel,
  getTaskProfileId,
  hasAvailableChoreWithTitle,
  normalizeChore,
  normalizeTaskProfile,
  normalizeTaskTitle,
  sortTaskProfiles,
  starterChores,
  starterTaskProfiles,
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

function getDifficulty(value) {
  return ["easy", "medium", "difficult"].includes(value) ? value : "medium";
}

function buildChoreFields(taskForm, startsOn, sortOrder, completionHistory = {}) {
  const title = cleanText(taskForm.title, "Untitled task");

  return {
    area: cleanText(taskForm.area, "Home"),
    assignee: cleanText(taskForm.assignee, "Anyone"),
    cadence: getCadenceLabel(),
    completedAt: null,
    completedBy: null,
    completedByUid: null,
    completionHistory,
    difficulty: getDifficulty(taskForm.difficulty),
    done: false,
    doneByBoth: false,
    due: cleanText(taskForm.due, "Anytime"),
    normalizedTitle: normalizeTaskTitle(title),
    profileId: getTaskProfileId(title),
    repeatType: "once",
    retiredOn: null,
    sortOrder,
    startsOn,
    title,
    weekdays: []
  };
}

function buildTaskProfileFields(source, existingProfile = {}, options = {}) {
  const title = cleanText(source.title, "Untitled task");
  const now = new Date().toISOString();
  const completedCount = Number(existingProfile.completedCount) || 0;

  return {
    area: cleanText(source.area, "Home"),
    assignee: cleanText(source.assignee, "Anyone"),
    completedCount: completedCount + (options.incrementCompletion ? 1 : 0),
    difficulty: getDifficulty(source.difficulty),
    due: cleanText(source.due, "Anytime"),
    id: source.profileId || existingProfile.id || getTaskProfileId(title),
    lastAddedAt: options.markAdded ? now : existingProfile.lastAddedAt || null,
    lastCompletedAt: options.incrementCompletion
      ? now
      : existingProfile.lastCompletedAt || null,
    normalizedTitle: normalizeTaskTitle(title),
    title
  };
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
  const taskProfileSnapshot = await getDocs(taskProfilesRef(db, householdId));

  if (
    (starterChores.length === 0 || !choreSnapshot.empty) &&
    !shoppingSnapshot.empty &&
    (starterTaskProfiles.length === 0 || !taskProfileSnapshot.empty)
  ) {
    return;
  }

  const batch = writeBatch(db);

  if (starterChores.length > 0 && choreSnapshot.empty) {
    starterChores.forEach((chore, index) => {
      batch.set(
        doc(choresRef(db, householdId), chore.id),
        withAuditFields(buildStarterChore(chore, index), user.uid)
      );
    });
  }

  if (starterTaskProfiles.length > 0 && taskProfileSnapshot.empty) {
    starterTaskProfiles.forEach((profile, index) => {
      const normalizedProfile = normalizeTaskProfile(profile, index);

      batch.set(
        doc(taskProfilesRef(db, householdId), normalizedProfile.id),
        withAuditFields(normalizedProfile, user.uid)
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
  const [taskProfiles, setTaskProfiles] = useLocalStorage(
    "linhgiang:task-profiles",
    starterTaskProfiles
  );
  const [shoppingItems, setShoppingItems] = useLocalStorage(
    "linhgiang:shopping-items",
    starterShoppingItems
  );

  const upsertTaskProfile = useCallback(
    (source, options = {}) => {
      setTaskProfiles((currentProfiles) => {
        const normalizedProfiles = currentProfiles.map((profile, index) =>
          normalizeTaskProfile(profile, index)
        );
        const profileId = source.profileId || getTaskProfileId(source.title);
        const existingProfile = normalizedProfiles.find((profile) => profile.id === profileId);
        const nextProfile = buildTaskProfileFields(source, existingProfile, options);

        if (existingProfile) {
          return normalizedProfiles.map((profile) =>
            profile.id === profileId ? { ...profile, ...nextProfile } : profile
          );
        }

        return [nextProfile, ...normalizedProfiles];
      });
    },
    [setTaskProfiles]
  );

  const addChore = useCallback(
    async (taskForm, startsOn = todayDateKey) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      const duplicateChore = getAvailableChoresForDate(chores, todayDateKey).find(
        (chore) => chore.normalizedTitle === normalizeTaskTitle(taskForm.title)
      );

      if (duplicateChore) {
        return duplicateChore.id;
      }

      const newChore = {
        ...buildChoreFields(taskForm, startsOn, Date.now()),
        id: createId("chore")
      };

      upsertTaskProfile(newChore, { markAdded: true });
      setChores((currentChores) => [newChore, ...currentChores]);
      return newChore.id;
    },
    [chores, setChores, upsertTaskProfile]
  );

  const updateChore = useCallback(
    async (choreId, taskForm) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      if (hasAvailableChoreWithTitle(chores, taskForm.title, choreId, todayDateKey)) {
        return null;
      }

      setChores((currentChores) => {
        const normalizedChores = currentChores.map((chore, index) =>
          normalizeChore(chore, index)
        );
        const chore = normalizedChores.find((candidate) => candidate.id === choreId);

        if (!chore) {
          return currentChores;
        }

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
      });

      return choreId;
    },
    [chores, setChores]
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
      const chore = chores
        .map((candidate, index) => normalizeChore(candidate, index))
        .find((candidate) => candidate.id === choreId);

      if (!chore) {
        return null;
      }

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

      if (!taskState.done) {
        upsertTaskProfile(chore, { incrementCompletion: true });
      }

      return true;
    },
    [activeMember, chores, setChores, upsertTaskProfile]
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
    taskProfiles: taskProfiles
      .map((profile, index) => normalizeTaskProfile(profile, index))
      .sort(sortTaskProfiles),
    toggleBought,
    toggleChore,
    updateChore
  };
}

export function useFirestoreHouseholdBoard({ activeMember, user }) {
  const [chores, setChores] = useState([]);
  const [taskProfiles, setTaskProfiles] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) {
      setChores([]);
      setTaskProfiles([]);
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
      taskProfiles: false,
      shoppingItems: false
    };

    function markLoaded(key) {
      loaded[key] = true;

      if (loaded.chores && loaded.taskProfiles && loaded.shoppingItems) {
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
            taskProfilesRef(db, householdId),
            (snapshot) => {
              setTaskProfiles(
                snapshot.docs
                  .map((profileDoc, index) =>
                    normalizeTaskProfile({ id: profileDoc.id, ...profileDoc.data() }, index)
                  )
                  .sort(sortTaskProfiles)
              );
              markLoaded("taskProfiles");
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

      const duplicateChore = getAvailableChoresForDate(chores, todayDateKey).find(
        (chore) => chore.normalizedTitle === normalizeTaskTitle(taskForm.title)
      );

      if (duplicateChore) {
        return duplicateChore.id;
      }

      return runWrite(async () => {
        const newChore = {
          ...buildChoreFields(taskForm, startsOn, Date.now()),
          id: createId("chore")
        };
        const existingProfile = taskProfiles.find(
          (profile) => profile.id === newChore.profileId
        );
        const profileFields = buildTaskProfileFields(newChore, existingProfile, {
          markAdded: true
        });
        const batch = writeBatch(db);

        batch.set(
          doc(choresRef(db, householdId), newChore.id),
          withAuditFields(newChore, user.uid)
        );
        batch.set(
          doc(taskProfilesRef(db, householdId), newChore.profileId),
          existingProfile
            ? withUpdateFields(profileFields, user.uid)
            : withAuditFields(profileFields, user.uid),
          { merge: true }
        );

        await batch.commit();
        return newChore.id;
      });
    },
    [chores, runWrite, taskProfiles, user]
  );

  const updateChore = useCallback(
    async (choreId, taskForm) => {
      if (!taskForm.title.trim()) {
        return null;
      }

      if (hasAvailableChoreWithTitle(chores, taskForm.title, choreId, todayDateKey)) {
        return null;
      }

      const chore = chores.find((candidate) => candidate.id === choreId);

      if (!chore) {
        return null;
      }

      return runWrite(async () => {
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
        const chorePatch = buildChoreTogglePatch(chore, taskState, activeMember, user.uid);
        const batch = writeBatch(db);

        batch.update(
          doc(choresRef(db, householdId), choreId),
          withUpdateFields(chorePatch, user.uid)
        );

        if (!taskState.done) {
          const existingProfile = taskProfiles.find((profile) => profile.id === chore.profileId);
          const profileFields = buildTaskProfileFields(chore, existingProfile, {
            incrementCompletion: true
          });

          batch.set(
            doc(taskProfilesRef(db, householdId), profileFields.id),
            existingProfile
              ? withUpdateFields(profileFields, user.uid)
              : withAuditFields(profileFields, user.uid),
            { merge: true }
          );
        }

        await batch.commit();
        return true;
      });
    },
    [activeMember, chores, runWrite, taskProfiles, user]
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
    taskProfiles,
    toggleBought,
    toggleChore,
    updateChore
  };
}
