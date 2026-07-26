# Gestion des utilisateurs — édition Spark

Firebase Authentication est la source d'identité. `user_profiles/{uid}` ne
contient que les informations d'affichage autorisées par les règles.

## Administration

Le Custom Claim signé `admin` protège la lecture globale des profils et la
gestion des annonces. Utiliser l'outil local documenté dans
`docs/firebase-admin-setup.md`; un champ Firestore ne confère jamais de droit.

## Accès

- chaque utilisateur contrôle ses livres et bibliothèques ;
- chaque utilisateur peut effacer son profil et ses consentements lors de la
  suppression du compte ;
- seuls les administrateurs peuvent gérer les annonces intégrées ;
- aucun historique de notification ou planification n'est créé.

## Suppression du compte

Le client exige la saisie de `SUPPRIMER` et une authentification récente. Il
efface par lots les livres, bibliothèques, consentements et anciens historiques,
puis le profil et enfin l'identité Firebase Auth.

## Validation

```bash
npm run test:rules
npm run lint
npm run typecheck
npm test
npm run build
```
