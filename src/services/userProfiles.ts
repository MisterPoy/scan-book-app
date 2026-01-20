import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const buildUserProfilePayload = (user: User) => {
  const providerData = user.providerData.map((provider) => ({
    providerId: provider.providerId,
    email: provider.email ?? null,
  }));

  const createdAt =
    user.metadata.creationTime ?? new Date().toISOString();
  const lastLoginAt =
    user.metadata.lastSignInTime ?? createdAt;

  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    emailVerified: user.emailVerified,
    createdAt,
    lastLoginAt,
    providerData,
  };
};

export const syncUserProfile = async (user: User) => {
  const userRef = doc(db, "user_profiles", user.uid);
  const payload = buildUserProfilePayload(user);

  await setDoc(userRef, payload, { merge: true });
};

type UserProfileStatsUpdate = {
  uid: string;
  totalBooks?: number;
  totalLibraries?: number;
  lastActivity?: string | null;
};

export const updateUserProfileStats = async ({
  uid,
  totalBooks,
  totalLibraries,
  lastActivity,
}: UserProfileStatsUpdate) => {
  const updates: Record<string, unknown> = {};

  if (typeof totalBooks === "number") {
    updates.totalBooks = totalBooks;
  }

  if (typeof totalLibraries === "number") {
    updates.totalLibraries = totalLibraries;
  }

  if (typeof lastActivity === "string" || lastActivity === null) {
    updates.lastActivity = lastActivity;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const userRef = doc(db, "user_profiles", uid);
  await setDoc(userRef, updates, { merge: true });
};
