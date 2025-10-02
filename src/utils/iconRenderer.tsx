import {
  Book,
  BookOpen,
  Notebook,
  Star,
  Heart,
  Bookmark,
  Target,
  Rocket,
  Diamond,
  Palette,
  Pencil,
  MaskHappy,
  CircleWavy,
  Umbrella,
  Sparkle,
  GameController
} from 'phosphor-react';

/**
 * Convertit un code d'icône (ex: "BK", "FolderOpen") en composant React Phosphor
 * Utilisé pour afficher les icônes de bibliothèques personnalisées
 */
export const renderLibraryIcon = (iconCode: string, size: number = 16): React.ReactElement => {
  const iconMap: { [key: string]: React.ReactElement } = {
    'BK': <Book size={size} weight="regular" />,
    'BO': <BookOpen size={size} weight="regular" />,
    'NB': <Notebook size={size} weight="regular" />,
    'ST': <Star size={size} weight="regular" />,
    'HT': <Heart size={size} weight="regular" />,
    'BM': <Bookmark size={size} weight="regular" />,
    'TG': <Target size={size} weight="regular" />,
    'RK': <Rocket size={size} weight="regular" />,
    'DM': <Diamond size={size} weight="regular" />,
    'PL': <Palette size={size} weight="regular" />,
    'PN': <Pencil size={size} weight="regular" />,
    'MH': <MaskHappy size={size} weight="regular" />,
    'GM': <CircleWavy size={size} weight="regular" />,
    'UM': <Umbrella size={size} weight="regular" />,
    'SP': <Sparkle size={size} weight="regular" />,
    'GC': <GameController size={size} weight="regular" />
  };
  return iconMap[iconCode] || <Book size={size} weight="regular" />;
};
