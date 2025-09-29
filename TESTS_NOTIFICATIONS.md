# Guide de Tests - Notifications Push

## Vue d'ensemble

Ce guide détaille comment tester le système de notifications push de ScanBook sur différents appareils et navigateurs pour assurer une compatibilité maximale.

## Tests automatisés intégrés

L'application inclut un panneau de test accessible via :
1. **Paramètres** → **Notifications** → **Tests avancés**
2. Tests automatiques lors du chargement de la page
3. Tests manuels pour notifications locales et push

## Plan de tests par plateforme

### 🖥️ Desktop

#### Windows
- [ ] **Chrome** (v100+)
  - [ ] Notifications avec app ouverte
  - [ ] Notifications avec app en arrière-plan
  - [ ] Notifications avec app fermée
  - [ ] Test avec Bluetooth activé/désactivé

- [ ] **Firefox** (v100+)
  - [ ] Mêmes tests que Chrome
  - [ ] Vérifier compatibilité service worker

- [ ] **Edge** (v100+)
  - [ ] Tests notifications push
  - [ ] Vérifier intégration système Windows

#### macOS
- [ ] **Chrome** (dernière version)
  - [ ] Notifications système macOS
  - [ ] Intégration Centre de notifications

- [ ] **Safari** (v15+)
  - [ ] Notifications push (limitées)
  - [ ] Tests permissions système

- [ ] **Firefox** (dernière version)
  - [ ] Compatibilité notifications macOS

#### Linux
- [ ] **Chrome/Chromium**
  - [ ] Notifications système Linux
  - [ ] Tests avec différents environnements de bureau

- [ ] **Firefox**
  - [ ] Intégration notifications Linux

### 📱 Mobile

#### Android
- [ ] **Chrome Mobile** (v100+)
  - [ ] Notifications push avec app fermée
  - [ ] Notifications avec économie de batterie
  - [ ] Test avec WiFi uniquement
  - [ ] Test avec données mobiles
  - [ ] Test passage WiFi → Données

- [ ] **Firefox Mobile**
  - [ ] Support notifications (limité)
  - [ ] Tests basiques

- [ ] **Samsung Internet**
  - [ ] Compatibilité service worker
  - [ ] Tests notifications

#### iOS
- [ ] **Safari Mobile** (iOS 16.4+)
  - [ ] Notifications push (support récent)
  - [ ] Test installation PWA
  - [ ] Notifications depuis PWA installée

- [ ] **Chrome iOS** (utilise WebKit)
  - [ ] Limitations notifications
  - [ ] Tests de base

## Scénarios de test spécifiques

### 1. Tests de permissions
```
✅ Première visite → Permission refusée → Réactiver
✅ Permission accordée → Test notification
✅ Permission révoquée depuis navigateur → Gestion erreur
✅ Rechargement page → Persistence permissions
```

### 2. Tests de connectivité
```
✅ WiFi stable → Notification reçue
✅ Perte réseau → Reconnexion → Notification en attente
✅ Passage WiFi → 4G → Continuité service
✅ Mode avion → Désactivation → Récupération notifications
```

### 3. Tests d'états de l'application
```
✅ App ouverte et active → Notification premier plan
✅ App en arrière-plan → Notification arrière-plan
✅ App fermée → Service worker → Notification système
✅ Onglet fermé, autres onglets ouverts → Notification
```

### 4. Tests de persistance
```
✅ Création annonce → Notification envoyée
✅ Même annonce → Pas de doublon
✅ Redémarrage navigateur → Token FCM maintenu
✅ Déconnexion/Reconnexion → Réactivation automatique
```

## Checklist de validation

### ✅ Tests techniques
- [ ] Service Worker correctement enregistré
- [ ] Token FCM généré et stocké
- [ ] Permissions accordées et persistantes
- [ ] HTTPS/Localhost fonctionnel
- [ ] Firebase Messaging configuré

### ✅ Tests utilisateur
- [ ] Interface notifications claire
- [ ] Boutons activation/désactivation fonctionnels
- [ ] Messages d'erreur compréhensibles
- [ ] Tests de notification intuitifs
- [ ] Statistiques d'envoi accessibles

### ✅ Tests de robustesse
- [ ] Gestion erreurs réseau
- [ ] Récupération après déconnexion
- [ ] Performance avec nombreux utilisateurs
- [ ] Nettoyage historique automatique

## Procédure de test multi-appareils

### Phase 1: Configuration
1. Déployer l'application sur serveur HTTPS
2. Configurer Firebase avec clés VAPID correctes
3. Tester sur un navigateur de référence (Chrome Desktop)

### Phase 2: Tests croisés
1. **Tester chaque plateforme** avec la checklist ci-dessus
2. **Documenter les limitations** par navigateur/OS
3. **Noter les temps de réponse** des notifications
4. **Vérifier la cohérence** des messages entre appareils

### Phase 3: Tests d'intégration
1. **Créer une annonce** depuis un appareil admin
2. **Vérifier réception** sur tous les appareils testés
3. **Contrôler statistiques** dans le panneau admin
4. **Tester déconnexion/reconnexion** sur différents appareils

## Outils de debug

### Console développeur
```javascript
// Vérifier token FCM
console.log('FCM Token:', localStorage.getItem('fcm-token'));

// Vérifier Service Worker
navigator.serviceWorker.ready.then(reg => console.log('SW:', reg));

// Tester notification locale
new Notification('Test', { body: 'Debug notification' });
```

### Firebase Console
- Vérifier statistiques d'envoi
- Tester envoi manuel de notifications
- Analyser logs d'erreurs

### Panneau intégré
- Utiliser "Tests avancés" dans l'application
- Copier informations technique pour debug
- Suivre résultats de tests en temps réel

## Problèmes courants et solutions

### 🔴 Notifications non reçues
1. Vérifier permissions navigateur
2. Contrôler HTTPS/certificat SSL
3. Valider token FCM en Firestore
4. Tester Service Worker manuellement

### 🔴 Doublons de notifications
1. Vérifier historique des envois
2. Contrôler logique de déduplication
3. Nettoyer données test anciennes

### 🔴 Performance lente
1. Optimiser requêtes Firestore
2. Limiter nombre de notifications simultanées
3. Implémenter mise en cache tokens

## Critères de validation finale

✅ **95%+ des navigateurs supportés** reçoivent les notifications
✅ **0 doublon** dans les tests de persistance
✅ **< 5 secondes** délai moyen de réception
✅ **Interface intuitive** pour tous types d'utilisateurs
✅ **Statistiques précises** dans le panneau admin

---

**Note**: Ce système respecte les standards Web Push et fonctionne sans serveur personnalisé grâce à Firebase Cloud Messaging. Les limitations iOS nécessitent iOS 16.4+ et l'installation de la PWA.