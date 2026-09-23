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
  ├─ Google Books / OpenLibrary
  └─ Fonction Vercel /api/admin/shelf-scan
       ├─ vérification du jeton Firebase et du claim admin
       └─ OpenAI Responses API (analyse ponctuelle des photos)
```

Il n'existe pas de backend généraliste : les opérations de collection passent
par le SDK Web Firebase et sont bornées par `firestore.rules`. Une fonction
Vercel étroite existe uniquement pour l'import administrateur par photo, afin
de conserver la clé OpenAI côté serveur et de vérifier le droit administrateur.

## Frontières de confiance

- le navigateur est non fiable ; les règles Firestore décident des accès ;
- le claim Firebase Auth `admin` est la seule source d'autorité administrative ;
- la fonction d'analyse vérifie le jeton Firebase signé et exige ce claim avant
  d'accepter une image ;
- `OPENAI_API_KEY` reste une variable serveur sans préfixe `VITE_` ;
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

## Import d'étagère

Les photos sont redimensionnées et réencodées en JPEG dans le navigateur, ce qui
retire leurs métadonnées EXIF. Elles sont analysées une par une par la fonction
`api/admin/shelf-scan.ts` avec `store: false`. La réponse structurée contient des
titres et auteurs candidats, jamais des ISBN supposés.

Le navigateur rapproche ensuite ces candidats de Google Books et OpenLibrary.
Les correspondances certaines, ambiguës, introuvables et déjà présentes restent
visibles dans un écran de contrôle. Seuls les ISBN explicitement sélectionnés
par l'administrateur rejoignent le flux d'ajout groupé existant. Les photos et
les résultats intermédiaires ne sont pas écrits dans Firestore.

## Déploiement

Vercel publie le frontend et la fonction d'analyse. Firebase CLI ne publie que
les règles et index Firestore. `admin-tools/` est un outil local ponctuel et
n'est jamais déployé. Les variables `FIREBASE_PROJECT_ID`, `OPENAI_API_KEY` et,
facultativement, `OPENAI_VISION_MODEL` sont configurées dans l'environnement
Vercel, jamais dans le dépôt.
