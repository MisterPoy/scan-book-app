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
  await db.collection(PROFILE_COLLECTION).doc(user.uid).delete().catch((error) => {
    if (error.code !== 5) throw error;
  });
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

const deleteQueryInBatches = async (query) => {
  const snapshot = await query.limit(400).get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
  await deleteQueryInBatches(query);
};

/**
 * Deletes all data owned by the authenticated user.
 *
 * Authentication is deleted last so a transient failure can be retried. A
 * recent sign-in is required before any destructive work starts.
 */
exports.deleteOwnAccount = functions.https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Vous devez être connecté pour supprimer votre compte.",
    );
  }

  const authenticatedAt = Number(context.auth.token.auth_time || 0);
  const authenticationAgeSeconds = Math.floor(Date.now() / 1000) - authenticatedAt;
  if (authenticationAgeSeconds > 300) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Une connexion récente est nécessaire avant la suppression.",
    );
  }

  const uid = context.auth.uid;
  const userRef = db.collection("users").doc(uid);

  try {
    await db.recursiveDelete(userRef);
    await Promise.all([
      deleteQueryInBatches(
        db.collection("user_consents").where("userId", "==", uid),
      ),
      deleteQueryInBatches(
        db.collection("notification_history").where("userId", "==", uid),
      ),
      db.collection(PROFILE_COLLECTION).doc(uid).delete().catch((error) => {
        if (error.code !== 5) throw error;
      }),
      admin.storage().bucket().deleteFiles({ prefix: `covers/${uid}/` }),
    ]);

    await admin.auth().deleteUser(uid);
    return { deleted: true };
  } catch (error) {
    console.error("Account deletion failed", { uid, error });
    throw new functions.https.HttpsError(
      "internal",
      "La suppression du compte n'a pas pu être finalisée.",
    );
  }
});

const requireAdmin = (context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Cette opération est réservée aux administrateurs.",
    );
  }
};

const getNotificationRecipients = async (announcement) => {
  let snapshot = await db
    .collection("users")
    .where("notificationsEnabled", "==", true)
    .get();

  let recipients = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter((user) => typeof user.fcmToken === "string" && user.fcmToken);

  if (announcement.targetAudience === "specific") {
    const targets = new Set(announcement.targetUserIds || []);
    recipients = recipients.filter((user) => targets.has(user.id));
  }

  if (announcement.targetAudience === "admins") {
    const adminIds = new Set();
    let pageToken;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((user) => {
        if (user.customClaims?.admin === true) adminIds.add(user.uid);
      });
      pageToken = page.pageToken;
    } while (pageToken);
    recipients = recipients.filter((user) => adminIds.has(user.id));
  }

  return recipients;
};

const sendAnnouncement = async (announcement, selectedRecipients) => {
  const recipients = selectedRecipients || await getNotificationRecipients(announcement);
  let sent = 0;
  let failed = 0;

  for (let start = 0; start < recipients.length; start += 500) {
    const chunk = recipients.slice(start, start + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: chunk.map((recipient) => recipient.fcmToken),
      notification: {
        title: "Nouvelle annonce - Kodeks",
        body: announcement.message || announcement.title,
      },
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-96x96.png",
          tag: `announcement-${announcement.id}`,
          requireInteraction: announcement.priority === "high",
        },
        fcmOptions: { link: "/" },
      },
      data: {
        announcementId: announcement.id,
        type: "announcement",
        priority: announcement.priority,
        url: "/",
      },
    });

    const historyBatch = db.batch();
    response.responses.forEach((result, index) => {
      const recipient = chunk[index];
      const historyRef = db.collection("notification_history").doc();
      historyBatch.set(historyRef, {
        announcementId: announcement.id,
        userId: recipient.id,
        sentAt: new Date().toISOString(),
        status: result.success ? "sent" : "failed",
        priority: announcement.priority,
        retryCount: 0,
        ...(result.error && {
          errorCode: result.error.code,
          errorMessage: result.error.message,
        }),
      });

      if (result.success) sent += 1;
      else failed += 1;
    });
    await historyBatch.commit();
  }

  return { total: recipients.length, sent, failed };
};

exports.sendAnnouncementNotification = functions.https.onCall(
  async (data, context) => {
    requireAdmin(context);
    const announcementId = data?.announcementId;
    if (typeof announcementId !== "string" || !announcementId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Un identifiant d'annonce est requis.",
      );
    }

    const snapshot = await db.collection("announcements").doc(announcementId).get();
    if (!snapshot.exists) {
      throw new functions.https.HttpsError("not-found", "Annonce introuvable.");
    }

    return sendAnnouncement({ id: snapshot.id, ...snapshot.data() });
  },
);

exports.sendTestNotification = functions.https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Connexion requise.");
  }

  const userSnapshot = await db.collection("users").doc(context.auth.uid).get();
  const fcmToken = userSnapshot.get("fcmToken");
  if (!fcmToken) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Activez d'abord les notifications sur cet appareil.",
    );
  }

  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: "Test Kodeks",
      body: "Les notifications sont correctement configurées.",
    },
    webpush: { fcmOptions: { link: "/" } },
  });

  return { sent: true };
});

exports.retryFailedNotifications = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const announcementId = data?.announcementId;
  if (typeof announcementId !== "string" || !announcementId) {
    throw new functions.https.HttpsError("invalid-argument", "Annonce requise.");
  }

  const [announcementSnapshot, historySnapshot] = await Promise.all([
    db.collection("announcements").doc(announcementId).get(),
    db.collection("notification_history")
      .where("announcementId", "==", announcementId)
      .where("status", "==", "failed")
      .get(),
  ]);
  if (!announcementSnapshot.exists) {
    throw new functions.https.HttpsError("not-found", "Annonce introuvable.");
  }

  const userIds = [...new Set(historySnapshot.docs.map((item) => item.get("userId")))];
  const userSnapshots = await Promise.all(
    userIds.map((userId) => db.collection("users").doc(userId).get()),
  );
  const recipients = userSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .filter((user) => user.notificationsEnabled === true && user.fcmToken);

  return sendAnnouncement(
    { id: announcementSnapshot.id, ...announcementSnapshot.data() },
    recipients,
  );
});

exports.cleanupNotificationHistory = functions.https.onCall(async (_, context) => {
  requireAdmin(context);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  await deleteQueryInBatches(
    db.collection("notification_history").where("sentAt", "<", cutoff.toISOString()),
  );
  return { cleaned: true, cutoff: cutoff.toISOString() };
});

const getNextScheduledDate = (scheduledFor, recurring) => {
  const next = new Date(scheduledFor);
  if (recurring === "daily") next.setUTCDate(next.getUTCDate() + 1);
  if (recurring === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (recurring === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
};

exports.processScheduledNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    const now = new Date().toISOString();
    const dueNotifications = await db
      .collection("scheduled_notifications")
      .where("isActive", "==", true)
      .where("scheduledFor", "<=", now)
      .limit(50)
      .get();

    for (const snapshot of dueNotifications.docs) {
      const claimed = await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(snapshot.ref);
        if (
          !fresh.exists ||
          fresh.get("isActive") !== true ||
          fresh.get("scheduledFor") > now
        ) {
          return null;
        }
        transaction.update(snapshot.ref, {
          isActive: false,
          processingAt: now,
        });
        return fresh.data();
      });
      if (!claimed) continue;

      try {
        const summary = await sendAnnouncement({
          id: `scheduled-${snapshot.id}-${Date.now()}`,
          title: claimed.title,
          message: claimed.message,
          priority: "medium",
          targetAudience: claimed.targetAudience || "all",
        });
        const recurring = claimed.recurring || "none";
        await snapshot.ref.update({
          isActive: recurring !== "none",
          ...(recurring !== "none" && {
            scheduledFor: getNextScheduledDate(claimed.scheduledFor, recurring),
          }),
          processingAt: admin.firestore.FieldValue.delete(),
          lastSentAt: new Date().toISOString(),
          lastDeliverySummary: summary,
        });
      } catch (error) {
        console.error("Scheduled notification failed", {
          notificationId: snapshot.id,
          error,
        });
        await snapshot.ref.update({
          isActive: true,
          processingAt: admin.firestore.FieldValue.delete(),
          lastError: error.message,
          lastErrorAt: new Date().toISOString(),
        });
      }
    }

    return null;
  });
