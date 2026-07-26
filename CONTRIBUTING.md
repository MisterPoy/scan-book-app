# Contribuer à Kodeks

## Préparer une modification

1. Installer avec `npm ci` et `npm ci` dans `functions/`.
2. Copier `.env.example` vers `.env` sans ajouter ce dernier à Git.
3. Créer une branche courte et centrée sur un seul objectif.
4. Préserver les changements locaux sans rapport avec le ticket.

## Qualité attendue

- TypeScript strict, fonctions courtes et responsabilités explicites ;
- pas d’accès privilégié décidé par le frontend ;
- erreurs intégrées à l’interface, sans `alert()` ou `confirm()` natif ;
- navigation clavier, labels accessibles et focus restauré pour les dialogues ;
- tests unitaires pour le métier et tests d’émulateur pour les règles ;
- mise à jour de `JOURNAL.md` avec problème, solution, fichiers et suite.

Avant une pull request :

```bash
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
node --check functions/index.js
```

Le serveur de développement et les déploiements Firebase ne doivent pas être
lancés implicitement depuis un script de validation.
