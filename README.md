# Kodeks

Kodeks est une PWA React de recherche, scan et organisation d'une bibliothèque
personnelle. Cette édition fonctionne avec le forfait Firebase Spark, sans
Cloud Functions ni Cloud Storage.

## Fonctionnalités

- recherche texte et ISBN avec classement et déduplication ;
- scan unitaire ou en lot, avec saisie ISBN de secours ;
- ajout et édition manuels, statuts de lecture, tags et bibliothèques ;
- couvertures personnalisées compressées dans le navigateur puis synchronisées
  avec le document Firestore du livre ;
- exports CSV et PDF ;
- authentification Email/Mot de passe ou Google ;
- annonces affichées directement dans l'application ;
- PWA installable et persistance Firestore hors ligne.

## Stack et coût

- React 19, TypeScript strict, Vite 7 et Tailwind CSS 4 ;
- Firebase Authentication et Cloud Firestore sur le forfait Spark ;
- Vercel pour le frontend ;
- Vitest, Testing Library et émulateur Firestore.

Kodeks n'utilise ni Cloud Functions, ni Cloud Storage, ni notification push
serveur. Il reste soumis aux quotas gratuits de Firestore et de Vercel.

## Installation

Prérequis : Node.js 22, npm, Java 21 pour les tests de règles et un projet
Firebase Spark.

```bash
npm ci
copy .env.example .env
```

Renseigner les cinq variables Firebase obligatoires. `.env` reste local et ne
doit jamais être commité.

## Commandes

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
npm run build:analyze
```

## Déploiement Firebase Spark

Seuls les règles et index Firestore sont à déployer :

```bash
npx firebase login
npx firebase deploy --project scanbook-27440 --only firestore:rules,firestore:indexes
```

Ne pas ajouter `storage` ou `functions` à cette commande. La configuration
manuelle est détaillée dans `docs/ACTIONS_FIREBASE_CONSOLE.md`.

## Administration

Le claim Firebase Auth signé `admin: true` protège les annonces et la liste des
utilisateurs. L'outil local dans `admin-tools/` attribue ce claim sans déployer
de service payant. Voir `docs/firebase-admin-setup.md`.

## Confidentialité

- les données privées sont isolées par propriétaire dans les règles Firestore ;
- les couvertures personnalisées sont compressées avant synchronisation ;
- la suppression de compte efface les collections connues, le profil, les
  consentements, les anciens historiques puis le compte Auth ;
- Vercel Analytics n'est chargé qu'après consentement ;
- Google Books et OpenLibrary reçoivent les informations techniques normales
  des requêtes effectuées par le navigateur.

## Limites connues

- les images personnalisées augmentent la taille des documents Firestore ; leur
  taille encodée est plafonnée avant écriture ;
- la collection est encore chargée intégralement côté client ;
- `App.tsx` reste volumineux et doit continuer à être découpé ;
- les notifications push et programmées ne sont pas disponibles sur cette
  édition Spark ; les annonces restent visibles dans l'application ;
- la conformité WCAG AA nécessite toujours une recette manuelle formelle.

## Licence

MIT — voir `LICENSE`.
