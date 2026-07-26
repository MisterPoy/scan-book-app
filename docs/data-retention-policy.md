# Politique technique de conservation des données

Dernière mise à jour : 26 juillet 2026.

| Donnée | Conservation | Suppression |
|---|---|---|
| Compte Firebase Auth | Tant que le compte existe | Depuis les paramètres après authentification récente |
| Livres, couvertures et bibliothèques | Tant que le compte existe ou jusqu'à suppression manuelle | Document individuel ou suppression du compte |
| Profil | Tant que le compte existe | Suppression du compte |
| Consentements | Historique du compte | Suppression du compte par le propriétaire |
| Annonces | Jusqu'à suppression administrative | Interface d'administration |
| Anciens historiques de notification | Données héritées, plus alimentées | Suppression du compte par le propriétaire |
| Préférences locales | Jusqu'au nettoyage du navigateur | Action du navigateur |

## Suppression du compte

Kodeks vérifie que l'authentification date de moins de cinq minutes, lit les
documents connus appartenant à l'utilisateur, les efface par lots, supprime le
profil puis le compte Firebase Auth. Une erreur avant la dernière étape laisse
le compte disponible afin que l'opération puisse être reprise.

Firestore et Authentication ne fournissent pas de transaction distribuée. Si
une suppression est interrompue, l'utilisateur peut se reconnecter et relancer
la procédure ; les suppressions déjà réalisées sont idempotentes.

## Sauvegardes des fournisseurs

Les copies techniques de Firebase et Vercel suivent les politiques de rotation
de ces fournisseurs. Kodeks ne promet pas un délai plus court sans engagement
contractuel correspondant.
