# Politique de sécurité

## Signaler une vulnérabilité

Ne pas ouvrir d’issue publique contenant une preuve d’exploitation ou des
données personnelles. Envoyer le signalement à `gregory.poupaux@hotmail.fr`
avec la version, le scénario, l’impact et une reproduction minimale.

Un accusé de réception est visé sous sept jours. Aucun délai de correction ne
peut être garanti avant qualification, mais les problèmes permettant un accès
croisé aux données ou une élévation de privilèges sont traités en priorité.

## Règles du projet

- aucun secret, compte de service ou fichier `.env` ne doit être commité ;
- les autorisations sont décidées par Firebase Rules et les claims signés,
  jamais par un simple état d’interface ;
- toute évolution des chemins Firestore doit inclure un test de règles ;
- les actions destructrices exigent une confirmation accessible, une
  authentification récente et des règles Firestore restrictives ;
- les dépendances sont vérifiées dans la CI et les alertes de production sont
  traitées avant publication.
