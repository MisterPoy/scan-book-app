# Architecture de Kodeks — édition Spark

## Vue d'ensemble

```text
React PWA sur Vercel
  ├─ Firebase Authentication
  ├─ Cloud Firestore
  │    ├─ livres et couvertures compressées
  │    ├─ bibliothèques
  │    ├─ profils et consentements
  │    └─ annonces intégrées
  └─ Google Books / OpenLibrary
```

Il n'existe aucun backend applicatif déployé : toutes les opérations passent par
le SDK Web Firebase et sont bornées par `firestore.rules`.

## Frontières de confiance

- le navigateur est non fiable ; les règles Firestore décident des accès ;
- le claim Firebase Auth `admin` est la seule source d'autorité administrative ;
- un document privé sous `users/{uid}` ne peut pas accorder de droit ;
- les utilisateurs ne peuvent accéder qu'à leur propre arbre de données ;
- la suppression de compte exige un jeton d'authentification récent avant tout
  effacement.

## Données

- `users/{uid}/collection/{bookId}` : livres et éventuelle couverture JPEG
  compressée sous forme de Data URL ;
- `users/{uid}/libraries/{libraryId}` : bibliothèques personnalisées ;
- `user_profiles/{uid}` : profil d'administration ;
- `user_consents/{id}` : registre de consentement ;
- `announcements/{id}` : annonces affichées dans Kodeks ;
- `notification_history/{id}` : données historiques uniquement, supprimables
  par leur propriétaire mais plus alimentées.

## Couvertures

Les fichiers sont validés côté interface, redimensionnés sans agrandissement à
480 pixels maximum et recompressés en JPEG. Une limite encodée protège la limite
de document Firestore. Cette solution conserve la synchronisation entre
appareils sans Firebase Storage, au prix d'une consommation Firestore supérieure.

## Déploiement

Vercel publie le frontend. Firebase CLI ne publie que les règles et index
Firestore. `admin-tools/` est un outil local ponctuel et n'est jamais déployé.
