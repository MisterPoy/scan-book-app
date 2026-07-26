# Checklist d'accessibilité

État de référence au 26 juillet 2026. Cette liste guide la recette ; elle ne
constitue pas une certification WCAG.

## Déjà intégré

- modales nommées, fermeture au clavier et restauration du focus ;
- retours d'erreur intégrés à la page avec `role="alert"` ;
- résultat de recherche activable au clavier ;
- textes alternatifs ou substituts pour les couvertures ;
- saisie ISBN de secours lorsque la caméra échoue ;
- confirmation explicite et saisie `SUPPRIMER` pour la suppression du compte ;
- états de chargement et boutons désactivés pendant les opérations asynchrones.

## Recette manuelle obligatoire

Tester sur ordinateur et mobile :

1. parcourir toutes les actions avec Tab et Maj+Tab ;
2. activer cartes et boutons avec Entrée ou Espace ;
3. fermer chaque dialogue avec Échap et contrôler le retour du focus ;
4. vérifier le scan, la recherche, l'ajout manuel et la suppression avec NVDA,
   VoiceOver ou TalkBack ;
5. zoomer à 200 % sans perte de contenu ni défilement horizontal imposé ;
6. contrôler les contrastes des états normal, survol, focus, erreur et désactivé ;
7. tester `prefers-reduced-motion` et une navigation sans souris.

## Automatisation à maintenir

- conserver les tests de composants pour les annonces d'erreur ;
- ajouter Axe à chaque nouveau parcours majeur ;
- exécuter Lighthouse sur le build de production et viser au moins 95/100 ;
- ajouter une recette E2E des parcours authentifiés dès qu'un projet Firebase de
  test isolé est disponible.

## Critères de sortie

Une livraison n'est déclarée conforme WCAG AA qu'après absence de défaut
bloquant dans l'analyse automatique et validation manuelle au clavier et avec
au moins un lecteur d'écran. Les dérogations doivent être documentées avec une
correction planifiée.
