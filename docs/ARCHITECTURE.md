# Architecture de Kodeks

## Vue d’ensemble

Le navigateur héberge l’interface React, l’authentification Firebase et les
lectures/écritures privées autorisées par les règles. Les opérations globales
ou destructrices passent par Cloud Functions.

```text
React PWA
  ├─ Firebase Auth ── jeton + Custom Claims
  ├─ Firestore ───── données privées sous users/{uid}
  ├─ Storage ─────── couvertures sous covers/{uid}
  ├─ Google Books / OpenLibrary ── métadonnées publiques
  └─ Callable Functions
       ├─ suppression complète du compte
       ├─ envoi et relance FCM
       ├─ nettoyage d’historique
       └─ traitement des notifications planifiées
```

## Frontières de confiance

- le client est considéré comme non fiable ;
- le claim `admin` signé dans le jeton Auth est la seule source d’autorité
  administrative ;
- les documents `users/{uid}` sont privés mais ne peuvent accorder aucun droit ;
- les historiques de livraison sont écrits uniquement par le backend ;
- les consentements sont créés par leur propriétaire puis immuables.

## Organisation du frontend

- `components/` : interface et dialogues réutilisables ;
- `hooks/` : état transversal et comportements React ;
- `services/` : Firebase et opérations distantes ;
- `utils/` : fonctions métier pures, notamment classement et déduplication ;
- `types/` : contrats de données ;
- `sw.ts` : cache PWA et réception des notifications en arrière-plan.

`App.tsx` contient encore plusieurs cas d’usage historiques. Toute nouvelle
fonction importante doit être extraite plutôt que d’agrandir ce composant.

## Données principales

- `users/{uid}/collection/{bookId}` ;
- `users/{uid}/libraries/{libraryId}` ;
- `user_profiles/{uid}` pour l’administration en lecture ;
- `user_consents/{id}` ;
- `announcements/{id}` ;
- `notification_history/{id}` ;
- `scheduled_notifications/{id}` ;
- Storage `covers/{uid}/{fileName}`.

## Déploiement

Vercel est la cible frontend de référence. Firebase CLI déploie séparément les
règles, index, Storage et Functions. Une livraison n’est complète que lorsque
ces deux plans sont alignés et que la CI passe.
