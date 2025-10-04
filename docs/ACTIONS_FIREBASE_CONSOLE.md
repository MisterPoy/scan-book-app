# Actions à effectuer dans Firebase Console

Ce document liste toutes les actions que **vous devez** effectuer dans la Firebase Console pour finaliser les phases du backlog post-audit.

**Projet Firebase** : scanbook-27440
**Console** : https://console.firebase.google.com/project/scanbook-27440

---

## 1. Déployer l'index composite Firestore (Phase B1)

### Pourquoi ?
L'index composite est nécessaire pour les requêtes d'idempotence des notifications (`announcementId`, `userId`, `status`).

### Comment ?
1. Ouvrir [Firebase Console > Firestore > Indexes](https://console.firebase.google.com/project/scanbook-27440/firestore/indexes)
2. Cliquer sur "**Single Field**" puis passer à "**Composite**"
3. Créer un nouvel index composite :
   - **Collection** : `notification_history`
   - **Champs indexés** :
     - `announcementId` : Ascending
     - `userId` : Ascending
     - `status` : Ascending
   - **Query scope** : Collection
4. Cliquer sur "**Create Index**"
5. Attendre ~5-10 minutes que l'index soit construit

**Alternative automatique** :
```bash
# Déployer via Firebase CLI (si installé)
firebase deploy --only firestore:indexes
```

---

## 2. Déployer les Firestore Rules (Phase A - Déjà fait ?)

### Pourquoi ?
Les rules ont été mises à jour avec des TODO pour Custom Claims.

### Vérification
1. Ouvrir [Firebase Console > Firestore > Rules](https://console.firebase.google.com/project/scanbook-27440/firestore/rules)
2. Vérifier que les rules contiennent :
   ```
   // TODO: À terme, utiliser Custom Claims au lieu de UID hardcodé
   // request.auth.token.admin == true
   ```

### Action
**Pour l'instant** : Aucune action requise (UID temporaire dans `.env`)
**Plus tard** : Implémenter Custom Claims (voir `docs/firebase-admin-setup.md`)

---

## 3. Activer les Cloud Functions (Phases D4 & E - Optionnel)

### Pourquoi ?
Pour le nettoyage automatique des données (notifications > 90 jours, comptes inactifs).

### Comment ?

#### Option 1 : Firebase Blaze Plan (Recommended)
1. Passer au plan Blaze (pay-as-you-go)
2. Créer un projet Node.js dans `functions/`
3. Déployer les fonctions :

```bash
npm install -g firebase-tools
firebase init functions
# Sélectionner TypeScript
# Copier le code des functions depuis docs/data-retention-policy.md

firebase deploy --only functions
```

#### Option 2 : Firestore TTL (Alternative)
Firestore propose maintenant des **TTL (Time-To-Live)** natifs :
1. Aller dans [Firestore > Data](https://console.firebase.google.com/project/scanbook-27440/firestore/data)
2. Cliquer sur une collection (`notification_history`)
3. Activer **TTL policy** avec `sentAt` + 90 jours

---

## 4. Configurer Firebase Hosting (Phase A5 - Headers)

### Pourquoi ?
Les headers de sécurité (CSP, Permissions-Policy) doivent être configurés.

### Comment ?

#### Si déploiement sur **Firebase Hosting** :
1. Créer `firebase.json` à la racine :

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://covers.openlibrary.org;"
          },
          {
            "key": "Permissions-Policy",
            "value": "camera=(self), geolocation=(), microphone=()"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          }
        ]
      }
    ]
  }
}
```

2. Déployer :
```bash
npm run build
firebase deploy --only hosting
```

#### Si déploiement sur **Netlify** :
- Fichier `netlify.toml` déjà créé ✅
- Aucune action requise

#### Si déploiement sur **Vercel** :
- Fichier `vercel.json` déjà créé ✅
- Aucune action requise

---

## 5. Créer collection `user_consents` (Phase D3)

### Pourquoi ?
Pour le registre RGPD des consentements.

### Comment ?
1. Ouvrir [Firestore > Data](https://console.firebase.google.com/project/scanbook-27440/firestore/data)
2. Créer une nouvelle collection : `user_consents`
3. Ajouter un document test (sera automatiquement créé par l'app) :
   ```json
   {
     "userId": "test_user_id",
     "consentType": "analytics",
     "granted": false,
     "timestamp": "2025-10-04T12:00:00.000Z",
     "version": "1.0.0",
     "source": "initial"
   }
   ```
4. Supprimer le document test (l'app créera les vrais documents)

**Note** : Les Firestore Rules autorisent déjà cette collection (write si `request.auth.uid == userId`).

---

## 6. Vérifier les quotas Firebase (Phase E - Performance)

### Pourquoi ?
S'assurer que les quotas Firestore/Storage ne sont pas atteints.

### Comment ?
1. Ouvrir [Firebase Console > Usage](https://console.firebase.google.com/project/scanbook-27440/usage)
2. Vérifier :
   - **Firestore** : Reads, Writes, Deletes
   - **Storage** : Stockage total, Downloads
   - **Cloud Messaging** : Messages envoyés
3. Si proche des limites (gratuit) : passer au plan Blaze

---

## 7. Configurer Analytics (Phase D3 - RGPD)

### Pourquoi ?
Si analytics activé, doit respecter le consentement utilisateur.

### Comment ?
1. Ouvrir [Firebase Console > Analytics](https://console.firebase.google.com/project/scanbook-27440/analytics)
2. **Désactiver la collecte automatique** :
   - Settings > Data Collection > "**Automatically collect usage data**" → OFF
3. Dans le code, activer analytics uniquement si consentement :

```typescript
import { hasConsent } from './services/consentManager';

if (hasConsent('analytics')) {
  // Activer Firebase Analytics
}
```

---

## 8. Tester les notifications push (Phase B)

### Pourquoi ?
Vérifier que les notifications fonctionnent avec le nouveau Service Worker unifié.

### Comment ?
1. Créer une annonce test dans l'interface admin
2. Vérifier dans [Cloud Messaging > Composer](https://console.firebase.google.com/project/scanbook-27440/notification/compose) que le message est bien envoyé
3. Vérifier dans Firestore > `notification_history` que les entrées sont créées
4. Vérifier les stats dans l'interface (Phase B3)

---

## Résumé des actions prioritaires

| Action | Priorité | Temps estimé | Status |
|--------|----------|--------------|--------|
| 1. Déployer index composite Firestore | 🔴 Haute | 5 min | ⏳ À faire |
| 2. Vérifier Firestore Rules | 🟡 Moyenne | 2 min | ⏳ À vérifier |
| 3. Configurer Headers (Hosting) | 🟡 Moyenne | 10 min | ⏳ Selon hébergement |
| 4. Créer collection user_consents | 🟢 Basse | 2 min | ⏳ Auto si utilisé |
| 5. Vérifier quotas | 🟢 Basse | 3 min | ⏳ Monitoring |
| 6. Configurer Analytics RGPD | 🟡 Moyenne | 5 min | ⏳ Si analytics activé |
| 7. Cloud Functions cleanup | 🟢 Basse | 30 min | ⏳ Optionnel |
| 8. Tester notifications | 🟡 Moyenne | 10 min | ⏳ Tests |

---

## Ressources utiles

- [Firebase Console](https://console.firebase.google.com/project/scanbook-27440)
- [Firebase CLI Docs](https://firebase.google.com/docs/cli)
- [Firestore Indexes Guide](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Cloud Functions Quickstart](https://firebase.google.com/docs/functions/get-started)
- [RGPD Firebase Compliance](https://firebase.google.com/support/privacy)

**Date de création** : 2025-10-04
**Auteur** : Claude Code (Backlog Phase A-E)
