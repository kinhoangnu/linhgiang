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
import { createId, starterChores, starterShoppingItems } from "./householdData";
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
    ...chore,
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

  const toggleChore = useCallback(
    async (choreId) => {
      setChores((currentChores) =>
        currentChores.map((chore) => {
          if (chore.id !== choreId) {
            return chore;
          }

          if (chore.done) {
            return {
              ...chore,
              completedAt: null,
              completedBy: null,
              completedByUid: null,
              done: false
            };
          }

          return {
            ...chore,
            completedAt: new Date().toISOString(),
            completedBy: activeMember,
            completedByUid: null,
            done: true
          };
        })
      );
    },
    [activeMember, setChores]
  );

  const resetChores = useCallback(async () => {
    setChores((currentChores) =>
      currentChores.map((chore) => ({
        ...chore,
        completedAt: null,
        completedBy: null,
        completedByUid: null,
        done: false
      }))
    );
  }, [setChores]);

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
    addOffer,
    addShoppingItem,
    chores,
    error: "",
    inviteMember: null,
    loading: false,
    members: [],
    mode: "local",
    resetChores,
    saving: false,
    shoppingItems,
    toggleBought,
    toggleChore
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
                  .map((choreDoc) => ({ id: choreDoc.id, ...choreDoc.data() }))
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

  const toggleChore = useCallback(
    async (choreId) => {
      const chore = chores.find((candidate) => candidate.id === choreId);

      if (!chore) {
        return null;
      }

      return runWrite(async () => {
        const patch = chore.done
          ? {
              completedAt: null,
              completedBy: null,
              completedByUid: null,
              done: false
            }
          : {
              completedAt: new Date().toISOString(),
              completedBy: activeMember,
              completedByUid: user.uid,
              done: true
            };

        await updateDoc(
          doc(choresRef(db, householdId), choreId),
          withUpdateFields(patch, user.uid)
        );

        return true;
      });
    },
    [activeMember, chores, runWrite, user]
  );

  const resetChores = useCallback(async () => {
    return runWrite(async () => {
      const batch = writeBatch(db);

      chores.forEach((chore) => {
        batch.update(
          doc(choresRef(db, householdId), chore.id),
          withUpdateFields(
            {
              completedAt: null,
              completedBy: null,
              completedByUid: null,
              done: false
            },
            user.uid
          )
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
    addOffer,
    addShoppingItem,
    chores,
    error,
    inviteMember,
    loading,
    members,
    mode: "cloud",
    resetChores,
    saving,
    shoppingItems,
    toggleBought,
    toggleChore
  };
}
