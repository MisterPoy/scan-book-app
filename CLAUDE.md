# Instructions pour Claude Code

## Règles Obligatoires à Suivre

### Journal de Développement
- **OBLIGATOIRE** : Toujours mettre à jour `JOURNAL.md` après chaque modification
- **Objectif** : Permettre à un autre Claude Code de reprendre le projet facilement
- **Format** : Documenter le problème, la solution, les fichiers modifiés, et prochaines étapes

### Structure du Projet
- **Type** : Application React + TypeScript + Vite + PWA
- **Base de données** : Firebase Firestore
- **Authentification** : Firebase Auth
- **Stockage** : Firebase Storage (pour images)
- **Styling** : TailwindCSS

### Backlog de Référence
- **Document** : `PromptBacklogModif.pdf` contient toutes les tâches prioritaires
- **Phases** :
  1. **Critique** (T1-T4) : PWA, sécurité, images
  2. **UX/Perf** (T5-T10) : cache, lazy loading, accessibilité
  3. **Identité** (T11) : remplacement émojis → Phosphor Icons
  4. **Documentation** (T12) : README complet

### Commandes Importantes
- Build : `npm run build`
- Dev : `npm run dev` (DEMANDER AVANT de lancer !)
- Lint : `npm run lint`
- Type check : `npm run typecheck`

### Fichiers Critiques
- `src/firebase.ts` : Configuration Firebase + fonctions utilitaires
- `vite.config.ts` : Configuration PWA + build
- `firestore.rules` : Règles de sécurité Firestore (déployer dans console)
- `JOURNAL.md` : Journal de développement (TOUJOURS mettre à jour)

### ⚠️ Contraintes
- **COMMITS** :
  - JAMAIS commiter sans demande explicite
  - Commiter AVANT chaque grand changement pour sauvegarder l'état stable
  - JAMAIS mentionner "Claude Code" dans les messages de commit ou l'historique git
  - Utiliser des messages de commit professionnels et descriptifs
- **DÉVELOPPEMENT** :
  - TOUJOURS documenter dans JOURNAL.md après chaque modification
  - DEMANDER avant de lancer le serveur dev (`npm run dev`)
  - Pratiquer le clean code (code propre, lisible, maintenable)
  - Vérifier lint/typecheck après modifications importantes