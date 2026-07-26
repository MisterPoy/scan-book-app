# Attribuer les droits administrateur sur Spark

Le rôle repose uniquement sur le Custom Claim Firebase Auth `admin: true`. Cet
outil local ne déploie aucun service et n'exige pas Blaze.

## Prérequis

- UID du compte depuis Firebase Authentication → Utilisateurs ;
- Google Cloud CLI installé ;
- droit suffisant sur le projet `scanbook-27440`.

## Authentification locale

```bash
gcloud auth application-default login
gcloud config set project scanbook-27440
```

## Accorder ou retirer le rôle

```bash
cd admin-tools
npm ci
npm run admin:set -- UID true
npm run admin:set -- UID false
```

Le script conserve les autres claims. L'utilisateur doit ensuite se déconnecter
et se reconnecter. Ne jamais commiter une clé de compte de service et ne jamais
transformer cet outil en endpoint public.
