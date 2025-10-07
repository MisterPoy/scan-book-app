# Kodeks - Gestionnaire de Bibliothèque

Une application web moderne de gestion de bibliothèque personnelle avec scanner ISBN, développée en React + TypeScript et déployable en tant que PWA.

## Fonctionnalités Principales

### Gestion de Collection
- **Scanner ISBN** : Utilisation de la caméra pour scanner les codes-barres des livres
- **Ajout manuel** : Formulaire complet pour ajouter des livres sans ISBN
- **Informations complètes** : Titre, auteur, éditeur, date de publication, description, nombre de pages
- **Couvertures personnalisées** : Upload d'images via Firebase Storage
- **Statuts de lecture** : Lu, Non lu, À lire, En cours, Abandonné
- **Types de livres** : Physique, Numérique, Audio

### Organisation Avancée
- **Bibliothèques personnalisées** : Création et gestion de bibliothèques thématiques
- **Filtres puissants** : Par statut, type, bibliothèque, auteur, éditeur
- **Tags** : Système d'étiquetage libre pour catégoriser les livres
- **Recherche** : Moteur de recherche intégré dans la collection

### PWA & Offline
- **Installation** : Application installable sur mobile et desktop
- **Mode hors ligne** : Consultation de la collection sans connexion
- **Synchronisation** : Données sauvegardées automatiquement dans Firebase
- **Cache intelligent** : Couvertures OpenLibrary mises en cache pour un accès offline

## Installation et Configuration

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn
- Compte Firebase avec Firestore et Storage activés

### 1. Installation
```bash
# Cloner le repository
git clone <url-du-repo>
cd kodeks

# Installer les dépendances
npm install
```

### 2. Configuration Firebase
Créer un fichier `.env` à la racine du projet avec vos clés Firebase :

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Configuration Firestore
Déployer les règles de sécurité dans la console Firebase :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### 4. Lancement
```bash
# Développement
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm run preview
```

## Design System

### Icônes - Phosphor Icons
Le projet utilise exclusivement [Phosphor Icons](https://phosphor-icons.com/) pour maintenir une cohérence visuelle :

- **Style** : `weight="regular"` pour les icônes générales, `weight="bold"` pour les actions importantes
- **Taille** : `size={16}` pour les icônes inline, `size={20-24}` pour les boutons
- **Convention** : Toujours importer depuis `phosphor-react`

```tsx
import { Book, Check, Camera } from "phosphor-react";

// Usage standard
<Book size={16} weight="regular" />
// Action importante
<Check size={16} weight="bold" />
```

### Couleurs et Accessibilité
- **Contrastes** : Respecte les standards WCAG AA
- **Messages d'état** : Tous équipés d'`aria-live="polite"`
- **Navigation** : Support complet du clavier et lecteurs d'écran

## Architecture Technique

### Stack Technologique
- **Frontend** : React 18 + TypeScript + Vite
- **Styling** : TailwindCSS pour un design responsive
- **Base de données** : Firebase Firestore
- **Authentification** : Firebase Auth (Email/Google)
- **Stockage** : Firebase Storage pour les images
- **PWA** : Service Worker avec cache intelligent

### Structure du Projet
```
src/
├── components/          # Composants React réutilisables
│   ├── BookCard.tsx     # Affichage d'un livre
│   ├── EditBookModal.tsx # Modal d'édition
│   ├── ISBNScanner.tsx  # Scanner de codes-barres
│   ├── LibraryManager.tsx # Gestion des bibliothèques
│   └── FiltersPanel.tsx # Panneau de filtres
├── hooks/               # Hooks personnalisés
├── types/               # Types TypeScript
├── firebase.ts          # Configuration Firebase
└── App.tsx             # Composant principal
```

### Performance
- **Lazy Loading** : Scanner ISBN chargé à la demande
- **Error Boundary** : Gestion gracieuse des erreurs
- **Runtime Caching** : Images OpenLibrary mises en cache automatiquement
- **Bundle Optimization** : Code splitting automatique avec Vite

## Utilisation

### Premier lancement
1. **Connexion** : Créer un compte ou se connecter avec Google
2. **Scanner** : Utiliser le bouton "Scanner" pour ajouter un livre
3. **Bibliothèques** : Créer des bibliothèques thématiques
4. **Filtres** : Utiliser les filtres pour organiser sa collection

### Fonctionnalités Avancées
- **Installation PWA** : Utiliser le bouton d'installation pour ajouter l'app à l'écran d'accueil
- **Mode Offline** : L'application fonctionne sans connexion après la première visite
- **Export** : Données exportables au format JSON via la console développeur

## Sécurité & Confidentialité

- **Authentification** : Obligatoire pour accéder aux fonctionnalités
- **Isolation** : Chaque utilisateur ne peut accéder qu'à ses propres données
- **Chiffrement** : Communications sécurisées via HTTPS
- **Variables d'environnement** : Clés sensibles protégées et non commitées

## Déploiement

### Build de Production
```bash
npm run build
```

### Déploiement Recommandé
- **Vercel/Netlify** : Déploiement automatique depuis GitHub
- **Firebase Hosting** : Intégration native avec Firebase
- **Variables d'environnement** : Configurer les clés Firebase dans l'interface de déploiement

## Contribution

### Développement
1. Fork du repository
2. Création d'une branche feature
3. Développement avec respect des conventions de code
4. Tests et vérification du build
5. Pull Request avec description détaillée

### Conventions
- **Commits** : Messages descriptifs en français
- **Code** : TypeScript strict, composants fonctionnels
- **Style** : Prettier + ESLint, conventions React
- **Icônes** : Exclusivement Phosphor Icons

## Changelog

### Version Actuelle
- ✅ PWA complète avec installation et Service Worker
- ✅ Scanner ISBN avec lazy loading
- ✅ Gestion avancée des bibliothèques et filtres
- ✅ Upload d'images vers Firebase Storage
- ✅ Mode offline avec cache intelligent
- ✅ Accessibilité niveau AA
- ✅ Design system cohérent avec Phosphor Icons

## Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**Développé avec passion pour les passionnés de lecture**