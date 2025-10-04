# Checklist Accessibilité - Kodeks

## État actuel (post D1-D2)

### ✅ Modales - Focus Trap (D1)
- [x] `EditBookModal.tsx` - Focus trap + aria-modal + aria-labelledby
- [x] `AnnouncementModal.tsx` - Focus trap + aria-modal + aria-labelledby
- [x] `BulkAddConfirmModal.tsx` - Focus trap + aria-modal + aria-labelledby
- [x] Hook `useFocusTrap` - Gestion Tab/Shift+Tab cyclique + Escape + restauration focus

### ✅ Aria-labels existants
- [x] Boutons fermeture modales (`aria-label="Fermer"`)
- [x] Bouton flash scanner (`aria-label="Activer/Désactiver le flash"`)
- [x] Pile livres scannés (`aria-label="Pile de livres scannés"`)
- [x] Feedbacks scan (`role="alert" aria-live="assertive"`)

### 📝 Aria-labels recommandés (à ajouter si nécessaire)

#### Navigation principale
```tsx
// Header.tsx
<nav aria-label="Navigation principale">
  <button aria-label="Menu principal">
  <Link aria-label="Accueil - Kodeks">
```

#### Boutons d'action
```tsx
// Boutons sans texte visible
<button aria-label="Supprimer le livre">
  <Trash size={20} />
</button>

<button aria-label="Modifier le livre">
  <PencilSimple size={20} />
</button>

<button aria-label="Ajouter à la bibliothèque">
  <Plus size={20} />
</button>
```

#### Formulaires
```tsx
// Inputs critiques
<input
  type="text"
  aria-label="Rechercher un livre par titre, auteur ou ISBN"
  aria-describedby="search-help"
/>
<p id="search-help" className="sr-only">
  Entrez au moins 3 caractères pour lancer la recherche
</p>
```

#### Listes
```tsx
// Collections de livres
<ul role="list" aria-label="Ma bibliothèque">
  <li>...</li>
</ul>
```

### ⚠️ Points d'attention WCAG 2.1

#### Niveau A (Obligatoire)
- [x] 1.1.1 - Contenu non textuel : Icônes + aria-label
- [x] 2.1.1 - Clavier : Focus trap modales
- [x] 2.1.2 - Pas de piège clavier : Escape fonctionne
- [x] 4.1.2 - Nom, rôle, valeur : role="dialog" + aria-modal

#### Niveau AA (Recommandé)
- [x] 1.4.3 - Contraste minimum : Vérifier contrastes (Tailwind par défaut OK)
- [ ] 2.4.3 - Parcours du focus : Ordre logique des tabindex (actuellement automatique)
- [x] 3.3.2 - Étiquettes ou instructions : Labels sur formulaires

#### Niveau AAA (Optionnel)
- [ ] 2.4.8 - Localisation : Fil d'Ariane
- [ ] 3.3.5 - Aide contextuelle : Tooltips sur actions complexes

### 🔍 Tests recommandés

#### Tests manuels
1. **Navigation clavier**
   ```
   Tab → Parcourir tous les éléments focusables
   Shift+Tab → Retour arrière
   Enter/Space → Activer boutons
   Escape → Fermer modales
   ```

2. **Lecteur d'écran** (NVDA/JAWS/VoiceOver)
   ```
   - Vérifier annonces des modales
   - Vérifier labels des boutons
   - Vérifier feedbacks alerts
   ```

3. **Zoom texte 200%**
   ```
   - Pas de perte d'information
   - Pas de défilement horizontal
   ```

#### Tests automatisés
```bash
# Axe DevTools (extension Chrome/Firefox)
# Lighthouse Accessibility Score
npm run build
npx serve -s dist
# → Ouvrir Chrome DevTools → Lighthouse → Accessibility
```

### 📚 Ressources
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Aria Hooks](https://react-spectrum.adobe.com/react-aria/)

### 🎯 Score cible
- **Lighthouse Accessibility**: >= 95/100
- **Conformité WCAG**: AA minimum

---

**Dernière mise à jour** : 2025-10-04 (Phase D - D1-D2 complétés)
