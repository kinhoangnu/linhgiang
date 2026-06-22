import { useCallback, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";

export function getUserDisplayName(user) {
  if (!user) {
    return "You";
  }

  return user.displayName || user.email?.split("@")[0] || "You";
}

function getFriendlyAuthError(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "That email already has an account.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password did not match.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Auth.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    default:
      return error?.message || "Firebase Auth is unavailable right now.";
  }
}

export function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!auth) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async ({ displayName, email, password }) => {
    if (!auth) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanDisplayName = displayName.trim();

      if (cleanDisplayName) {
        await updateProfile(credential.user, { displayName: cleanDisplayName });
        setUser(auth.currentUser);
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth) {
      return;
    }

    setError("");
    await signOut(auth);
  }, []);

  return {
    createAccount,
    error,
    loading,
    signIn,
    signOutUser,
    user
  };
}
