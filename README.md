# Kodeks

Kodeks est une PWA React permettant de rechercher, scanner et organiser une
bibliothèque personnelle. Les comptes, collections et couvertures sont stockés
dans Firebase ; les métadonnées de livres viennent de Google Books et
OpenLibrary.

## Fonctionnalités

- recherche textuelle et ISBN avec classement et déduplication des éditions ;
- scan unitaire ou en lot, avec saisie ISBN de secours ;
- ajout et édition manuels, couvertures personnalisées et statuts de lecture ;
- bibliothèques personnalisées, filtres et exports CSV/PDF ;
- authentification email ou Google ;
- PWA installable, cache applicatif et consultation Firestore hors ligne ;
- annonces et notifications FCM administrées par des Cloud Functions.

## Stack

- React 19, TypeScript strict, Vite 7 et Tailwind CSS 4 ;
- Firebase Auth, Firestore, Storage, Messaging et Cloud Functions ;
- Vitest, Testing Library et Firebase Emulator Suite ;
- déploiement frontend de référence : Vercel.

## Installation

Prérequis : Node.js 22, npm, Java 21 pour les émulateurs Firebase et un projet
Firebase.

```bash
npm ci
copy .env.example .env
```

Renseigner les variables de `.env`. Ce fichier est local et ne doit jamais être
commité. Le build échoue volontairement si la configuration Firebase requise
est incomplète.

Installer ensuite les dépendances serveur :

```bash
cd functions
npm ci
cd ..
```

## Commandes

```bash
npm run dev          # serveur local, à lancer explicitement
npm run lint         # ESLint
npm run typecheck    # TypeScript sans émission
npm test             # tests unitaires et composants
npm run test:rules   # règles Firestore et Storage avec émulateurs
npm run build        # build de production et service worker
npm run build:analyze
```

## Firebase et déploiement

Le frontend seul ne suffit pas. Déployer ensemble les règles, index et fonctions :

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

Les fonctions utilisent Node.js 22. La programmation de notifications nécessite
un projet Firebase compatible avec les fonctions planifiées. Les droits
administrateur sont des Custom Claims Firebase Auth et ne sont jamais lus dans
un document modifiable par l’utilisateur. Voir
[`docs/firebase-admin-setup.md`](docs/firebase-admin-setup.md).

## Sécurité et confidentialité

- les règles versionnées sont refusées par défaut ;
- les données privées sont limitées à leur propriétaire ;
- les opérations privilégiées et la suppression complète du compte sont côté serveur ;
- Vercel Analytics n’est chargé qu’après consentement ;
- les appels Google Books/OpenLibrary partent du navigateur et exposent les
  informations techniques habituelles d’une requête web à ces fournisseurs.

Consulter [`SECURITY.md`](SECURITY.md), la politique affichée dans l’application
et [`docs/data-retention-policy.md`](docs/data-retention-policy.md).

## Architecture et contribution

L’architecture, les frontières de confiance et les décisions de découpage sont
décrites dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Les règles de
contribution et la checklist de validation se trouvent dans
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Limites connues

- la collection est encore chargée intégralement côté client ; une pagination
  Firestore sera nécessaire pour les très grandes bibliothèques ;
- le composant historique `App.tsx` reste volumineux et doit continuer à être
  extrait par cas d’usage ;
- les assertions WCAG AA nécessitent encore une campagne formelle avec lecteurs
  d’écran et tests automatisés étendus.

## Licence

MIT — voir [`LICENSE`](LICENSE).
