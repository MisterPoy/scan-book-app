# Configuration de la Gestion des Utilisateurs (Admin)

## 📋 Vue d'ensemble

Le système de gestion des utilisateurs permet à un administrateur de :
- Visualiser tous les utilisateurs inscrits
- Consulter les statistiques globales (total, actifs, nouveaux)
- Filtrer par méthode d'authentification (Google, Email/Password)
- Filtrer par activité (actifs/inactifs dans les 30 derniers jours)
- Rechercher par email ou nom
- Voir les détails de chaque utilisateur (nombre de livres, bibliothèques, dernière activité)

## 🏗️ Architecture Technique

### 1. Collection Firestore `user_profiles`

Cette collection stocke les métadonnées des utilisateurs car **Firebase Auth n'est pas directement accessible depuis le frontend** (nécessite Admin SDK côté backend).

**Structure d'un document** :
```typescript
{
  uid: string;                    // UID Firebase Auth
  email: string | null;           // Email de l'utilisateur
  displayName: string | null;     // Nom d'affichage
  photoURL: string | null;        // Photo de profil
  emailVerified: boolean;         // Email vérifié ou non
  createdAt: string;              // Date de création (ISO)
  lastLoginAt: string;            // Dernière connexion (ISO)
  totalBooks: number;             // Livres dans la collection
  totalLibraries: number;         // Bibliotheques creees
  lastActivity: string | null;    // Derniere activite (ISO)
  providerData: [{                // Méthodes d'authentification
    providerId: string;           // "google.com", "password", etc.
    email: string | null;
  }];
  disabled: boolean;              // Compte désactivé ou non
  isAdmin: boolean;               // Est administrateur (optionnel)
}
```

### 2. Types TypeScript

Fichier : `src/types/user.ts`

Défini les interfaces pour :
- `UserData` : Données utilisateur de base
- `UserStats` : Statistiques calculées (livres, bibliothèques)
- `UserWithStats` : Combinaison des deux
- `UsersOverview` : Vue d'ensemble globale

### 3. Hook personnalisé

Fichier : `src/hooks/useUsers.ts`

Fonctionnalités :
- `fetchUsers()` : Récupère tous les utilisateurs depuis Firestore
 - Les stats sont lues depuis `user_profiles` (totalBooks, totalLibraries, lastActivity)
- `calculateOverview()` : Calcule les statistiques globales
- `searchByEmail()` : Filtre par email/nom
- `filterByProvider()` : Filtre par méthode d'auth
- `filterByActivity()` : Filtre par activité (actifs/inactifs)
- `refresh()` : Recharge les données

### 4. Composant UI

Fichier : `src/components/UserManagement.tsx`

Interface composée de :
- **Cards de statistiques** : Total, actifs, Google, Email
- **Graphiques** : Répartition par provider (Pie Chart), activité (Bar Chart)
- **Filtres et recherche** : 3 filtres combinables
- **Tableau utilisateurs** : Liste paginée avec toutes les infos
- **Modal de détails** : Vue complète d'un utilisateur

---

## ⚙️ Configuration Firebase

### Étape 1 : Créer la Collection `user_profiles`

#### Option A : Cloud Function (RECOMMANDE pour production)

Utiliser `functions/index.js` (present dans ce repo) pour:
- synchroniser les profils Auth -> Firestore
- tenir a jour les stats (livres/bibliotheques/derniere activite)

```javascript
```
// Voir functions/index.js pour le code complet
```

**Deploiement** :
```bash
cd functions
npm install
firebase deploy --only functions
```

#### Option B : Script Node.js manuel (TEMPORAIRE pour développement)

Si vous n'avez pas encore de Cloud Functions, voici un script pour migrer les utilisateurs existants :

```javascript
// scripts/sync-users.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Télécharger depuis Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function syncAllUsers() {
  const db = admin.firestore();
  const auth = admin.auth();

  let nextPageToken;
  let userCount = 0;

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
        providerData: user.providerData.map(p => ({
          providerId: p.providerId,
          email: p.email || null,
        })),
        disabled: user.disabled || false,
        isAdmin: false,
      };

      await db.collection("user_profiles").doc(user.uid).set(userProfile);
      userCount++;
      console.log(`✓ Synced user ${userCount}: ${user.email}`);
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`\n✅ Total users synced: ${userCount}`);
}

syncAllUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
```

**Exécution** :
```bash
node scripts/sync-users.js
```

### Étape 2 : Déployer les Règles Firestore

Fichier : `firestore-user-profiles.rules`

**À fusionner avec vos règles existantes** dans la console Firebase :

1. Aller sur Firebase Console → Firestore Database → Rules
2. Copier le contenu de `firestore-user-profiles.rules`
3. L'intégrer dans vos règles existantes
4. Publier les règles

**Points importants** :
- Seuls les admins peuvent lire `user_profiles`
- Les utilisateurs peuvent mettre a jour: `displayName`, `photoURL`, `lastLoginAt`,
  `totalBooks`, `totalLibraries`, `lastActivity` (champs limites)
- La creation/suppression est reservee aux admins ou Cloud Functions

### Étape 3 : Définir le Premier Administrateur

Pour définir un utilisateur comme admin, vous devez manuellement modifier Firestore :

1. Firebase Console → Firestore Database
2. Aller dans `user_profiles`
3. Trouver votre document utilisateur (par UID)
4. Ajouter le champ `isAdmin: true`

**Ou via script** :
```javascript
const admin = require("firebase-admin");
// ... initialisation

await admin.firestore()
  .collection("user_profiles")
  .doc("VOTRE_UID_ICI")
  .update({ isAdmin: true });
```

### Etape 4 : Mettre a jour `lastLoginAt` lors de la connexion

Dans votre code de connexion existant (`src/components/login.tsx` ou équivalent), ajouter :

```typescript
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// Après une connexion réussie
const updateLastLogin = async (uid: string) => {
  await updateDoc(doc(db, "user_profiles", uid), {
    lastLoginAt: new Date().toISOString(),
  });
};

// Dans votre handler de connexion
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await updateLastLogin(user.uid);
  }
});
```

---

## 🎯 Utilisation

### Accéder au Dashboard

1. Se connecter avec un compte **admin** (ayant `isAdmin: true`)
2. Cliquer sur le bouton **"Admin"** (icône mégaphone)
3. Sélectionner **"Utilisateurs"** dans le menu déroulant
4. Le tableau de bord s'affiche en plein écran

### Fonctionnalités Disponibles

#### 📊 Vue d'ensemble
- **Total Utilisateurs** : Nombre total d'inscrits
- **Utilisateurs Actifs** : Connectés dans les 30 derniers jours
- **Google Auth** : Pourcentage d'utilisateurs Google
- **Email/Password** : Pourcentage d'utilisateurs email

#### 📈 Graphiques
- **Répartition par Provider** : Camembert (Pie Chart)
- **Activité** : Graphique à barres (actifs vs inactifs)

#### 🔍 Filtres
- **Recherche** : Par email ou nom d'affichage
- **Méthode d'authentification** : Tous / Google / Email
- **Activité** : Tous / Actifs (30 jours) / Inactifs

#### 👤 Détails Utilisateur
Cliquer sur **"Détails"** pour voir :
- UID complet
- Statut de vérification email
- Date de création et dernière connexion
- Méthodes d'authentification utilisées
- **Statistiques** :
  - Nombre de livres dans la collection
  - Nombre de bibliothèques créées
  - Dernière activité (ajout/modification de livre)

---

## 🔒 Sécurité

### Points Critiques

1. **Vérification Admin Côté Backend**
   - Les règles Firestore vérifient `isAdmin` avant d'autoriser la lecture
   - Ne JAMAIS exposer les données utilisateurs sans cette vérification

2. **Pas d'Accès Direct à Firebase Auth**
   - Firebase Auth Admin SDK nécessite des credentials backend
   - C'est pourquoi on utilise Firestore comme cache

3. **Données Sensibles**
   - Les emails et noms sont affichés uniquement aux admins
   - Les mots de passe ne sont JAMAIS stockés/affichés (gérés par Firebase Auth)

4. **Limitation des Actions**
   - Actuellement en **lecture seule** (visualisation uniquement)
   - Pour désactiver un utilisateur, il faut utiliser Firebase Console ou une Cloud Function

---

## 📦 Dépendances

Le composant utilise **Recharts** pour les graphiques. Vérifier que c'est installé :

```bash
npm list recharts
```

Si absent :
```bash
npm install recharts
```

---

## 🚀 Améliorations Futures Possibles

1. **Actions Admin Avancées**
   - Désactiver/Activer un utilisateur
   - Réinitialiser le mot de passe
   - Envoyer un email de vérification

2. **Statistiques Avancées**
   - Graphique d'évolution (nouveaux utilisateurs par semaine/mois)
   - Heatmap d'activité
   - Top 10 des utilisateurs les plus actifs

3. **Export de Données**
   - Export CSV/PDF de la liste des utilisateurs
   - Rapport d'activité mensuel

4. **Notifications**
   - Alertes pour nouveaux utilisateurs
   - Alertes pour utilisateurs inactifs depuis X jours

5. **Rôles et Permissions**
   - Système de rôles (admin, modérateur, utilisateur)
   - Permissions granulaires

---

## 🐛 Troubleshooting

### Erreur : "Impossible de charger les utilisateurs"

**Causes possibles** :
1. Collection `user_profiles` vide ou inexistante
   - **Solution** : Exécuter le script de sync
2. Règles Firestore trop restrictives
   - **Solution** : Vérifier que l'utilisateur connecté a `isAdmin: true`
3. Utilisateur non admin
   - **Solution** : Définir `isAdmin: true` dans Firestore

### Erreur : "Permission denied"

**Cause** : Les règles Firestore bloquent l'accès

**Solution** :
1. Vérifier que les règles `firestore-user-profiles.rules` sont déployées
2. Vérifier que l'utilisateur connecté a `isAdmin: true` dans son document Firestore

### Statistiques incorrectes

**Cause** : Données non synchronisées ou `lastLoginAt` pas à jour

**Solution** :
1. S'assurer que la Cloud Function de sync est deployee
2. Vérifier que `lastLoginAt` se met à jour lors de la connexion

---

## 📚 Résumé des Fichiers

| Fichier | Description |
|---------|-------------|
| `src/types/user.ts` | Interfaces TypeScript pour les utilisateurs |
| `src/hooks/useUsers.ts` | Hook de récupération et filtrage des données |
| `src/components/UserManagement.tsx` | Composant UI du tableau de bord |
| `firestore-user-profiles.rules` | Règles de sécurité Firestore |
| `SETUP_USER_MANAGEMENT.md` | Ce fichier (documentation complète) |

---

**Développé avec les principes de Clean Code et SOLID** ✨
