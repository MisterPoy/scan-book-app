# Politique technique de conservation des données

Dernière mise à jour : 26 juillet 2026.

Ce document décrit le comportement réellement implémenté. Toute nouvelle durée
automatique doit être livrée côté backend avant d’être annoncée publiquement.

| Donnée | Conservation actuelle | Suppression |
|---|---|---|
| Compte Firebase Auth et profil | Tant que le compte existe | Callable `deleteOwnAccount` |
| Livres et bibliothèques sous `users/{uid}` | Tant que le compte existe ou jusqu’à suppression manuelle | Suppression individuelle ou récursive avec le compte |
| Couvertures `covers/{uid}` | Tant que le compte existe | Préfixe Storage supprimé avec le compte |
| Consentements | Historique du compte | Supprimés avec le compte |
| Jeton FCM | Jusqu’à désactivation ou suppression du compte | Champ effacé à la désactivation, document supprimé avec le compte |
| Historique de notification | 30 jours visés | Nettoyage serveur déclenché depuis l’administration |
| Annonces et programmations | Jusqu’à suppression administrative | Interface administrateur |
| Préférences locales | Jusqu’au nettoyage du navigateur | Action du navigateur |

## Suppression de compte

Une authentification datant de moins de cinq minutes est exigée avant toute
opération. La fonction supprime récursivement le document utilisateur, le
profil, les consentements, l’historique de notification, les couvertures puis le
compte Auth en dernier. Ce dernier ordre permet de réessayer si une dépendance
échoue avant la suppression de l’identité.

Firestore, Storage et Auth ne fournissent pas de transaction distribuée unique.
Les erreurs sont donc journalisées côté Function et doivent être surveillées.

## Sauvegardes des sous-traitants

Les copies de sauvegarde et journaux d’infrastructure de Firebase, Google Cloud
et Vercel suivent les politiques contractuelles de ces fournisseurs. Kodeks ne
doit pas promettre un délai différent sans validation contractuelle.
