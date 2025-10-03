# Configuration Admin Firebase avec Custom Claims

## Problème actuel

Les règles Firestore utilisent un UID hardcodé pour vérifier les droits admin :

```javascript
function isAdmin() {
  return request.auth != null && (
    request.auth.uid == "wpZJ2pZ0zOdaw68optxamlkjRg13" || // UID hardcodé
    // ...
  );
}
```

## Solution recommandée : Custom Claims

Utiliser les Custom Claims Firebase Auth pour gérer les droits admin.

### Étape 1 : Créer une Cloud Function

Créer `functions/src/setAdminClaim.ts` :

\`\`\`typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const setAdminClaim = functions.https.onCall(async (data, context) => {
  // Vérifier que l'appelant est déjà admin (bootstrap initial manuel)
  if (context.auth?.token.admin !== true && context.auth?.uid !== 'wpZJ2pZ0zOdaw68optxamlkjRg13') {
    throw new functions.https.HttpsError('permission-denied', 'Seuls les admins peuvent définir d\'autres admins');
  }

  const { uid } = data;

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    return { success: true, message: \`Admin claim défini pour l'utilisateur \${uid}\` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Erreur lors de la définition du claim admin');
  }
});

// Fonction pour retirer le claim admin
export const removeAdminClaim = functions.https.onCall(async (data, context) => {
  if (context.auth?.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Seuls les admins peuvent retirer des droits admin');
  }

  const { uid } = data;

  // Empêcher de se retirer soi-même les droits
  if (context.auth.uid === uid) {
    throw new functions.https.HttpsError('permission-denied', 'Impossible de retirer vos propres droits admin');
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: false });
    return { success: true, message: \`Admin claim retiré pour l'utilisateur \${uid}\` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Erreur lors du retrait du claim admin');
  }
});
\`\`\`

### Étape 2 : Mettre à jour les règles Firestore

Modifier `firestore.rules` :

\`\`\`javascript
// Function to check if user is admin
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
\`\`\`

### Étape 3 : Bootstrap initial

Pour le premier admin (Greg), exécuter manuellement via Firebase Admin SDK ou CLI :

\`\`\`bash
firebase functions:shell
> admin.auth().setCustomUserClaims('wpZJ2pZ0zOdaw68optxamlkjRg13', { admin: true })
\`\`\`

Ou créer un script one-time :

\`\`\`typescript
// scripts/bootstrap-admin.ts
import * as admin from 'firebase-admin';
import * as serviceAccount from '../serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

async function bootstrapAdmin() {
  const uid = 'wpZJ2pZ0zOdaw68optxamlkjRg13'; // Greg's UID
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log('✅ Custom claim admin défini pour Greg');
}

bootstrapAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
\`\`\`

### Étape 4 : Interface admin dans l'app

Créer un composant `AdminUserManager.tsx` pour gérer les admins :

- Lister tous les utilisateurs
- Bouton "Définir comme admin" / "Retirer admin"
- Appeler les Cloud Functions `setAdminClaim` / `removeAdminClaim`

### Étape 5 : Vérifier le claim côté client

Dans `src/App.tsx`, vérifier le custom claim :

\`\`\`typescript
const checkAndSetupAdmin = async (user: User | null) => {
  if (!user) {
    setIsAdmin(false);
    return;
  }

  try {
    // Forcer le refresh du token pour obtenir les derniers claims
    const idTokenResult = await user.getIdTokenResult(true);

    // Vérifier le custom claim
    setIsAdmin(idTokenResult.claims.admin === true);
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    setIsAdmin(false);
  }
};
\`\`\`

## Avantages

- ✅ Pas d'UID hardcodé dans le code
- ✅ Scalable : plusieurs admins possibles
- ✅ Sécurisé : géré par Firebase Auth
- ✅ Testable : émulateur Firebase supporte les custom claims

## Déploiement

1. Installer Firebase Functions : `npm install -g firebase-tools`
2. Init functions : `firebase init functions`
3. Déployer : `firebase deploy --only functions`
4. Exécuter le script bootstrap pour le premier admin
5. Déployer les nouvelles rules : `firebase deploy --only firestore:rules`

## Alternative rapide (temporaire)

En attendant les Cloud Functions, garder le système actuel mais :

1. Déplacer l'UID dans une variable d'environnement
2. Ajouter un champ `isAdmin` en Firestore (comme actuellement)
3. Prévoir migration vers custom claims dans Sprint 2
