# Mise en production Firebase

Ce document recense les actions externes qui ne peuvent pas être effectuées par
un simple commit. Le projet cible actuellement `scanbook-27440`.

## 1. Sécuriser la configuration

1. Retirer `.env` du suivi Git et vérifier qu'aucune clé privée ou clé de compte
   de service n'est présente dans l'historique.
2. Si le dépôt a déjà été partagé, renouveler toute valeur considérée comme
   sensible avant le prochain déploiement.
3. Configurer les variables `VITE_FIREBASE_*` dans l'hébergeur du frontend.

Les clés publiques Firebase du frontend ne remplacent pas les règles de
sécurité : `firestore.rules` et `storage.rules` constituent la frontière
d'autorisation effective.

## 2. Attribuer le premier administrateur

Depuis `functions/`, avec des identifiants Firebase Admin valides :

```bash
npm ci
npm run admin:set -- <UID_FIREBASE> true
```

L'utilisateur concerné doit ensuite se déconnecter puis se reconnecter pour
recevoir son nouveau Custom Claim. La procédure détaillée et la révocation sont
décrites dans `docs/firebase-admin-setup.md`.

## 3. Déployer le backend Firebase

Après validation sur le bon projet Firebase :

```bash
firebase use scanbook-27440
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

Cette commande publie :

- les règles Firestore refusées par défaut ;
- les index nécessaires aux historiques et notifications planifiées ;
- les règles Storage limitées aux couvertures du propriétaire ;
- les fonctions de suppression de compte, d'envoi FCM, de relance, de
  nettoyage et de planification.

Les fonctions utilisent Node.js 22 et les tâches planifiées peuvent nécessiter
le plan de facturation Firebase approprié.

## 4. Vérifications après déploiement

- vérifier qu'un utilisateur ordinaire ne voit ni l'administration ni les
  données d'un autre compte ;
- vérifier qu'un administrateur avec Custom Claim voit les écrans attendus ;
- envoyer une notification de test à son propre appareil ;
- programmer une notification à quelques minutes et contrôler son historique ;
- créer puis supprimer un compte de test et confirmer la disparition de son
  profil, de ses sous-collections et de ses couvertures ;
- consulter les journaux Cloud Functions et les quotas Firestore/Storage/FCM.

## 5. Déployer le frontend

Vercel est la cible documentée. Configurer les variables d'environnement, puis
déployer le résultat de `npm run build`. Vérifier ensuite les en-têtes CSP, le
manifeste, l'installation PWA, le mode hors ligne et les routes
`/mentions-legales` et `/confidentialite`.

Ne pas considérer le commit comme un déploiement : ces étapes doivent être
exécutées et vérifiées explicitement dans les consoles Firebase et Vercel.
