# Gestion des utilisateurs et administrateurs

La source d'identité est Firebase Authentication. `user_profiles/{uid}` ne
contient que les informations d'affichage et de suivi utiles à l'application ;
un champ écrit dans Firestore ne peut jamais accorder un privilège.

## Droits administrateur

Les droits reposent exclusivement sur le Custom Claim Firebase Auth `admin`.
Pour accorder le rôle depuis un environnement autorisé :

```bash
cd functions
npm ci
npm run admin:set -- <UID_FIREBASE> true
```

Pour le retirer :

```bash
npm run admin:set -- <UID_FIREBASE> false
```

L'utilisateur doit renouveler son jeton, généralement en se déconnectant puis
en se reconnectant. Ne jamais réintroduire de liste d'UID dans le frontend, dans
les règles ou dans un fichier `.env`.

## Frontières d'accès

- un utilisateur peut lire et modifier ses livres, bibliothèques et préférences ;
- son profil ne peut contenir que les champs autorisés par `firestore.rules` ;
- les consentements sont ajoutés par leur propriétaire et restent traçables ;
- la lecture globale des profils, annonces, statistiques et planifications est
  réservée au Custom Claim `admin` ;
- les envois FCM et la suppression complète d'un compte sont exécutés par des
  Cloud Functions, jamais directement depuis le navigateur.

## Suppression de compte

Le frontend exige une confirmation explicite, puis appelle
`deleteOwnAccount`. La fonction refuse un jeton dont l'authentification date de
plus de cinq minutes et supprime les données Firestore, les couvertures Storage
et enfin le compte Auth. En cas de refus `requires-recent-login`, l'utilisateur
doit se reconnecter avant de recommencer.

## Validation

Avant un déploiement :

```bash
npm run test:rules
npm run lint
npm run typecheck
npm test
npm run build
```

Créer ensuite deux comptes de test, dont un seul possède le Custom Claim, et
vérifier que les interfaces et opérations d'administration sont inaccessibles à
l'autre compte. Voir également `docs/firebase-admin-setup.md` et
`docs/ACTIONS_FIREBASE_CONSOLE.md`.
