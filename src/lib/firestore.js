import { collection, doc, serverTimestamp } from "firebase/firestore";

export const householdCollection = "households";

export function householdRef(db, householdId) {
  return doc(db, householdCollection, householdId);
}

export function membersRef(db, householdId) {
  return collection(householdRef(db, householdId), "members");
}

export function choresRef(db, householdId) {
  return collection(householdRef(db, householdId), "chores");
}

export function shoppingItemsRef(db, householdId) {
  return collection(householdRef(db, householdId), "shoppingItems");
}

export function priceObservationsRef(db, householdId) {
  return collection(householdRef(db, householdId), "priceObservations");
}

export function storesRef(db, householdId) {
  return collection(householdRef(db, householdId), "stores");
}

export function withAuditFields(data, userId) {
  const timestamp = serverTimestamp();

  return {
    ...data,
    updatedAt: timestamp,
    updatedBy: userId,
    createdAt: data.createdAt ?? timestamp,
    createdBy: data.createdBy ?? userId
  };
}
