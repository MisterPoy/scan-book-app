export interface UserLibrary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  color?: string; // Couleur pour la visualisation (hex)
  icon?: string; // Emoji pour personnaliser
}