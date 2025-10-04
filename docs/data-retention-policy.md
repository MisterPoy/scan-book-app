# Politique de Rétention des Données - Kodeks

## Conformité RGPD

Cette politique définit les durées de conservation et les processus de suppression des données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).

**Dernière mise à jour** : 04/10/2025
**Version** : 1.0.0

---

## 1. Données utilisateur (Firebase Auth)

### Données collectées
- Email
- UID (identifiant unique Firebase)
- Date de création du compte
- Date dernière connexion

### Durée de rétention
- **Compte actif** : Indéfiniment tant que le compte est utilisé
- **Compte inactif** : 3 ans sans connexion → Email de rappel → Suppression après 90 jours
- **Compte supprimé par l'utilisateur** : Suppression immédiate

### Processus de suppression
```typescript
// Fonction à implémenter dans src/services/dataRetention.ts
async function deleteInactiveAccounts() {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  // 1. Identifier comptes inactifs
  // 2. Envoyer email de rappel
  // 3. Attendre 90 jours
  // 4. Supprimer compte + données associées
}
```

---

## 2. Bibliothèque personnelle (Firestore `user_collections`)

### Données collectées
- ISBN des livres
- Métadonnées personnalisées (statut lecture, notes, tags)
- Images de couverture uploadées
- Date d'ajout

### Durée de rétention
- **Compte actif** : Indéfiniment
- **Compte supprimé** : Suppression immédiate de toutes les entrées

### Processus de suppression
```typescript
// Lors de la suppression du compte
async function deleteUserLibrary(userId: string) {
  // 1. Supprimer toutes les entrées de user_collections où userId = userId
  // 2. Supprimer toutes les images de Firebase Storage dans le dossier users/${userId}/
  // 3. Confirmer suppression complète
}
```

---

## 3. Images de couverture (Firebase Storage)

### Données collectées
- Images uploadées par l'utilisateur
- Métadonnées (taille, type MIME, date upload)

### Durée de rétention
- **Livre dans la bibliothèque** : Indéfiniment
- **Livre supprimé** : Suppression immédiate de l'image
- **Compte supprimé** : Suppression de toutes les images du dossier `users/${userId}/`

### Limites
- **Taille maximale par image** : 5 MB (vérification côté client)
- **Formats acceptés** : JPEG, PNG, WebP
- **Résolution maximale** : 2000x2000 px

---

## 4. Historique des notifications (Firestore `notification_history`)

### Données collectées
- announcementId
- userId
- fcmToken
- sentAt, deliveredAt
- status, errorCode, deviceInfo

### Durée de rétention
- **Notifications récentes** : 90 jours
- **Notifications anciennes** : Suppression automatique au-delà de 90 jours

### Processus de suppression
```typescript
// Fonction cleanupOldNotificationHistory() existante dans src/services/notificationHistory.ts
// À exécuter via un Cloud Function Firebase (Scheduled Function)

// firebase.json
{
  "functions": {
    "source": "functions",
    "predeploy": ["npm --prefix functions run build"]
  }
}

// functions/src/index.ts
export const cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const querySnapshot = await db.collection('notification_history')
      .where('sentAt', '<', ninetyDaysAgo.toISOString())
      .get();

    const batch = db.batch();
    querySnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log(`Supprimé ${querySnapshot.size} notifications anciennes`);
  });
```

---

## 5. Registre des consentements (Firestore `user_consents`)

### Données collectées
- userId
- consentType
- granted (true/false)
- timestamp
- version de la politique
- ipAddress (optionnel)
- userAgent

### Durée de rétention
- **Historique complet** : 3 ans minimum (obligation légale RGPD Art. 7(1))
- **Après suppression compte** : Conservation 3 ans pour preuve de conformité

### Processus de suppression
```typescript
// Les consentements ne sont JAMAIS supprimés avant 3 ans pour conformité légale
// Après 3 ans de suppression du compte:
async function deleteOldConsentRecords() {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  // Supprimer consentements > 3 ans pour comptes supprimés
}
```

---

## 6. Données de navigation (localStorage / indexedDB)

### Données stockées localement
- `kodeks_torch_enabled` : Préférence flash scanner
- `kodeks_user_consents` : Consentements locaux
- `kodeks_consent_banner_state` : État banner cookies

### Durée de rétention
- **Données techniques** : Jusqu'à suppression manuelle par l'utilisateur (Clear browsing data)
- **Pas de transmission serveur** : Données purement locales

---

## 7. Annonces administrateur (Firestore `announcements`)

### Données collectées
- Titre, message, type
- Date création, date expiration
- Auteur (adminId)

### Durée de rétention
- **Annonces actives** : Jusqu'à date d'expiration
- **Annonces expirées** : Conservation 1 an pour archive
- **Annonces > 1 an expirées** : Suppression automatique

### Processus de suppression
```typescript
// Cloud Function Firebase
export const cleanupExpiredAnnouncements = functions.pubsub
  .schedule('every 30 days')
  .onRun(async (context) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const querySnapshot = await db.collection('announcements')
      .where('expiresAt', '<', oneYearAgo.toISOString())
      .get();

    const batch = db.batch();
    querySnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
  });
```

---

## 8. Droits des utilisateurs (RGPD)

### Droit d'accès (Art. 15)
L'utilisateur peut demander une copie de toutes ses données :
```typescript
// Route à implémenter: GET /api/user/data-export
async function exportUserData(userId: string): Promise<UserDataExport> {
  return {
    profile: {...},
    library: [...],
    consents: [...],
    notifications: [...]
  };
}
```

### Droit de rectification (Art. 16)
Modification directe dans l'interface (déjà implémenté via EditBookModal, etc.)

### Droit à l'effacement (Art. 17)
```typescript
// Bouton "Supprimer mon compte" dans les paramètres
async function deleteUserAccount(userId: string) {
  // 1. Supprimer bibliothèque
  // 2. Supprimer images Storage
  // 3. Supprimer notifications
  // 4. Marquer consentements comme "compte supprimé"
  // 5. Supprimer compte Auth Firebase
  // 6. Envoyer email de confirmation
}
```

### Droit à la portabilité (Art. 20)
Export au format JSON via `exportUserData()`

### Droit d'opposition (Art. 21)
Refus des consentements via le gestionnaire de consentements

---

## 9. Sécurité des données

### Mesures techniques
- **Chiffrement en transit** : HTTPS (Firebase Hosting)
- **Chiffrement au repos** : Firebase Firestore (chiffrement automatique)
- **Firestore Rules** : Validation côté serveur
- **Authentification** : Firebase Auth avec email/password

### Mesures organisationnelles
- **Accès limité** : Seul l'administrateur a accès aux données via Console Firebase
- **Logs d'audit** : Firebase audit logs activés
- **Sauvegardes** : Firebase backups automatiques

---

## 10. Transferts de données

### Localisation des données
- **Serveurs Firebase** : europe-west1 (Belgique) - conforme RGPD
- **Pas de transfert hors UE** : Données stockées uniquement dans l'UE

### Sous-traitants
- **Firebase (Google)** : DPA signé (Data Processing Agreement)
- **OpenLibrary API** : Requêtes publiques (pas de données personnelles transmises)

---

## 11. Calendrier de mise en conformité

| Tâche | Priorité | Délai | Status |
|-------|----------|-------|--------|
| Créer types `consent.ts` | Haute | Immédiat | ✅ Fait |
| Créer service `consentManager.ts` | Haute | Immédiat | ✅ Fait |
| Implémenter banner consentement | Haute | 7 jours | ⏳ À faire |
| Créer page "Paramètres Confidentialité" | Haute | 7 jours | ⏳ À faire |
| Créer Cloud Function cleanup notifications | Moyenne | 14 jours | ⏳ À faire |
| Créer Cloud Function cleanup comptes inactifs | Moyenne | 30 jours | ⏳ À faire |
| Créer endpoint export données utilisateur | Moyenne | 30 jours | ⏳ À faire |
| Tests E2E suppression compte | Basse | 45 jours | ⏳ À faire |

---

## 12. Contact DPO (Délégué à la Protection des Données)

**À définir** : Si l'application traite > 250 utilisateurs, nomination d'un DPO recommandée.

**Email de contact** : privacy@kodeks.app (à créer)

---

## Références légales
- [RGPD - Texte officiel](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [CNIL - Guide développeur](https://www.cnil.fr/fr/guide-rgpd-du-developpeur)
- [Firebase GDPR Compliance](https://firebase.google.com/support/privacy)
