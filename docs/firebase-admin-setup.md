# Attribuer les droits administrateur

Kodeks utilise exclusivement le Custom Claim Firebase Auth `admin: true`. Aucun
UID, email ou champ Firestore ne confère de privilège.

## Prérequis

- dépendances installées dans `functions/` ;
- identifiants Google Application Default Credentials configurés localement,
  ou variable `GOOGLE_APPLICATION_CREDENTIALS` pointant vers un compte de
  service conservé hors du dépôt ;
- UID Firebase Auth exact de la personne concernée.

## Accorder ou retirer le droit

Depuis `functions/` :

```bash
npm run admin:set -- UID true
npm run admin:set -- UID false
```

Le script conserve les autres claims existants. L’utilisateur doit ensuite se
déconnecter/reconnecter afin de recevoir un nouveau jeton.

## Vérification

1. vérifier le claim dans Firebase Auth ou avec Admin SDK ;
2. renouveler la session ;
3. confirmer que le menu admin apparaît ;
4. exécuter `npm run test:rules` pour vérifier qu’un utilisateur sans claim ne
   peut toujours pas écrire une annonce, même s’il place `isAdmin: true` dans
   son document privé.

Ne jamais transformer ce script en endpoint public de bootstrap.
