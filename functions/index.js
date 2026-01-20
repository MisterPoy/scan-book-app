const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const PROFILE_COLLECTION = "user_profiles";

const buildUserProfilePayload = (user) => ({
  uid: user.uid,
  email: user.email || null,
  displayName: user.displayName || null,
  photoURL: user.photoURL || null,
  emailVerified: user.emailVerified,
  createdAt: user.metadata.creationTime,
  lastLoginAt: user.metadata.lastSignInTime || user.metadata.creationTime,
  providerData: user.providerData.map((provider) => ({
    providerId: provider.providerId,
    email: provider.email || null,
  })),
  disabled: user.disabled || false,
  isAdmin: false,
  totalBooks: 0,
  totalLibraries: 0,
  lastActivity: null,
});

const pickLastActivity = (data) => {
  if (!data) return new Date().toISOString();
  return data.updatedAt || data.addedAt || new Date().toISOString();
};

const updateCount = async (uid, field, delta, extraUpdates) => {
  const ref = db.collection(PROFILE_COLLECTION).doc(uid);

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.exists && typeof snapshot.get(field) === "number"
      ? snapshot.get(field)
      : 0;
    const next = Math.max(0, current + delta);
    const updates = {
      uid,
      [field]: next,
      ...(extraUpdates || {}),
    };

    tx.set(ref, updates, { merge: true });
  });
};

exports.syncUserProfileOnCreate = functions.auth.user().onCreate(async (user) => {
  const userProfile = buildUserProfilePayload(user);

  await db.collection(PROFILE_COLLECTION).doc(user.uid).set(userProfile);
});

exports.syncUserProfileOnDelete = functions.auth.user().onDelete(async (user) => {
  await db.collection(PROFILE_COLLECTION).doc(user.uid).delete();
});

exports.onBookCreate = functions.firestore
  .document("users/{uid}/collection/{bookId}")
  .onCreate(async (snapshot, context) => {
    const lastActivity = pickLastActivity(snapshot.data());
    await updateCount(context.params.uid, "totalBooks", 1, { lastActivity });
  });

exports.onBookUpdate = functions.firestore
  .document("users/{uid}/collection/{bookId}")
  .onUpdate(async (change, context) => {
    const lastActivity = pickLastActivity(change.after.data());
    await db
      .collection(PROFILE_COLLECTION)
      .doc(context.params.uid)
      .set({ uid: context.params.uid, lastActivity }, { merge: true });
  });

exports.onBookDelete = functions.firestore
  .document("users/{uid}/collection/{bookId}")
  .onDelete(async (_, context) => {
    await updateCount(context.params.uid, "totalBooks", -1);
  });

exports.onLibraryCreate = functions.firestore
  .document("users/{uid}/libraries/{libraryId}")
  .onCreate(async (_, context) => {
    await updateCount(context.params.uid, "totalLibraries", 1);
  });

exports.onLibraryDelete = functions.firestore
  .document("users/{uid}/libraries/{libraryId}")
  .onDelete(async (_, context) => {
    await updateCount(context.params.uid, "totalLibraries", -1);
  });
