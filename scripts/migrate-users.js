const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function migrateAllUsers() {
  const db = admin.firestore();
  const auth = admin.auth();

  let nextPageToken;
  let userCount = 0;

  console.log("🔄 Début de la migration des utilisateurs...\n");

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);

    for (const user of listUsersResult.users) {
      const userProfile = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime || user.metadata.creationTime,
        providerData: user.providerData.map((p) => ({
          providerId: p.providerId,
          email: p.email || null,
        })),
        disabled: user.disabled || false,
        isAdmin: false, // Par défaut, pas admin
      };

      await db.collection("user_profiles").doc(user.uid).set(userProfile);
      userCount++;
      console.log(`✓ ${userCount}. Migré: ${user.email || user.uid}`);
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`\n✅ Total utilisateurs migrés: ${userCount}`);
}

migrateAllUsers()
  .then(() => {
    console.log("\n🎉 Migration terminée avec succès !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
