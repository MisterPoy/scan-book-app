# Mise en ligne gratuite avec Firebase Spark

Projet cible : `scanbook-27440`. Ne pas activer Blaze et ne pas associer de
compte de facturation.

## 1. Firebase Authentication

Dans Authentication → Méthode de connexion :

- activer Adresse e-mail/Mot de passe ;
- activer Google et renseigner l'adresse de support ;
- ne pas activer Identity Platform ou le MFA pour cette livraison.

Dans Authentication → Paramètres → Domaines autorisés, ajouter le domaine
Vercel de production puis le domaine personnalisé éventuel.

## 2. Firestore

Vérifier que la base existe et que les données sont visibles. Déployer depuis la
racine :

```bash
npx firebase login
npx firebase deploy --project scanbook-27440 --only firestore:rules,firestore:indexes
```

Attendre que les trois index passent à l'état activé. Ne pas ajouter `storage`
ou `functions` à la commande.

## 3. Premier administrateur

Copier l'UID dans Authentication → Utilisateurs. Configurer les Application
Default Credentials, puis :

```bash
cd admin-tools
npm ci
npm run admin:set -- UID true
```

Déconnecter puis reconnecter le compte. Ne jamais créer un champ Firestore
`isAdmin` pour accorder des droits.

## 4. Vercel

Renseigner en Production :

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Déployer la branche `main`, puis ajouter le domaine obtenu aux domaines
autorisés Firebase Auth.

## 5. Recette

- inscription, connexion Email et Google, déconnexion et mot de passe oublié ;
- recherche, scan, ajout manuel et couvertures personnalisées ;
- synchronisation de la couverture sur un second navigateur ;
- bibliothèques, filtres et exports ;
- annonce intégrée avec un compte administrateur ;
- suppression d'un compte de test ;
- contrôle des quotas Firestore dans Firebase Console.

## Services volontairement absents

- Firebase Storage ;
- Cloud Functions ;
- Cloud Scheduler ;
- notifications push serveur.

Les annonces internes, les couvertures synchronisées et la suppression de compte
restent disponibles grâce à Firestore et Authentication.
