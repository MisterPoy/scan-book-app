import { useEffect, useState, lazy, Suspense, useRef, useMemo, useCallback, type RefObject } from "react";
import {
  Check,
  Circle,
  X,
  Book,
  Books,
  Camera,
  Clock,
  PencilSimple,
  DeviceMobile,
  Headphones,
  ArrowClockwise,
  CaretUp,
  CaretDown,
  Trash,
  Warning,
  FolderOpen,
  CalendarBlank,
  Buildings,
  FileText,
  Tag,
  Door,
  Download,
  MagnifyingGlass,
  ArrowsClockwise,
  Timer,
  Hourglass,
  Megaphone,
  Bell,
  Stack,
  DownloadSimple,
  FilePdf,
  UsersThree,
  CaretDown as CaretDownIcon,
} from "phosphor-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ISBNScanner = lazy(() => import("./components/ISBNScanner"));
import BookCard from "./components/BookCard";
import Login from "./components/login";
import PostScanConfirm from "./components/PostScanConfirm";
import EditBookModal from "./components/EditBookModal";
import FiltersPanel, { type FilterState } from "./components/FiltersPanel";
import LibraryManager from "./components/LibraryManager";
import LibrarySelector from "./components/LibrarySelector";
import AnnouncementManager from "./components/AnnouncementManager";
import AnnouncementDisplay from "./components/AnnouncementDisplay";
import NotificationSettings from "./components/NotificationSettings";
import { UserManagement } from "./components/UserManagement";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import BulkAddConfirmModal from "./components/BulkAddConfirmModal";
import ScrollToTop from "./components/ScrollToTop";
import ModalScrollToTop from "./components/ModalScrollToTop";
import Toast from "./components/Toast";
import Footer from "./components/Footer";
import UnifiedSearchBar from "./components/UnifiedSearchBar";
import { useBookFilters } from "./hooks/useBookFilters";
import { useFocusTrap } from "./hooks/useFocusTrap";
import type { UserLibrary } from "./types/library";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  getRedirectResult,
  deleteUser,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { resizeImage } from "./firebase";
import { syncUserProfile, updateUserProfileStats } from "./services/userProfiles";
import { bulkAddBooks, fetchBookMetadata } from "./utils/bookApi";
import type { BulkAddResponse } from "./types/bulkAdd";
import { renderLibraryIcon } from "./utils/iconRenderer";

interface CollectionBook {
  isbn: string;
  title: string;
  authors: string[];
  addedAt: string;
  updatedAt?: string;
  isRead: boolean;
  customCoverUrl?: string;
  // Nouveaux champs pour l'édition complète
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  isManualEntry?: boolean; // Distinguer les livres manuels des scannés
  // Nouveaux champs pour les filtres (optionnels pour rétrocompatibilité)
  readingStatus?: "lu" | "non_lu" | "a_lire" | "en_cours" | "abandonne";
  bookType?: "physique" | "numerique" | "audio";
  genre?: string;
  tags?: string[];
  // Nouveau champ pour les bibliothèques personnalisées
  libraries?: string[]; // IDs des bibliothèques
  categories?: string[]; // Catégories Google Books
  personalNote?: string; // Note personnelle de l'utilisateur
}

const getIsOnline = () =>
  typeof navigator !== "undefined" ? navigator.onLine : true;

function useModalCloseRequest<T extends HTMLElement>(
  ref: RefObject<T | null>,
  isActive: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!isActive) return;
    const modal = ref.current;
    if (!modal) return;

    const handleCloseRequest = () => onClose();
    modal.addEventListener("modal-close-request", handleCloseRequest);

    return () => {
      modal.removeEventListener("modal-close-request", handleCloseRequest);
    };
  }, [ref, isActive, onClose]);
}

// Composant vue compacte pour la grille
function CompactBookCard({
  book,
  onClick,
  onLongPress,
  isSelected,
  selectionMode,
  userLibraries,
}: {
  book: CollectionBook;
  onClick: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  userLibraries?: UserLibrary[];
}) {
  const [coverSrc, setCoverSrc] = useState("/img/default-cover.png");
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    // Si image personnalisée, l'utiliser en priorité
    if (book.customCoverUrl) {
      setCoverSrc(book.customCoverUrl);
      return;
    }

    const testImage = new Image();
    const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;
    const fallback = "/img/default-cover.png";

    testImage.src = openLibraryUrl;
    testImage.onload = () => {
      if (testImage.width > 1 && testImage.height > 1) {
        setCoverSrc(openLibraryUrl);
      } else {
        setCoverSrc(fallback);
      }
    };
    testImage.onerror = () => setCoverSrc(fallback);
  }, [book.isbn, book.customCoverUrl]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return; // Ignorer clic droit natif
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (onLongPress) {
        onLongPress();
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Empêcher onClick si c'était un long press
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e.preventDefault();
      return;
    }
    onClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onLongPress) {
      onLongPress();
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-pressed={selectionMode ? !!isSelected : undefined}
      aria-label={
        selectionMode
          ? `Sélectionner ${book.title}`
          : `Ouvrir ${book.title}`
      }
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 ${
        isSelected
          ? "border-blue-500 border-2 ring-2 ring-blue-200"
          : "border-gray-200"
      }`}
    >
      {/* Desktop/Tablet : Layout vertical */}
      <div className="hidden md:block">
        <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
          <img
            src={coverSrc}
            alt={book.title}
            className="w-full h-full object-contain"
          />
          {/* Checkbox de sélection */}
          {selectionMode && (
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onClick()} // Géré par onClick de la carte
                className="w-5 h-5 cursor-pointer accent-blue-600"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Sélectionner ${book.title}`}
              />
            </div>
          )}
          {/* Badge de lecture en overlay (lecture seule) */}
          <div
            className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs font-medium rounded-full ${
              book.isRead ? "bg-green-500 text-white" : "bg-gray-500 text-white"
            }`}
          >
            {book.isRead ? "Lu" : "Non lu"}
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-1.5 line-clamp-2 leading-snug">
            {book.title}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-1 mb-3">
            {book.authors?.join(", ") || "Auteur inconnu"}
          </p>
          {/* Badges informatifs (lecture seule) */}
          <div className="flex flex-wrap gap-1.5">
            {/* Badge statut de lecture */}
            {(() => {
              const status =
                book.readingStatus || (book.isRead ? "lu" : "non_lu");
              const statusConfig = {
                lu: {
                  icon: <Check size={16} weight="bold" />,
                  label: "Lu",
                  color: "bg-green-100 text-green-800",
                },
                non_lu: {
                  icon: <Circle size={16} weight="regular" />,
                  label: "Non lu",
                  color: "bg-gray-100 text-gray-800",
                },
                a_lire: {
                  icon: <Book size={16} weight="regular" />,
                  label: "À lire",
                  color: "bg-blue-100 text-blue-800",
                },
                en_cours: {
                  icon: <Clock size={16} weight="regular" />,
                  label: "En cours",
                  color: "bg-yellow-100 text-yellow-800",
                },
                abandonne: {
                  icon: <X size={16} weight="bold" />,
                  label: "Abandonné",
                  color: "bg-red-100 text-red-800",
                },
              };
              const config =
                statusConfig[status as keyof typeof statusConfig] ||
                statusConfig.non_lu;
              return (
                <span
                  className={`text-xs px-1 py-0.5 rounded font-medium ${config.color}`}
                >
                  {config.icon} {config.label}
                </span>
              );
            })()}

            {/* Badge type de livre */}
            {(() => {
              const type = book.bookType || "physique";
              const typeConfig = {
                physique: {
                  icon: <Books size={16} weight="regular" />,
                  label: "Physique",
                  color: "bg-amber-100 text-amber-800",
                },
                numerique: {
                  icon: <DeviceMobile size={16} weight="regular" />,
                  label: "Numérique",
                  color: "bg-indigo-100 text-indigo-800",
                },
                audio: {
                  icon: <Headphones size={16} weight="regular" />,
                  label: "Audio",
                  color: "bg-purple-100 text-purple-800",
                },
              };
              const config =
                typeConfig[type as keyof typeof typeConfig] ||
                typeConfig.physique;
              return (
                <span
                  className={`text-xs px-1 py-0.5 rounded font-medium ${config.color}`}
                >
                  {config.icon} {config.label}
                </span>
              );
            })()}
          </div>

          {/* Bibliothèques (affichage simple) */}
          {book.libraries && book.libraries.length > 0 && userLibraries && (
            <div className="flex flex-wrap gap-1 mt-1">
              {book.libraries.map((libId) => {
                const library = userLibraries.find((lib) => lib.id === libId);
                return library ? (
                  <span
                    key={libId}
                    className="px-1 py-0.5 rounded text-xs text-white font-medium"
                    style={{ backgroundColor: library.color || "#3B82F6" }}
                  >
                    {renderLibraryIcon(library.icon || "BK", 16)} {library.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile : Layout optimisé pleine largeur */}
      <div className="flex md:hidden items-center p-4 relative">
        <div className="w-16 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 mr-4">
          <img
            src={coverSrc}
            alt={book.title}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 leading-tight">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1 mb-2">
            {book.authors?.join(", ") || "Auteur inconnu"}
          </p>
          {/* Badges informatifs mobile (lecture seule) */}
          <div className="flex flex-wrap gap-1.5">
            {/* Badge statut de lecture */}
            {(() => {
              const status =
                book.readingStatus || (book.isRead ? "lu" : "non_lu");
              const statusConfig = {
                lu: {
                  icon: <Check size={16} weight="bold" />,
                  label: "Lu",
                  color: "bg-green-100 text-green-800",
                },
                non_lu: {
                  icon: <Circle size={16} weight="regular" />,
                  label: "Non lu",
                  color: "bg-gray-100 text-gray-800",
                },
                a_lire: {
                  icon: <Book size={16} weight="regular" />,
                  label: "À lire",
                  color: "bg-blue-100 text-blue-800",
                },
                en_cours: {
                  icon: <Clock size={16} weight="regular" />,
                  label: "En cours",
                  color: "bg-yellow-100 text-yellow-800",
                },
                abandonne: {
                  icon: <X size={16} weight="bold" />,
                  label: "Abandonné",
                  color: "bg-red-100 text-red-800",
                },
              };
              const config =
                statusConfig[status as keyof typeof statusConfig] ||
                statusConfig.non_lu;
              return (
                <span
                  className={`text-xs px-1 py-0.5 rounded font-medium ${config.color}`}
                >
                  {config.icon}
                </span>
              );
            })()}

            {/* Badge type de livre */}
            {(() => {
              const type = book.bookType || "physique";
              const typeConfig = {
                physique: {
                  icon: <Books size={16} weight="regular" />,
                  label: "Physique",
                  color: "bg-amber-100 text-amber-800",
                },
                numerique: {
                  icon: <DeviceMobile size={16} weight="regular" />,
                  label: "Numérique",
                  color: "bg-indigo-100 text-indigo-800",
                },
                audio: {
                  icon: <Headphones size={16} weight="regular" />,
                  label: "Audio",
                  color: "bg-purple-100 text-purple-800",
                },
              };
              const config =
                typeConfig[type as keyof typeof typeConfig] ||
                typeConfig.physique;
              return (
                <span
                  className={`text-xs px-1 py-0.5 rounded font-medium ${config.color}`}
                >
                  {config.icon}
                </span>
              );
            })()}
          </div>

          {/* Bibliothèques mobile (affichage simple) */}
          {book.libraries && book.libraries.length > 0 && userLibraries && (
            <div className="flex flex-wrap gap-1 mt-1">
              {book.libraries.map((libId) => {
                const library = userLibraries.find((lib) => lib.id === libId);
                return library ? (
                  <span
                    key={libId}
                    className="px-1 py-0.5 rounded text-xs text-white font-medium"
                    style={{ backgroundColor: library.color || "#3B82F6" }}
                  >
                    {renderLibraryIcon(library.icon || "BK", 16)}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        {/* Badge de lecture mobile (lecture seule) */}
        <div
          className={`ml-2 px-2 py-1 text-xs font-medium rounded-md flex-shrink-0 ${
            book.isRead ? "bg-green-500 text-white" : "bg-gray-500 text-white"
          }`}
        >
          {book.isRead ? "Lu" : "Non lu"}
        </div>
      </div>
    </div>
  );
}

// Composant vue détaillée (version actuelle)
function CollectionBookCard({
  book,
  onRemove,
  onToggleRead,
  onUpdateCover,
  onEdit,
  onStatusChange,
  onTypeChange,
  userLibraries,
  onLibraryToggle,
}: {
  book: CollectionBook;
  onRemove: () => void;
  onToggleRead: () => void;
  onUpdateCover?: (newCoverUrl: string | null) => void;
  onEdit?: () => void;
  onStatusChange?: (status: string) => void;
  onTypeChange?: (type: string) => void;
  userLibraries?: UserLibrary[];
  onLibraryToggle?: (libraryId: string) => void;
}) {
  const [coverSrc, setCoverSrc] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [bookDetails, setBookDetails] = useState<CollectionBook | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    // Si image personnalisée, l'utiliser en priorité
    if (book.customCoverUrl) {
      setCoverSrc(book.customCoverUrl);
      return;
    }

    const testImage = new Image();
    const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;
    const fallback = "/img/default-cover.png";

    testImage.src = openLibraryUrl;
    testImage.onload = () => {
      if (testImage.width > 1 && testImage.height > 1) {
        setCoverSrc(openLibraryUrl);
      } else {
        setCoverSrc(fallback);
      }
    };
    testImage.onerror = () => setCoverSrc(fallback);
  }, [book.isbn, book.customCoverUrl]);

  const fetchBookDetails = async () => {
    if (bookDetails || loadingDetails) return;

    setLoadingDetails(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}`
      );
      const data = await res.json();
      const volumeInfo = data.items?.[0]?.volumeInfo;
      setBookDetails(volumeInfo);
    } catch (err) {
      console.error("Erreur lors de la récupération des détails:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExpandToggle = () => {
    if (!expanded) {
      fetchBookDetails();
    }
    setExpanded(!expanded);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !onUpdateCover) return;

    // Validation du fichier
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner un fichier image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB max
      alert("Le fichier doit faire moins de 5MB");
      return;
    }

    setUploadingCover(true);
    try {
      // Redimensionner et convertir en base64 (gratuit!)
      const base64Image = await resizeImage(file, 400, 0.8);
      onUpdateCover(base64Image);
    } catch (error) {
      console.error("Erreur traitement image:", error);
      alert("Erreur lors du traitement de l'image");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (!onUpdateCover) return;
    // Simplement remettre à null pour utiliser l'image d'origine
    onUpdateCover(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
        <img
          src={coverSrc}
          alt={book.title}
          className="w-full h-full object-contain"
        />
        {/* Badge de lecture en overlay - CLICKABLE */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Empêcher le clic sur la carte parente
            onToggleRead();
          }}
          className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
            book.isRead
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-500 text-white hover:bg-gray-600"
          }`}
          title={book.isRead ? "Marquer comme non lu" : "Marquer comme lu"}
        >
          {book.isRead ? "Lu" : "Non lu"}
        </button>

        {/* Boutons de gestion de couverture */}
        {onUpdateCover && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            <label
              className={`px-2 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
                uploadingCover
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {uploadingCover ? (
                <Clock size={16} weight="regular" />
              ) : (
                <Camera size={16} weight="regular" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingCover}
                className="hidden"
              />
            </label>
            {book.customCoverUrl && (
              <button
                onClick={handleRestoreOriginal}
                className="px-2 py-1 text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 rounded transition-all cursor-pointer"
                title="Restaurer l'image originale"
                aria-label="Restaurer l'image originale"
              >
                <ArrowClockwise size={16} weight="regular" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
          {book.title}
        </h3>
        <p className="text-xs text-gray-600 mb-3 line-clamp-1">
          {book.authors?.join(", ") || "Auteur inconnu"}
        </p>

        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">
            Ajouté le {new Date(book.addedAt).toLocaleDateString("fr-FR")}
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleExpandToggle}
              className="px-3 py-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors cursor-pointer flex items-center gap-1 font-medium text-sm border border-blue-200 hover:border-blue-300"
              title={expanded ? "Masquer les détails" : "Voir les détails"}
            >
              {expanded ? (
                <>
                  <CaretUp size={18} weight="bold" />
                  Masquer
                </>
              ) : (
                <>
                  <CaretDown size={18} weight="bold" />
                  Détails
                </>
              )}
            </button>
            {/* Bouton modifier - pour tous les livres */}
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                title="Modifier ce livre"
                aria-label="Modifier ce livre"
              >
                <PencilSimple size={16} weight="regular" />
              </button>
            )}
            <button
              onClick={onRemove}
              className="p-1.5 text-red-600 hover:bg-red-100 border border-red-300 hover:border-red-400 rounded-md transition-colors cursor-pointer"
              title="Supprimer définitivement de la collection"
              aria-label="Supprimer définitivement de la collection"
            >
              <Trash size={16} weight="fill" />
            </button>
          </div>
        </div>

        {/* Actions rapides de statut */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Statut de lecture */}
          {onStatusChange && (
            <select
              value={book.readingStatus || (book.isRead ? "lu" : "non_lu")}
              onChange={(e) => onStatusChange(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="non_lu">Non lu</option>
              <option value="a_lire">À lire</option>
              <option value="en_cours">En cours</option>
              <option value="lu">Lu</option>
              <option value="abandonne">Abandonné</option>
            </select>
          )}

          {/* Type de livre */}
          {onTypeChange && (
            <select
              value={book.bookType || "physique"}
              onChange={(e) => onTypeChange(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="physique">Physique</option>
              <option value="numerique">Numérique</option>
              <option value="audio">Audio</option>
            </select>
          )}
        </div>

        {/* Gestion des bibliothèques */}
        {userLibraries && userLibraries.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              <FolderOpen size={16} weight="regular" className="inline mr-2" />
              Bibliothèques
            </h4>

            {/* Bibliothèques actuelles */}
            {book.libraries && book.libraries.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {book.libraries.map((libId) => {
                  const library = userLibraries.find((lib) => lib.id === libId);
                  return library ? (
                    <button
                      key={libId}
                      onClick={() => onLibraryToggle?.(libId)}
                      className="px-2 py-1 rounded text-xs text-white transition-colors hover:opacity-80 cursor-pointer"
                      style={{ backgroundColor: library.color || "#3B82F6" }}
                      title={`Retirer de ${library.name}`}
                      aria-label={`Retirer de ${library.name}`}
                    >
                      {renderLibraryIcon(library.icon || "BK", 16)}{" "}
                      {library.name} <X size={12} />
                    </button>
                  ) : null;
                })}
              </div>
            )}

            {/* Ajouter à une bibliothèque */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onLibraryToggle?.(e.target.value);
                }
              }}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Ajouter à une bibliothèque...</option>
              {userLibraries
                .filter((lib) => !book.libraries?.includes(lib.id))
                .map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Collapse Details */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t pt-3 mt-2">
            {loadingDetails ? (
              <div className="text-center py-4">
                <div className="text-blue-600">
                  <Hourglass size={16} className="inline mr-2" />
                  Chargement des détails...
                </div>
              </div>
            ) : bookDetails ? (
              <div className="space-y-3">
                {bookDetails.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">
                      <Book
                        size={16}
                        weight="regular"
                        className="inline mr-2"
                      />
                      Résumé
                    </h4>
                    <div
                      className={`${
                        showFullDescription
                          ? "max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
                          : "max-h-none"
                      }`}
                    >
                      <p
                        className={`text-xs text-gray-600 leading-relaxed ${
                          showFullDescription ? "" : "line-clamp-4"
                        }`}
                      >
                        {bookDetails.description.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>
                    {bookDetails.description.length > 200 && (
                      <button
                        onClick={() =>
                          setShowFullDescription(!showFullDescription)
                        }
                        className="text-blue-600 hover:text-blue-700 text-xs mt-2 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        {showFullDescription ? <>Lire moins</> : <>Lire plus</>}
                      </button>
                    )}
                  </div>
                )}

                {bookDetails.publishedDate && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">
                      <CalendarBlank
                        size={16}
                        weight="regular"
                        className="inline mr-2"
                      />
                      Publication
                    </h4>
                    <p className="text-xs text-gray-600">
                      {bookDetails.publishedDate}
                    </p>
                  </div>
                )}

                {bookDetails.publisher && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">
                      <Buildings
                        size={16}
                        weight="regular"
                        className="inline mr-2"
                      />
                      Éditeur
                    </h4>
                    <p className="text-xs text-gray-600">
                      {bookDetails.publisher}
                    </p>
                  </div>
                )}

                {bookDetails.pageCount && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">
                      <FileText
                        size={16}
                        weight="regular"
                        className="inline mr-2"
                      />
                      Pages
                    </h4>
                    <p className="text-xs text-gray-600">
                      {bookDetails.pageCount} pages
                    </p>
                  </div>
                )}

                {bookDetails.categories &&
                  bookDetails.categories.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs mb-1">
                        <Tag
                          size={16}
                          weight="regular"
                          className="inline mr-2"
                        />
                        Catégories
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {bookDetails.categories
                          .slice(0, 3)
                          .map((category: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {category.split("/")[0]}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">Aucun détail disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoogleBook {
  isbn?: string;
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
  };
  customCoverUrl?: string;
  genre?: string;
  tags?: string[];
  source?: string;
}

const EMPTY_MANUAL_BOOK = {
  title: "",
  authors: "",
  publisher: "",
  publishedDate: "",
  description: "",
  pageCount: "",
  customCoverUrl: "",
};

function App() {
  const [book, setBook] = useState<GoogleBook | null>(null);
  const [scanning, setScanning] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collectionBooks, setCollectionBooks] = useState<CollectionBook[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const collectionModalScrollRef = useRef<HTMLDivElement>(null);
  const [addingToCollection, setAddingToCollection] = useState(false);

  // États pour la sélection multiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkLibraryModal, setShowBulkLibraryModal] = useState(false);
  const [bulkLibrarySelection, setBulkLibrarySelection] = useState<string[]>([]);
  const [addMessage, setAddMessage] = useState<{
    text: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [authMessage, setAuthMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);
  const [selectedBook, setSelectedBook] = useState<CollectionBook | null>(null);
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionPage, setCollectionPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const resultsPerPage = 10;
  const collectionResultsPerPage = 20;
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualBook, setManualBook] = useState({ ...EMPTY_MANUAL_BOOK });
  const [showEditModal, setShowEditModal] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<CollectionBook | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    readingStatus: [],
    bookType: [],
    genre: [],
    yearRange: [null, null],
    pageRange: [null, null],
    authors: [],
    favorites: null,
    libraries: [],
  });
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [selectedLibrariesForAdd, setSelectedLibrariesForAdd] = useState<string[]>([]);
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [showAnnouncementManager, setShowAnnouncementManager] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);
  const [isOffline, setIsOffline] = useState(!getIsOnline());
  const isOfflineRef = useRef(isOffline);
  const [selectedLibraryView, setSelectedLibraryView] = useState<string | null>(
    null
  ); // null = tous les livres
  const authModalRef = useFocusTrap<HTMLDivElement>(showAuthModal);
  const manualAddModalRef = useFocusTrap<HTMLDivElement>(showManualAdd);
  const collectionModalRef = useFocusTrap<HTMLDivElement>(showCollectionModal);
  const bulkDeleteModalRef = useFocusTrap<HTMLDivElement>(showBulkDeleteModal);
  const settingsModalRef = useFocusTrap<HTMLDivElement>(showNotificationSettings);
  const userManagementModalRef = useFocusTrap<HTMLDivElement>(showUserManagement);

  const closeAuthModal = () => setShowAuthModal(false);

  const closeManualAdd = () => {
    setShowManualAdd(false);
    setManualBook({ ...EMPTY_MANUAL_BOOK });
  };

  const closeCollectionModal = () => {
    setShowCollectionModal(false);
    setSelectedBook(null);
  };

  const closeBulkDeleteModal = () => setShowBulkDeleteModal(false);

  const closeSettingsModal = () => setShowNotificationSettings(false);

  const closeUserManagementModal = () => setShowUserManagement(false);

  const isOnline = () => !isOffline;

  const showOfflineMessage = (action: string) => {
    setAddMessage({
      text: `Vous êtes hors ligne - ${action} nécessite une connexion.`,
      type: "warning",
    });
    setTimeout(() => setAddMessage(null), 3000);
  };

  const requireOnline = (action: string) => {
    if (isOnline()) return true;
    showOfflineMessage(action);
    return false;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOffline(false);
      setAddMessage({
        text: "Connexion rétablie - Vous êtes de nouveau en ligne.",
        type: "success",
      });
      setTimeout(() => setAddMessage(null), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setAddMessage({
        text: "Vous êtes hors ligne - Mode lecture seule.",
        type: "warning",
      });
      setTimeout(() => setAddMessage(null), 3000);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  useModalCloseRequest(authModalRef, showAuthModal, closeAuthModal);
  useModalCloseRequest(manualAddModalRef, showManualAdd, closeManualAdd);
  useModalCloseRequest(collectionModalRef, showCollectionModal, closeCollectionModal);
  useModalCloseRequest(bulkDeleteModalRef, showBulkDeleteModal, closeBulkDeleteModal);
  useModalCloseRequest(settingsModalRef, showNotificationSettings, closeSettingsModal);
  useModalCloseRequest(userManagementModalRef, showUserManagement, closeUserManagementModal);

  // États pour le mode multi-scan
  const [scanMode, setScanMode] = useState<"single" | "batch">("single");
  const [bulkScannedIsbns, setBulkScannedIsbns] = useState<string[]>([]);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);


  // État pour le menu d'export CSV
  const [showExportMenu, setShowExportMenu] = useState(false);

  // État pour le menu d'export PDF
  const [showExportMenuPdf, setShowExportMenuPdf] = useState(false);

  // État pour la recherche textuelle dans la collection
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");

  // Fermer le menu d'export si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (showExportMenu && !target.closest("[data-export-menu]")) {
        setShowExportMenu(false);
      }

      if (showExportMenuPdf && !target.closest("[data-export-menu-pdf]")) {
        setShowExportMenuPdf(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showExportMenu, showExportMenuPdf]);

  // États pour le post-scan confirmation
  const [showPostScanConfirm, setShowPostScanConfirm] = useState(false);
  const [scannedBookData, setScannedBookData] = useState<{
    isbn: string;
    title?: string;
    authors?: string[];
    publisher?: string;
    coverUrl?: string;
  } | null>(null);

  // Cache des ISBN existants pour anti-doublon
  const existingIsbnsSet = useMemo(() => {
    return new Set(collectionBooks.map((book) => book.isbn));
  }, [collectionBooks]);

  const handleDetected = async (code: string) => {
    setScanning(false);

    if (!isOnline()) {
      setAddMessage({
        text: "Hors ligne: details indisponibles. Vous pouvez ajouter le livre manuellement.",
        type: "error",
      });
      setTimeout(() => setAddMessage(null), 5000);
      setScannedBookData({
        isbn: code,
        title: "Titre inconnu",
      });
      setShowPostScanConfirm(true);
      return;
    }

    // Vibration mobile si disponible
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Récupérer les données du livre avec fallback OpenLibrary
    try {
      const metadata = await fetchBookMetadata(code);

      if (metadata) {
        setScannedBookData({
          isbn: code,
          title: metadata.title,
          authors: metadata.authors,
          publisher: metadata.publisher,
          coverUrl: metadata.thumbnail,
        });
        setShowPostScanConfirm(true);
      } else {
        // Pas de données trouvées, afficher avec données minimales
        setScannedBookData({
          isbn: code,
          title: "Titre inconnu",
        });
        setShowPostScanConfirm(true);
      }
    } catch (err) {
      console.error("Erreur lors de la recherche :", err);
      setScannedBookData({
        isbn: code,
        title: "Titre inconnu",
      });
      setShowPostScanConfirm(true);
    }
  };

  const handleSearch = async (code: string) => {
    if (!requireOnline("la recherche ISBN")) {
      setBook(null);
      return;
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${code}`
      );
      const data = await res.json();
      const volumeInfo = data.items?.[0]?.volumeInfo || null;
      setBook({ ...volumeInfo, isbn: code });
    } catch (err) {
      console.error("Erreur lors de la recherche Google Books :", err);
      setBook(null);
    }
  };

  const handleTextSearch = async (query: string) => {
    if (!query.trim()) return;

    if (!requireOnline("la recherche en ligne")) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setCurrentPage(1); // Reset à la première page
    let allBooks: GoogleBook[] = [];

    try {
      // 1. Recherche Google Books
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=40`
      );
      const googleData = await googleRes.json();
      const googleBooks: GoogleBook[] =
        googleData.items?.map(
          (item: {
            volumeInfo: GoogleBook & {
              industryIdentifiers?: Array<{ type: string; identifier: string }>;
            };
          }) => ({
            ...item.volumeInfo,
            isbn:
              item.volumeInfo?.industryIdentifiers?.find(
                (id) => id.type === "ISBN_13" || id.type === "ISBN_10"
              )?.identifier || `temp_google_${Date.now()}_${Math.random()}`,
            source: "Google Books",
          })
        ) || [];

      allBooks = [...googleBooks];

      // 2. Si pas assez de résultats, essayer OpenLibrary
      if (allBooks.length < 5) {
        try {
          const openLibRes = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(
              query
            )}&limit=40`
          );
          const openLibData = await openLibRes.json();
          interface OpenLibDoc {
            title: string;
            author_name?: string[];
            first_publish_year?: number;
            publisher?: string[];
            isbn?: string[];
            cover_i?: number;
          }
          const openLibBooks: GoogleBook[] =
            openLibData.docs
              ?.map((doc: OpenLibDoc) => ({
                title: doc.title,
                authors: doc.author_name || [],
                publishedDate: doc.first_publish_year?.toString(),
                publisher: doc.publisher?.[0],
                isbn:
                  doc.isbn?.[0] ||
                  `temp_openlib_${Date.now()}_${Math.random()}`,
                imageLinks: doc.cover_i
                  ? {
                      thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
                    }
                  : undefined,
                source: "Open Library",
              }))
              .filter((book: GoogleBook) => book.title) || [];

          // Éviter les doublons basés sur le titre et l'auteur
          const uniqueOpenLibBooks = openLibBooks.filter(
            (olBook) =>
              !allBooks.some(
                (gBook) =>
                  gBook.title?.toLowerCase() === olBook.title?.toLowerCase() &&
                  gBook.authors?.[0]?.toLowerCase() ===
                    olBook.authors?.[0]?.toLowerCase()
              )
          );

          allBooks = [...allBooks, ...uniqueOpenLibBooks];
        } catch (openLibErr) {
          console.error("Erreur OpenLibrary:", openLibErr);
        }
      }

      setSearchResults(allBooks); // Garder tous les résultats pour la pagination
    } catch (err) {
      console.error("Erreur lors de la recherche par texte :", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Calcul de la pagination
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const currentResults = searchResults.slice(
    startIndex,
    startIndex + resultsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll vers le haut des résultats
    const resultsElement = document.getElementById("search-results");
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePostScanConfirm = async () => {
    if (!scannedBookData || !user) return;

    setAddingToCollection(true);
    try {
      // Normaliser les données comme dans bulkAddBooks
      const bookData: Record<string, unknown> = {
        isbn: scannedBookData.isbn,
        title: scannedBookData.title || "Titre inconnu",
        addedAt: new Date().toISOString(),
        isRead: false,
        readingStatus: "non_lu",
        bookType: "physique",
        isManualEntry: false,
      };

      // Ajouter uniquement les champs définis pour éviter les erreurs Firebase
      if (scannedBookData.authors && scannedBookData.authors.length > 0) {
        bookData.authors = scannedBookData.authors;
      }
      if (scannedBookData.publisher) {
        bookData.publisher = scannedBookData.publisher;
      }
      if (scannedBookData.coverUrl) {
        bookData.customCoverUrl = scannedBookData.coverUrl;
      }

      // Ajouter les bibliothèques sélectionnées
      if (selectedLibrariesForAdd.length > 0) {
        bookData.libraries = selectedLibrariesForAdd;
      }

      const bookRef = doc(
        db,
        `users/${user.uid}/collection`,
        scannedBookData.isbn
      );
      await setDoc(bookRef, bookData);

      // Recharger la collection
      const collectionRef = collection(db, `users/${user.uid}/collection`);
      const snapshot = await getDocs(collectionRef);
      const books = snapshot.docs.map(
        (docSnap) => ({ ...docSnap.data() } as CollectionBook)
      );
      setCollectionBooks(books);

      setAddMessage({
        text: "Livre ajouté avec succès !",
        type: "success",
      });

      setShowPostScanConfirm(false);
      setScannedBookData(null);
      setSelectedLibrariesForAdd([]);
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      setAddMessage({
        text: "Erreur lors de l'ajout du livre",
        type: "error",
      });
    } finally {
      setAddingToCollection(false);
    }
  };

  const handlePostScanCancel = () => {
    setShowPostScanConfirm(false);
    setScannedBookData(null);
    setSelectedLibrariesForAdd([]);
    setScanning(true); // Reprendre le scan
  };

  const handleManualBookSubmit = () => {
    if (!manualBook.title.trim()) {
      alert("Le titre est obligatoire");
      return;
    }

    const book = {
      title: manualBook.title,
      authors: manualBook.authors
        ? manualBook.authors.split(",").map((a) => a.trim())
        : [],
      publisher: manualBook.publisher || undefined,
      publishedDate: manualBook.publishedDate || undefined,
      description: manualBook.description || undefined,
      pageCount: manualBook.pageCount
        ? parseInt(manualBook.pageCount)
        : undefined,
      isbn: `manual_${Date.now()}_${Math.random()}`,
      customCoverUrl: manualBook.customCoverUrl || undefined,
    };

    setBook(book);
    setShowManualAdd(false);
    setManualBook({
      title: "",
      authors: "",
      publisher: "",
      publishedDate: "",
      description: "",
      pageCount: "",
      customCoverUrl: "",
    });
  };

  const handleManualCoverUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner un fichier image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Le fichier doit faire moins de 5MB");
      return;
    }

    try {
      const base64Image = await resizeImage(file, 400, 0.8);
      setManualBook((prev) => ({ ...prev, customCoverUrl: base64Image }));
    } catch (error) {
      console.error("Erreur traitement image:", error);
      alert("Erreur lors du traitement de l'image");
    }
  };

  const addToCollection = async (selectedLibraries?: string[]) => {
    if (!user || !book) return;

    setAddingToCollection(true);
    setAddMessage(null);

    try {
      const ref = doc(db, `users/${user.uid}/collection`, book.isbn || "");
      const docData: Record<string, unknown> = {
        title: book.title,
        authors: book.authors || [],
        isbn: book.isbn,
        addedAt: new Date().toISOString(),
        isRead: false,
      };

      // Sauvegarder l'image de couverture (priorité : customCoverUrl > imageLinks.thumbnail)
      if (book.customCoverUrl) {
        docData.customCoverUrl = book.customCoverUrl;
      } else if (book.imageLinks?.thumbnail) {
        docData.customCoverUrl = book.imageLinks.thumbnail;
      }

      // Marquer comme livre manuel si créé manuellement
      if (book.isbn?.startsWith("manual_")) {
        docData.isManualEntry = true;
        docData.publisher = book.publisher;
        docData.publishedDate = book.publishedDate;
        docData.description = book.description;
        docData.pageCount = book.pageCount;
      }

      // Valeurs par défaut pour les nouveaux champs de filtre
      docData.readingStatus = "a_lire"; // Par défaut "à lire"
      docData.bookType = "physique"; // Par défaut "physique"
      if (book.genre) docData.genre = book.genre;
      if (book.tags && book.tags.length > 0) docData.tags = book.tags;

      // Ajouter les bibliothèques sélectionnées
      if (selectedLibraries && selectedLibraries.length > 0) {
        docData.libraries = selectedLibraries;
      }

      await setDoc(ref, docData);

      await fetchCollection(user.uid);

      setAddMessage({
        text: "Livre ajouté à votre collection !",
        type: "success",
      });

      // Auto-fermeture après 2 secondes
      setTimeout(() => {
        setBook(null);
        setAddMessage(null);
      }, 2000);
    } catch (err) {
      console.error("Erreur ajout Firestore:", err);
      setAddMessage({
        text: "Erreur lors de l'ajout du livre",
        type: "error",
      });
    } finally {
      setAddingToCollection(false);
    }
  };

  const fetchCollection = useCallback(async (uid: string) => {
    try {
      const snapshot = await getDocs(collection(db, `users/${uid}/collection`));
      const list = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as CollectionBook & { id: string })
      );
      setCollectionBooks(list);
      const lastActivity =
        list
          .map((book) => book.updatedAt || book.addedAt)
          .filter((date): date is string => Boolean(date))
          .sort((a, b) => b.localeCompare(a))[0] ?? null;

      try {
        await updateUserProfileStats({
          uid,
          totalBooks: list.length,
          lastActivity,
        });
      } catch (error) {
        console.error("Erreur mise à jour stats utilisateur:", error);
      }
    } catch (err) {
      console.error("Erreur récupération collection:", err);
      if (isOfflineRef.current) {
        setAddMessage({
          text: "Hors ligne: impossible de charger la collection.",
          type: "error",
        });
        setTimeout(() => setAddMessage(null), 4000);
      }
    }
  }, []);

  const fetchUserLibraries = useCallback(async (uid: string) => {
    try {
      const snapshot = await getDocs(collection(db, `users/${uid}/libraries`));
      const libraries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserLibrary[];
      setUserLibraries(libraries);
      try {
        await updateUserProfileStats({
          uid,
          totalLibraries: libraries.length,
        });
      } catch (error) {
        console.error("Erreur mise à jour stats bibliothèques:", error);
      }
    } catch (err) {
      console.error("Erreur récupération bibliothèques:", err);
      // Si permissions manquantes, initialiser avec un tableau vide
      if (err instanceof Error && err.message.includes("permissions")) {
        setUserLibraries([]);
      }
      if (isOfflineRef.current) {
        setAddMessage({
          text: "Hors ligne: impossible de charger les bibliotheques.",
          type: "error",
        });
        setTimeout(() => setAddMessage(null), 4000);
      }
    }
  }, []);

  const createUserLibrary = async (
    library: Omit<UserLibrary, "id" | "createdAt">
  ) => {
    if (!user) return;

    try {
      const libraryId = `lib_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const ref = doc(db, `users/${user.uid}/libraries`, libraryId);

      // Nettoyer les données pour éviter les valeurs undefined
      const libraryData: Record<string, unknown> = {
        id: libraryId,
        name: library.name,
        createdAt: new Date().toISOString(),
      };

      if (library.description && library.description.trim()) {
        libraryData.description = library.description.trim();
      }
      if (library.color) libraryData.color = library.color;
      if (library.icon) libraryData.icon = library.icon;

      await setDoc(ref, libraryData);
      await fetchUserLibraries(user.uid);
      return libraryId;
    } catch (err) {
      console.error("Erreur création bibliothèque:", err);
    }
  };

  const updateUserLibrary = async (
    libraryId: string,
    library: Omit<UserLibrary, "id" | "createdAt">
  ) => {
    if (!user) return;

    try {
      const ref = doc(db, `users/${user.uid}/libraries`, libraryId);

      // Nettoyer les données pour éviter les valeurs undefined
      const libraryData: Partial<UserLibrary> = {
        name: library.name,
      };

      if (library.description && library.description.trim()) {
        libraryData.description = library.description.trim();
      }
      if (library.color) libraryData.color = library.color;
      if (library.icon) libraryData.icon = library.icon;

      await updateDoc(ref, libraryData as Record<string, string>);
      await fetchUserLibraries(user.uid);
    } catch (err) {
      console.error("Erreur modification bibliothèque:", err);
      throw err;
    }
  };

  const deleteUserLibrary = async (libraryId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/libraries`, libraryId));
      await fetchUserLibraries(user.uid);

      // Retirer cette bibliothèque de tous les livres
      const booksToUpdate = collectionBooks.filter((book) =>
        book.libraries?.includes(libraryId)
      );

      for (const book of booksToUpdate) {
        const updatedBook = {
          ...book,
          libraries: book.libraries?.filter((id: string) => id !== libraryId),
        };
        await updateBookInFirestore(updatedBook);
      }
    } catch (err) {
      console.error("Erreur suppression bibliothèque:", err);
    }
  };

  const checkAndSetupAdmin = useCallback(async (user: User | null) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    // UID administrateur depuis les variables d'environnement
    const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (user.uid === ADMIN_UID) {
        // C'est Greg - s'assurer qu'il a le statut admin
        if (!userDoc.exists() || !userDoc.data()?.isAdmin) {
          await setDoc(
            userRef,
            {
              email: "dreegoald@gmail.com",
              isAdmin: true,
              displayName: user.displayName,
              lastLogin: new Date().toISOString(),
            },
            { merge: true }
          );
        }
        setIsAdmin(true);
      } else {
        // Autre utilisateur - vérifier le statut admin existant
        const adminStatus =
          userDoc.exists() && userDoc.data()?.isAdmin === true;
        setIsAdmin(adminStatus);
      }
    } catch (error) {
      console.error("Erreur vérification admin:", error);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const isChromeMobile =
      /Chrome/.test(navigator.userAgent) &&
      (/Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(
        navigator.userAgent
      ) ||
        window.innerWidth <= 768);

    // Gérer le retour de redirection avec retry pour Chrome mobile
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result?.user) {
          return;
        }

        // Chrome mobile fallback - forcer la vérification de l'état auth
        if (isChromeMobile) {
          // Check immédiat
          setTimeout(() => {
            // Vérification silencieuse
          }, 100);

          // Check après 1 seconde
          setTimeout(() => {
            // Vérification silencieuse
          }, 1000);

          // Check après 2 secondes
          setTimeout(() => {
            // Vérification silencieuse
          }, 2000);
        }
      } catch (err) {
        console.error("❌ App - Erreur de redirection:", err);
      }
    };

    handleRedirectResult();

      const unsubscribe = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          try {
            await syncUserProfile(u);
          } catch (error) {
            console.error("Erreur synchronisation profil utilisateur:", error);
          }
          // Vérifier et configurer le statut admin
          await checkAndSetupAdmin(u);
          fetchCollection(u.uid);
          fetchUserLibraries(u.uid);
        setAuthMessage({
          text: `Connecté en tant que ${u.displayName}`,
          type: "success",
        });
        setTimeout(() => setAuthMessage(null), 3000);
      } else {
        setIsAdmin(false); // Réinitialiser le statut admin à la déconnexion
        setAuthMessage({ text: "Vous êtes déconnecté", type: "info" });
        setTimeout(() => setAuthMessage(null), 3000);
      }
    });

    return () => unsubscribe();
  }, [checkAndSetupAdmin, fetchCollection, fetchUserLibraries]);

  const removeFromCollection = async (isbn: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/collection`, isbn));
      fetchCollection(user.uid);
    } catch (err) {
      console.error("Erreur suppression Firestore:", err);
    }
  };

  const toggleReadStatus = async (isbn: string) => {
    if (!user) return;

    try {
      const bookToUpdate = collectionBooks.find((book) => book.isbn === isbn);
      if (!bookToUpdate) return;

      const ref = doc(db, `users/${user.uid}/collection`, isbn);
      await setDoc(ref, {
        ...bookToUpdate,
        isRead: !bookToUpdate.isRead,
      });

      fetchCollection(user.uid);
    } catch (err) {
      console.error("Erreur mise à jour statut lecture:", err);
    }
  };

  const updateBookCover = async (
    isbn: string,
    newCoverUrl: string | null | undefined
  ) => {
    if (!user) return;

    try {
      const bookToUpdate = collectionBooks.find((book) => book.isbn === isbn);
      if (!bookToUpdate) return;

      const ref = doc(db, `users/${user.uid}/collection`, isbn);
      const docData = { ...bookToUpdate };

      if (newCoverUrl) {
        docData.customCoverUrl = newCoverUrl;
      } else {
        // Supprimer le champ au lieu de le mettre à undefined
        delete docData.customCoverUrl;
      }

      await setDoc(ref, docData);

      // Mettre à jour les états locaux
      fetchCollection(user.uid);
      if (selectedBook && selectedBook.isbn === isbn) {
        const updatedBook = { ...selectedBook };
        if (newCoverUrl) {
          updatedBook.customCoverUrl = newCoverUrl;
        } else {
          delete updatedBook.customCoverUrl;
        }
        setSelectedBook(updatedBook);
      }
    } catch (err) {
      console.error("Erreur mise à jour couverture:", err);
    }
  };

  const updateBookInFirestore = async (updatedBook: CollectionBook) => {
    if (!user) return;

    try {
      const ref = doc(db, `users/${user.uid}/collection`, updatedBook.isbn);

      // Fonction pour nettoyer récursivement les valeurs undefined
      const cleanObject = (obj: unknown): unknown => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.filter((item) => item !== undefined);
        if (typeof obj === "object") {
          const cleaned: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(
            obj as Record<string, unknown>
          )) {
            if (value !== undefined) {
              cleaned[key] = cleanObject(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Nettoyer complètement l'objet livre
      const cleanedBook = cleanObject({
        isbn: updatedBook.isbn,
        title: updatedBook.title,
        authors: updatedBook.authors || [],
        addedAt: updatedBook.addedAt,
        isRead: updatedBook.isRead,
        readingStatus:
          updatedBook.readingStatus || (updatedBook.isRead ? "lu" : "a_lire"),
        bookType: updatedBook.bookType || "physique",
        customCoverUrl: updatedBook.customCoverUrl,
        publisher: updatedBook.publisher,
        publishedDate: updatedBook.publishedDate,
        description: updatedBook.description,
        pageCount: updatedBook.pageCount,
        isManualEntry: updatedBook.isManualEntry,
        genre: updatedBook.genre,
        tags: updatedBook.tags,
        libraries: updatedBook.libraries,
      });

      await setDoc(ref, cleanedBook);

      // Mettre à jour les états locaux
      fetchCollection(user.uid);
      if (selectedBook && selectedBook.isbn === updatedBook.isbn) {
        setSelectedBook(updatedBook);
      }
    } catch (err) {
      console.error("Erreur mise à jour livre:", err);
    }
  };

  const handleEditBook = (book: CollectionBook) => {
    setBookToEdit(book);
    setShowEditModal(true);
  };

  const handleSaveEditedBook = (updatedBook: CollectionBook) => {
    updateBookInFirestore(updatedBook);
    setShowEditModal(false);
    setBookToEdit(null);
  };

  const handleStatusChange = async (isbn: string, newStatus: string) => {
    if (!user) return;

    const bookToUpdate = collectionBooks.find((book) => book.isbn === isbn);
    if (!bookToUpdate) return;

    const updatedBook = {
      ...bookToUpdate,
      readingStatus: newStatus as
        | "lu"
        | "non_lu"
        | "a_lire"
        | "en_cours"
        | "abandonne",
      isRead: newStatus === "lu", // Sync avec l'ancien champ isRead
    };

    await updateBookInFirestore(updatedBook);
  };

  const handleTypeChange = async (isbn: string, newType: string) => {
    if (!user) return;

    const bookToUpdate = collectionBooks.find((book) => book.isbn === isbn);
    if (!bookToUpdate) return;

    const updatedBook = {
      ...bookToUpdate,
      bookType: newType as "physique" | "numerique" | "audio",
    };

    await updateBookInFirestore(updatedBook);
  };

  const handleLibraryToggle = async (isbn: string, libraryId: string) => {
    if (!user) return;

    const bookToUpdate = collectionBooks.find((book) => book.isbn === isbn);
    if (!bookToUpdate) return;

    const currentLibraries = bookToUpdate.libraries || [];
    let updatedLibraries: string[];

    if (currentLibraries.includes(libraryId)) {
      // Retirer la bibliothèque
      updatedLibraries = currentLibraries.filter(
        (id: string) => id !== libraryId
      );
    } else {
      // Ajouter la bibliothèque
      updatedLibraries = [...currentLibraries, libraryId];
    }

    const updatedBook = {
      ...bookToUpdate,
      libraries: updatedLibraries.length > 0 ? updatedLibraries : undefined,
    };

    await updateBookInFirestore(updatedBook);
  };

  // Handlers pour le mode multi-scan
  const handleBulkScanComplete = (isbns: string[]) => {
    setBulkScannedIsbns(isbns);
    setScanning(false);
    setShowBulkConfirmModal(true);
  };

  const handleBulkAddConfirm = async (
    isbns: string[],
    personalNotes: Record<string, string>,
    selectedLibraries?: string[]
  ) => {
    if (!user) {
      setAddMessage({
        text: "Vous devez être connecté pour ajouter des livres",
        type: "error",
      });
      return;
    }

    if (!requireOnline("l'ajout par lot")) {
      return;
    }

    try {
      const response: BulkAddResponse = await bulkAddBooks(
        isbns,
        user.uid,
        db,
        collectionBooks,
        personalNotes,
        selectedLibraries
      );

      // Recharger la collection depuis Firestore
      const collectionRef = collection(db, `users/${user.uid}/collection`);
      const snapshot = await getDocs(collectionRef);
      const books = snapshot.docs.map(
        (doc) => ({ ...doc.data() } as CollectionBook)
      );
      setCollectionBooks(books);

      // Afficher le feedback
      const { added, duplicates, errors } = response;
      let message = "";

      if (added.length > 0) {
        message += `${added.length} livre${added.length > 1 ? "s" : ""} ajouté${
          added.length > 1 ? "s" : ""
        } avec succès`;
      }
      if (duplicates.length > 0) {
        message += message
          ? ` • ${duplicates.length} doublon${
              duplicates.length > 1 ? "s" : ""
            } ignoré${duplicates.length > 1 ? "s" : ""}`
          : `${duplicates.length} doublon${
              duplicates.length > 1 ? "s" : ""
            } ignoré${duplicates.length > 1 ? "s" : ""}`;
      }
      if (errors.length > 0) {
        message += message
          ? ` • ${errors.length} erreur${errors.length > 1 ? "s" : ""}`
          : `${errors.length} erreur${errors.length > 1 ? "s" : ""}`;
      }

      setAddMessage({
        text: message || "Opération terminée",
        type: errors.length > 0 && added.length === 0 ? "error" : "success",
      });

      // Fermer la modale
      setShowBulkConfirmModal(false);
      setBulkScannedIsbns([]);
    } catch (error) {
      console.error("Erreur lors de l'ajout groupé:", error);
      setAddMessage({
        text: "Erreur lors de l'ajout des livres",
        type: "error",
      });
      setTimeout(() => setAddMessage(null), 5000);
    }
  };

  const handleBulkAddCancel = () => {
    setShowBulkConfirmModal(false);
    setBulkScannedIsbns([]);
  };

  const handleBulkAddToLibraries = async () => {
    if (!user || bulkLibrarySelection.length === 0) return;

    try {
      for (const isbn of selectedBooks) {
        const book = collectionBooks.find(b => b.isbn === isbn);
        if (!book) continue;

        const existingLibraries = book.libraries || [];
        const newLibraries = [...new Set([...existingLibraries, ...bulkLibrarySelection])];

        const updatedBook = {
          ...book,
          libraries: newLibraries
        };

        await updateBookInFirestore(updatedBook);
      }

      await fetchCollection(user.uid);

      setAddMessage({
        text: `${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ajouté${selectedBooks.length > 1 ? 's' : ''} à ${bulkLibrarySelection.length} bibliothèque${bulkLibrarySelection.length > 1 ? 's' : ''}`,
        type: "success"
      });

      setShowBulkLibraryModal(false);
      setBulkLibrarySelection([]);
      setSelectedBooks([]);
      setSelectionMode(false);

    } catch (error) {
      console.error("Erreur lors de l'ajout aux bibliothèques:", error);
      setAddMessage({
        text: "Erreur lors de l'ajout aux bibliothèques",
        type: "error"
      });
    }
  };

  const exportCollectionToCSV = (libraryId?: string) => {
    const booksToExport = libraryId
      ? collectionBooks.filter((book) => book.libraries?.includes(libraryId))
      : collectionBooks;

    const libraryName = libraryId
      ? userLibraries.find((lib) => lib.id === libraryId)?.name
      : null;

    if (booksToExport.length === 0) {
      setAddMessage({
        text: libraryId
          ? "Aucun livre dans cette bibliothèque"
          : "Aucun livre à exporter",
        type: "error",
      });
      setTimeout(() => setAddMessage(null), 3000);
      return;
    }

    // Fonction pour formater les dates
    const formatDate = (dateString: string) => {
      if (!dateString) return "";
      try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } catch {
        return dateString;
      }
    };

    // Calculer les statistiques
    const stats = {
      lu: 0,
      non_lu: 0,
      a_lire: 0,
      en_cours: 0,
      abandonne: 0,
    };

    booksToExport.forEach((book) => {
      const status = book.readingStatus || (book.isRead ? "lu" : "non_lu");
      stats[status as keyof typeof stats]++;
    });

    // Créer les métadonnées
    const now = new Date();
    const exportDate = formatDate(now.toISOString());
    const metadata = [
      "# Export Kodeks",
      `# Date: ${exportDate}`,
      `# Bibliothèque: ${libraryName || "Collection complète"}`,
      `# Nombre de livres: ${booksToExport.length}`,
      `# Statistiques: ${stats.lu} lu${stats.lu > 1 ? "s" : ""} | ${
        stats.a_lire
      } à lire | ${stats.en_cours} en cours | ${stats.non_lu} non lu${
        stats.non_lu > 1 ? "s" : ""
      } | ${stats.abandonne} abandonné${stats.abandonne > 1 ? "s" : ""}`,
      "#",
      "# ==========================================",
      "#",
    ];

    // Créer les en-têtes CSV
    const headers = [
      "ISBN",
      "Titre",
      "Auteurs",
      "Éditeur",
      "Date de publication",
      "Nombre de pages",
      "Catégories",
      "Statut de lecture",
      "Type de livre",
      "Note personnelle",
      "Bibliothèques",
      "Date d'ajout",
    ];

    // Convertir les livres en lignes CSV
    const rows = booksToExport.map((book) => {
      const status = book.readingStatus || (book.isRead ? "lu" : "non_lu");
      const statusLabels = {
        lu: "Lu",
        non_lu: "Non lu",
        a_lire: "À lire",
        en_cours: "En cours",
        abandonne: "Abandonné",
      };

      const typeLabels = {
        physique: "Physique",
        numerique: "Numérique",
        audio: "Audio",
      };

      const libraryNames = book.libraries
        ?.map((libId) => userLibraries.find((lib) => lib.id === libId)?.name)
        .filter(Boolean)
        .join("; ");

      return [
        book.isbn || "",
        book.title || "",
        book.authors?.join("; ") || "",
        book.publisher || "",
        book.publishedDate || "",
        book.pageCount?.toString() || "",
        book.categories?.join("; ") || "",
        statusLabels[status as keyof typeof statusLabels] || "",
        typeLabels[(book.bookType || "physique") as keyof typeof typeLabels] ||
          "",
        book.personalNote || "",
        libraryNames || "",
        formatDate(book.addedAt) || "",
      ];
    });

    // Échapper les champs contenant des virgules, guillemets ou retours à la ligne
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Construire le CSV
    const csvContent = [
      ...metadata,
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Créer le blob et télécharger
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename =
      libraryId && libraryName
        ? `kodeks-${libraryName.toLowerCase().replace(/\s+/g, "-")}-${
            new Date().toISOString().split("T")[0]
          }.csv`
        : `kodeks-collection-${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAddMessage({
      text:
        libraryId && libraryName
          ? `${booksToExport.length} livre${
              booksToExport.length > 1 ? "s" : ""
            } de "${libraryName}" exporté${booksToExport.length > 1 ? "s" : ""}`
          : `${booksToExport.length} livre${
              booksToExport.length > 1 ? "s" : ""
            } exporté${booksToExport.length > 1 ? "s" : ""}`,
      type: "success",
    });
    setTimeout(() => setAddMessage(null), 3000);
    setShowExportMenu(false); // Fermer le menu après export
  };

  const exportCollectionToPDF = async (libraryId?: string) => {
    const booksToExport = libraryId
      ? collectionBooks.filter((book) => book.libraries?.includes(libraryId))
      : collectionBooks;

    const libraryName = libraryId
      ? userLibraries.find((lib) => lib.id === libraryId)?.name
      : null;

    if (booksToExport.length === 0) {
      setAddMessage({
        text: libraryId
          ? "Aucun livre dans cette bibliothèque"
          : "Aucun livre à exporter",
        type: "error",
      });
      setTimeout(() => setAddMessage(null), 3000);
      return;
    }

    try {
      // Créer le document PDF en mode paysage (landscape) pour avoir plus d'espace
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Fonction pour formater les dates
      const formatDate = (dateString: string) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return dateString;
        }
      };

      // Calculer les statistiques
      const stats = {
        lu: 0,
        non_lu: 0,
        a_lire: 0,
        en_cours: 0,
        abandonne: 0,
      };

      booksToExport.forEach((book) => {
        const status = book.readingStatus || (book.isRead ? "lu" : "non_lu");
        if (status in stats) {
          stats[status as keyof typeof stats]++;
        }
      });

      const statusLabels: Record<string, string> = {
        lu: "Lu",
        non_lu: "Non lu",
        a_lire: "À lire",
        en_cours: "En cours",
        abandonne: "Abandonné",
      };

      const typeLabels: Record<string, string> = {
        physique: "Physique",
        numerique: "Numérique",
        audio: "Audio",
      };

      // Charger et ajouter le logo Kodeks
      const logoImg = new Image();
      logoImg.src = "/KodeksLogo.png";

      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          try {
            // Ajouter le logo en haut à gauche (30x30px)
            doc.addImage(logoImg, "PNG", 14, 10, 30, 30);
            resolve();
          } catch (error) {
            console.error("Erreur lors de l'ajout du logo:", error);
            resolve(); // Continuer même si le logo échoue
          }
        };
        logoImg.onerror = () => {
          console.warn("Logo non trouvé, continuation sans logo");
          resolve();
        };
      });

      // En-tête personnalisé
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Bleu #2563eb
      doc.setFont("helvetica", "bold");
      doc.text("Kodeks - Ma Collection", 50, 20);

      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // Gris #64748b
      doc.setFont("helvetica", "normal");

      const exportDateStr = formatDate(new Date().toISOString());
      doc.text(
        libraryName
          ? `Bibliothèque : ${libraryName}`
          : "Collection complète",
        50,
        28
      );
      doc.text(`Date d'export : ${exportDateStr}`, 50, 34);

      // Ligne séparatrice bleue
      doc.setDrawColor(37, 99, 235); // Bleu #2563eb
      doc.setLineWidth(0.5);
      doc.line(14, 42, 283, 42);

      // Statistiques
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // Gris foncé
      let statsText = `Total : ${booksToExport.length} livre${booksToExport.length > 1 ? "s" : ""}`;
      if (stats.lu > 0) statsText += ` | Lu : ${stats.lu}`;
      if (stats.non_lu > 0) statsText += ` | Non lu : ${stats.non_lu}`;
      if (stats.a_lire > 0) statsText += ` | À lire : ${stats.a_lire}`;
      if (stats.en_cours > 0) statsText += ` | En cours : ${stats.en_cours}`;
      if (stats.abandonne > 0) statsText += ` | Abandonné : ${stats.abandonne}`;

      doc.text(statsText, 14, 50);

      // Préparer les données du tableau avec TOUTES les colonnes
      const tableData = booksToExport.map((book) => {
        const status = book.readingStatus || (book.isRead ? "lu" : "non_lu");
        const libraryNames = book.libraries
          ?.map((libId) => userLibraries.find((lib) => lib.id === libId)?.name)
          .filter(Boolean)
          .join(", ");

        return [
          book.isbn || "-",
          book.title || "-",
          book.authors?.join(", ") || "-",
          book.publisher || "-",
          book.publishedDate || "-",
          book.pageCount?.toString() || "-",
          book.categories?.join(", ") || "-",
          statusLabels[status] || "-",
          typeLabels[book.bookType || "physique"] || "-",
          book.personalNote || "-",
          libraryNames || "-",
          formatDate(book.addedAt) || "-",
        ];
      });

      // Créer le tableau avec autoTable
      autoTable(doc, {
        head: [
          [
            "ISBN",
            "Titre",
            "Auteurs",
            "Éditeur",
            "Date pub.",
            "Pages",
            "Catégories",
            "Statut",
            "Type",
            "Note",
            "Bibliothèques",
            "Ajouté le",
          ],
        ],
        body: tableData,
        startY: 56,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
          textColor: [51, 65, 85], // Texte gris foncé
        },
        headStyles: {
          fillColor: [37, 99, 235], // Bleu #2563eb
          textColor: [255, 255, 255], // Texte blanc
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [241, 245, 249], // Gris très clair #f1f5f9
        },
        columnStyles: {
          0: { cellWidth: 20 }, // ISBN
          1: { cellWidth: 35 }, // Titre
          2: { cellWidth: 30 }, // Auteurs
          3: { cellWidth: 25 }, // Éditeur
          4: { cellWidth: 18 }, // Date pub
          5: { cellWidth: 12 }, // Pages
          6: { cellWidth: 25 }, // Catégories
          7: { cellWidth: 18 }, // Statut
          8: { cellWidth: 18 }, // Type
          9: { cellWidth: 25 }, // Note
          10: { cellWidth: 25 }, // Bibliothèques
          11: { cellWidth: 20 }, // Ajouté le
        },
        margin: { top: 56, left: 14, right: 14 },
      });

      const exportAttribution = "Généré par Kodeks - Développé par GregDev";
      const lastAutoTable = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
      const pageHeight = doc.internal.pageSize.getHeight();
      const attributionY = Math.min((lastAutoTable?.finalY ?? 56) + 6, pageHeight - 16);

      doc.setPage(doc.getNumberOfPages());
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Gris clair
      doc.text(exportAttribution, 14, attributionY);

      // Ajouter pied de page sur toutes les pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // Gris clair

        // Numéro de page au centre
        doc.text(
          `Page ${i} / ${totalPages}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );

        // Date de génération à droite
        doc.text(
          `Généré le ${exportDateStr}`,
          doc.internal.pageSize.getWidth() - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        );
      }

      // Nom du fichier
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = libraryName
        ? `kodeks-${libraryName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.pdf`
        : `kodeks-collection-${timestamp}.pdf`;

      // Sauvegarder le PDF
      doc.save(filename);

      setAddMessage({
        text:
          libraryId && libraryName
            ? `PDF "${libraryName}" exporté avec succès`
            : `PDF de la collection exporté avec succès`,
        type: "success",
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      setAddMessage({
        text: "Erreur lors de l'export PDF",
        type: "error",
      });
    }

    setTimeout(() => setAddMessage(null), 3000);
    setShowExportMenuPdf(false);
  };

  const handleManualSearchSelect = (
    book: GoogleBook,
    isInCollection: boolean
  ) => {
    if (isInCollection) return;

    setBook(book);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmDelete = window.confirm(
      "⚠️ ATTENTION : Cette action est irréversible.\n\n" +
        "Toutes vos données seront définitivement supprimées :\n" +
        "• Votre collection de livres\n" +
        "• Vos bibliothèques personnalisées\n" +
        "• Vos notes et paramètres\n" +
        "• Votre compte utilisateur\n\n" +
        "Êtes-vous absolument sûr de vouloir continuer ?"
    );

    if (!confirmDelete) return;

    const confirmDeleteFinal = window.confirm(
      "Dernière confirmation : Voulez-vous vraiment supprimer définitivement votre compte ?"
    );

    if (!confirmDeleteFinal) return;

    if (!requireOnline("la suppression du compte")) {
      return;
    }

    try {
      // 1. Supprimer tous les livres de la collection
      const collectionRef = collection(db, `users/${user.uid}/collection`);
      const booksSnapshot = await getDocs(collectionRef);
      const deletePromises = booksSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // 2. Supprimer le document utilisateur principal si existe
      const userDocRef = doc(db, `users/${user.uid}`);
      await deleteDoc(userDocRef).catch(() => {
        // Document peut ne pas exister, c'est OK
      });

      // 3. Supprimer le compte Firebase Auth
      await deleteUser(user);

      // 4. Afficher message de confirmation
      setAddMessage({
        text: "Votre compte a été supprimé avec succès",
        type: "success",
      });

      // 5. Fermer la modale
      setShowNotificationSettings(false);
    } catch (error) {
      console.error("Erreur lors de la suppression du compte:", error);
      setAddMessage({
        text: "Erreur lors de la suppression du compte. Veuillez réessayer ou nous contacter.",
        type: "error",
      });
    }
  };

  // Utilisation du hook de filtres
  const { filteredBooks: baseFilteredBooks, availableGenres } = useBookFilters(
    collectionBooks,
    filters
  );

  // Filtrage par bibliothèque sélectionnée
  const libraryFilteredBooks = selectedLibraryView
    ? baseFilteredBooks.filter((book) =>
        book.libraries?.includes(selectedLibraryView)
      )
    : baseFilteredBooks;

  // Filtrage par recherche textuelle
  const displayedBooks = collectionSearchQuery.trim()
    ? libraryFilteredBooks.filter((book) => {
        const query = collectionSearchQuery.toLowerCase();
        const titleMatch = book.title?.toLowerCase().includes(query);
        const authorMatch = book.authors?.some((author) =>
          author.toLowerCase().includes(query)
        );
        const isbnMatch = book.isbn?.toLowerCase().includes(query);
        return titleMatch || authorMatch || isbnMatch;
      })
    : libraryFilteredBooks;

  const collectionTotalPages = Math.max(
    1,
    Math.ceil(displayedBooks.length / collectionResultsPerPage)
  );
  const collectionStartIndex = (collectionPage - 1) * collectionResultsPerPage;
  const collectionPageBooks = displayedBooks.slice(
    collectionStartIndex,
    collectionStartIndex + collectionResultsPerPage
  );
  const collectionPageIsbns = collectionPageBooks.map((book) => book.isbn);
  const isPageFullySelected =
    collectionPageIsbns.length > 0 &&
    collectionPageIsbns.every((isbn) => selectedBooks.includes(isbn));

  useEffect(() => {
    setCollectionPage(1);
  }, [collectionSearchQuery, selectedLibraryView, filters]);

  useEffect(() => {
    if (collectionPage > collectionTotalPages) {
      setCollectionPage(collectionTotalPages);
    }
  }, [collectionPage, collectionTotalPages]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Annonces système */}
      <AnnouncementDisplay userEmail={user?.email} isAdmin={isAdmin} />

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              title="Retour à l'accueil"
            >
              <img
                src="/KodeksLogo.png"
                alt="Kodeks"
                className="h-8 w-8 sm:h-10 sm:w-10"
              />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                <span>Kodeks</span>
              </h1>
            </button>
            <nav className="flex-shrink-0">
              <div className="flex items-center gap-2">
                {isOffline && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                    Hors ligne
                  </span>
                )}
                {user ? (
                  <div className="flex items-center gap-1 sm:gap-4">
                    <button
                      onClick={() => setShowCollectionModal(true)}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span className="hidden lg:inline">Ma Collection</span>
                      <span className="lg:hidden">
                        <Books size={18} weight="bold" />
                      </span>
                      {collectionBooks.length > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                          {collectionBooks.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowLibraryManager(true)}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span className="hidden lg:inline">Bibliothèques</span>
                      <span className="lg:hidden">
                        <FolderOpen size={18} weight="bold" />
                      </span>
                      {userLibraries.length > 0 && (
                        <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                          {userLibraries.length}
                        </span>
                      )}
                    </button>
                    {isAdmin && (
                      <div className="relative">
                        <button
                          onClick={() => setShowAdminMenu(!showAdminMenu)}
                          className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          aria-expanded={showAdminMenu}
                          aria-controls="admin-menu"
                          aria-haspopup="menu"
                        >
                          <span className="hidden lg:inline">Admin</span>
                          <span className="lg:hidden">
                            <Megaphone size={18} weight="bold" />
                          </span>
                          <CaretDownIcon size={14} weight="bold" />
                        </button>
                        {showAdminMenu && (
                          <div
                            id="admin-menu"
                            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setShowAnnouncementManager(true);
                                  setShowAdminMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Megaphone size={16} />
                                Annonces
                              </button>
                              <button
                                onClick={() => {
                                  setShowUserManagement(true);
                                  setShowAdminMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <UsersThree size={16} />
                                Utilisateurs
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => setShowNotificationSettings(true)}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span className="hidden lg:inline">Notifications</span>
                      <span className="lg:hidden">
                        <Bell size={18} weight="bold" />
                      </span>
                    </button>
                    <span className="text-gray-600 text-xs sm:text-sm hidden md:block truncate max-w-24 lg:max-w-none">
                      Bonjour, {user.displayName}
                    </span>
                    <button
                      onClick={() => signOut(auth)}
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Se déconnecter"
                    >
                      <span className="hidden sm:inline">Se déconnecter</span>
                      <span className="sm:hidden">
                        <Door size={20} weight="bold" />
                      </span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <span className="hidden sm:inline">Se connecter</span>
                    <span className="sm:hidden">Connexion</span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Auth Message */}
      {authMessage && (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 pt-4">
          <div
            className={`p-3 rounded-lg text-sm font-medium text-center ${
              authMessage.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {authMessage.text}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">
            Découvrez et gérez votre collection de livres
          </h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Scannez, recherchez et organisez vos livres préférés en quelques
            clics
          </p>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8">
          {!scanning ? (
            <div className="flex flex-col items-center space-y-6">
              {/* Unified Search Bar */}
              <div className="w-full max-w-3xl">
                <UnifiedSearchBar
                  onSearch={(query, type) => {
                    if (type === 'isbn') {
                      handleSearch(query);
                    } else {
                      handleTextSearch(query);
                    }
                  }}
                  onScanClick={() => {
                    setScanMode("single");
                    setScanning(true);
                  }}
                  disabled={isOffline}
                />
              </div>

              {/* Boutons de scan */}
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button
                  onClick={() => {
                    setScanMode("single");
                    setScanning(true);
                  }}
                  className="flex-1 px-6 py-4 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera size={20} weight="bold" />
                  Scan unique
                </button>
                <button
                  onClick={() => {
                    setScanMode("batch");
                    setScanning(true);
                  }}
                  className="flex-1 px-6 py-4 text-base font-semibold text-gray-900 bg-green-300 rounded-lg hover:bg-green-400 transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Stack size={20} weight="bold" />
                  Scan par lot
                </button>
              </div>

              <p className="text-sm text-gray-600 text-center max-w-md">
                <strong>Scan unique</strong> : Scannez un livre et ajoutez-le
                immédiatement
                <br />
                <strong>Scan par lot</strong> : Scannez plusieurs livres puis
                validez en une fois
              </p>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 shadow-xl" role="status" aria-live="polite">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-center text-gray-600">
                      Chargement du scanner...
                    </p>
                  </div>
                </div>
              }
            >
              <ISBNScanner
                mode={scanMode}
                onDetected={scanMode === "single" ? handleDetected : undefined}
                onBulkScanComplete={
                  scanMode === "batch" ? handleBulkScanComplete : undefined
                }
                onClose={() => setScanning(false)}
                existingIsbns={existingIsbnsSet}
              />
            </Suspense>
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div
            id="search-results"
            className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                <Books size={20} weight="bold" className="inline mr-2" />
                Résultats de recherche{" "}
                {searchResults.length > 0 && `(${searchResults.length})`}
              </h3>
              <button
                onClick={() => {
                  setShowSearchResults(false);
                  setSearchResults([]);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={16} className="mr-1" /> Fermer
              </button>
            </div>

            {isSearching ? (
              <div className="text-center py-12">
                <div className="text-blue-600 mb-4">
                  <Hourglass size={48} weight="regular" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Recherche en cours...
                </h3>
                <p className="text-gray-600">
                  Interrogation de Google Books et OpenLibrary
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Books size={64} weight="regular" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun résultat
                </h3>
                <p className="text-gray-600">Essayez avec d'autres mots-clés</p>
              </div>
            ) : (
              <>
                {/* Pagination info */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                    <span>
                      Page {currentPage} sur {totalPages} •{" "}
                      {searchResults.length} résultat
                      {searchResults.length > 1 ? "s" : ""}
                    </span>
                    <span>
                      Affichage {startIndex + 1}-
                      {Math.min(
                        startIndex + resultsPerPage,
                        searchResults.length
                      )}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentResults.map((searchBook, index) => {
                    const isInCollection = searchBook.isbn
                      ? existingIsbnsSet.has(searchBook.isbn)
                      : false;

                    return (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all cursor-pointer relative hover:shadow-md"
                        onClick={() =>
                          handleManualSearchSelect(searchBook, isInCollection)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleManualSearchSelect(searchBook, isInCollection);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ouvrir ${searchBook.title}`}
                      >

                        <div className="text-center">
                          <div className="mb-3">
                            <img
                              src={
                                searchBook.imageLinks?.thumbnail ||
                                "/img/default-cover.png"
                              }
                              alt={searchBook.title}
                              className="w-16 h-24 object-cover mx-auto rounded"
                            />
                          </div>
                          <h4 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2">
                            {searchBook.title}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {searchBook.authors?.join(", ") || "Auteur inconnu"}
                          </p>
                          {searchBook.publishedDate && (
                            <p className="text-xs text-gray-500">
                              {searchBook.publishedDate}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Navigation */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      ← Précédent
                    </button>

                    <div className="flex gap-1">
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              currentPage === pageNum
                                ? "bg-green-600 text-white"
                                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Book Result */}
        {book && (
          <div
            data-book-preview
            className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8"
          >
            <div className="text-center">
              <BookCard
                title={book.title}
                authors={book.authors || []}
                isbn={book.isbn || ""}
                customCoverUrl={book.customCoverUrl}
                imageLinks={book.imageLinks}
              />
              <div className="mt-6">
                {user ? (
                  <>
                    <button
                      onClick={() => addToCollection()}
                      disabled={addingToCollection}
                      className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                      {addingToCollection ? (
                        <>
                          <Timer size={16} className="inline mr-2" />
                          Ajout en cours...
                        </>
                      ) : (
                        <>
                          <Download
                            size={16}
                            weight="bold"
                            className="inline mr-2"
                          />
                          Ajouter à ma collection
                        </>
                      )}
                    </button>

                    {addMessage && (
                      <div
                        className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                          addMessage.type === "success"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {addMessage.text}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    Se connecter pour ajouter
                  </button>
                )}

                {/* Encart informatif RGPD */}
                <div className="mt-8 text-xs text-gray-500 text-center max-w-2xl mx-auto">
                  <p>
                    Vos données sont stockées de manière sécurisée via Firebase
                    (Google). Consultez nos{" "}
                    <a
                      href="/mentions-legales"
                      className="underline hover:text-blue-600"
                    >
                      mentions légales
                    </a>{" "}
                    et notre{" "}
                    <a
                      href="/confidentialite"
                      className="underline hover:text-blue-600"
                    >
                      politique de confidentialité
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ajout manuel - Bouton direct */}
        {!scanning && (
          <div className="text-center mt-8 mb-6">
            <button
              onClick={() => setShowManualAdd(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-md cursor-pointer"
            >
              <PencilSimple size={20} weight="bold" />
              Ajouter un livre manuellement
            </button>
          </div>
        )}
      </main>

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 max-md:p-0">
          <div
            ref={collectionModalRef}
            className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col md:max-h-[90vh] md:rounded-lg max-md:rounded-none max-md:max-h-full max-md:h-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-modal-title"
          >
            {/* Header avec navigation */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/KodeksLogo.png"
                    alt="Kodeks"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                  />
                  <h2 id="collection-modal-title" className="text-2xl font-bold text-gray-900">
                    {/* <Books size={20} weight="bold" className="inline mr-2" /> */}
                    Ma Collection
                  </h2>
                </div>
                {selectedBook && (
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
                  >
                    ← Retour à la grille
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!selectedBook && collectionBooks.length > 0 && (
                  <div className="relative" data-export-menu>
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors cursor-pointer"
                      title="Exporter en CSV"
                      aria-expanded={showExportMenu}
                      aria-controls="export-menu"
                      aria-haspopup="menu"
                    >
                      <DownloadSimple size={18} weight="bold" />
                      <span className="hidden sm:inline">Exporter CSV</span>
                      <CaretDown
                        size={14}
                        weight="bold"
                        className={`transition-transform ${
                          showExportMenu ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown menu */}
                    {showExportMenu && (
                      <div
                        id="export-menu"
                        className="absolute right-0 mt-2 w-64 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fadeIn"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => exportCollectionToCSV()}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
                          >
                            <Books size={16} weight="bold" />
                            <div>
                              <div className="font-medium">
                                Toute la collection
                              </div>
                              <div className="text-xs text-gray-500">
                                {collectionBooks.length} livre
                                {collectionBooks.length > 1 && "s"}
                              </div>
                            </div>
                          </button>

                          {userLibraries.length > 0 && (
                            <>
                              <div className="h-px bg-gray-200 my-2" />
                              <div className="text-xs font-semibold text-gray-500 px-3 py-1">
                                Par bibliothèque
                              </div>
                              {userLibraries.map((library) => {
                                const bookCount = collectionBooks.filter(
                                  (book) => book.libraries?.includes(library.id)
                                ).length;
                                return (
                                  <button
                                    key={library.id}
                                    onClick={() =>
                                      exportCollectionToCSV(library.id)
                                    }
                                    disabled={bookCount === 0}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span>
                                      {renderLibraryIcon(
                                        library.icon || "BK",
                                        16
                                      )}
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {library.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {bookCount} livre{bookCount > 1 && "s"}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!selectedBook && collectionBooks.length > 0 && (
                  <div className="relative" data-export-menu-pdf>
                    <button
                      onClick={() => setShowExportMenuPdf(!showExportMenuPdf)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Exporter en PDF"
                      aria-expanded={showExportMenuPdf}
                      aria-controls="export-menu-pdf"
                      aria-haspopup="menu"
                    >
                      <FilePdf size={18} weight="bold" />
                      <span className="hidden sm:inline">Exporter PDF</span>
                      <CaretDown
                        size={14}
                        weight="bold"
                        className={`transition-transform ${
                          showExportMenuPdf ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown menu PDF */}
                    {showExportMenuPdf && (
                      <div
                        id="export-menu-pdf"
                        className="absolute right-0 mt-2 w-64 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fadeIn"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => exportCollectionToPDF()}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
                          >
                            <Books size={16} weight="bold" />
                            <div>
                              <div className="font-medium">
                                Toute la collection
                              </div>
                              <div className="text-xs text-gray-500">
                                {collectionBooks.length} livre
                                {collectionBooks.length > 1 && "s"}
                              </div>
                            </div>
                          </button>

                          {userLibraries.length > 0 && (
                            <>
                              <div className="h-px bg-gray-200 my-2" />
                              <div className="text-xs font-semibold text-gray-500 px-3 py-1">
                                Par bibliothèque
                              </div>
                              {userLibraries.map((library) => {
                                const bookCount = collectionBooks.filter(
                                  (book) => book.libraries?.includes(library.id)
                                ).length;
                                return (
                                  <button
                                    key={library.id}
                                    onClick={() =>
                                      exportCollectionToPDF(library.id)
                                    }
                                    disabled={bookCount === 0}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span>
                                      {renderLibraryIcon(
                                        library.icon || "BK",
                                        16
                                      )}
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {library.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {bookCount} livre{bookCount > 1 && "s"}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={closeCollectionModal}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all cursor-pointer"
                  aria-label="Fermer"
                >
                  <X size={24} weight="bold" />
                </button>
              </div>
            </div>

            {/* Navigation par bibliothèques */}
            {!selectedBook && userLibraries.length > 0 && (
              <div className="bg-gray-50 border-b px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium text-gray-900 text-sm">
                    <FolderOpen
                      size={16}
                      weight="regular"
                      className="inline mr-2"
                    />
                    Naviguer par bibliothèque :
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedLibraryView(null)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      selectedLibraryView === null
                        ? "bg-blue-600 text-white cursor-pointer"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 cursor-pointer"
                    }`}
                  >
                    Tous les livres ({collectionBooks.length})
                  </button>
                  {userLibraries.map((library) => {
                    const bookCount = collectionBooks.filter((book) =>
                      book.libraries?.includes(library.id)
                    ).length;
                    return (
                      <button
                        key={library.id}
                        onClick={() => setSelectedLibraryView(library.id)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 border ${
                          selectedLibraryView === library.id
                            ? "text-white border-transparent cursor-pointer"
                            : "bg-white text-gray-700 hover:bg-gray-100 border-gray-200 cursor-pointer"
                        }`}
                        style={
                          selectedLibraryView === library.id
                            ? { backgroundColor: library.color || "#3B82F6" }
                            : {}
                        }
                      >
                        <span>
                          {renderLibraryIcon(library.icon || "BK", 20)}
                        </span>
                        <span>
                          {library.name} ({bookCount})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contenu */}
            <div
              ref={collectionModalScrollRef}
              className="flex-1 overflow-y-auto p-6"
            >
              {collectionBooks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Books size={96} weight="regular" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucun livre pour le moment
                  </h3>
                  <p className="text-gray-600">
                    Commencez par scanner ou rechercher votre premier livre !
                  </p>
                </div>
              ) : selectedBook ? (
                /* Vue détaillée d'un livre */
                <div className="max-w-2xl mx-auto">
                  <CollectionBookCard
                    book={selectedBook}
                    onRemove={() => {
                      const confirmDelete = window.confirm(
                        `Êtes-vous sûr de vouloir supprimer "${selectedBook.title}" de votre collection ?\n\nCette action est irréversible.`
                      );
                      if (confirmDelete) {
                        removeFromCollection(selectedBook.isbn);
                        setSelectedBook(null);
                      }
                    }}
                    onToggleRead={() => {
                      toggleReadStatus(selectedBook.isbn);
                      // Mettre à jour selectedBook avec le nouveau statut
                      setSelectedBook({
                        ...selectedBook,
                        isRead: !selectedBook.isRead,
                      });
                    }}
                    onUpdateCover={(newCoverUrl) =>
                      updateBookCover(selectedBook.isbn, newCoverUrl)
                    }
                    onEdit={() => handleEditBook(selectedBook)}
                    onStatusChange={(status) =>
                      handleStatusChange(selectedBook.isbn, status)
                    }
                    onTypeChange={(type) =>
                      handleTypeChange(selectedBook.isbn, type)
                    }
                    userLibraries={userLibraries}
                    onLibraryToggle={(libraryId) =>
                      handleLibraryToggle(selectedBook.isbn, libraryId)
                    }
                  />
                </div>
              ) : (
                /* Vue grille compacte */
                <div>
                  {/* Barre de recherche textuelle */}
                  <div className="mb-4">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={collectionSearchQuery}
                        onChange={(e) =>
                          setCollectionSearchQuery(e.target.value)
                        }
                        placeholder="Rechercher par titre, auteur ou ISBN..."
                        className="w-full px-4 py-3 pl-11 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <MagnifyingGlass size={20} weight="bold" />
                      </div>
                      {collectionSearchQuery && (
                        <button
                          onClick={() => setCollectionSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          aria-label="Effacer la recherche"
                        >
                          <X size={20} weight="bold" />
                        </button>
                      )}
                    </div>
                    {collectionSearchQuery && (
                      <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                        <MagnifyingGlass size={14} weight="regular" />
                        {displayedBooks.length} résultat
                        {displayedBooks.length > 1 ? "s" : ""} pour "
                        {collectionSearchQuery}"
                      </p>
                    )}
                  </div>

                  {/* Panel de filtres */}
                  <FiltersPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableGenres={availableGenres}
                    bookCount={collectionBooks.length}
                    filteredCount={displayedBooks.length}
                    userLibraries={userLibraries}
                  />

                  <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <p className="text-gray-600">
                        {displayedBooks.length} livre
                        {displayedBooks.length > 1 ? "s" : ""} affiché
                        {displayedBooks.length > 1 ? "s" : ""}
                        {displayedBooks.length !== collectionBooks.length && (
                          <span className="text-gray-400">
                            {" "}
                            sur {collectionBooks.length}
                          </span>
                        )}
                      </p>
                      {!selectionMode && displayedBooks.length > 0 && (
                        <button
                          onClick={() => setSelectionMode(true)}
                          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <Check size={16} weight="bold" />
                          Sélectionner
                        </button>
                      )}
                    </div>
                    {!selectionMode && (
                      <div className="text-sm text-gray-500">
                        Cliquez sur un livre pour voir les détails
                      </div>
                    )}
                    {selectionMode && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {selectedBooks.length} sélectionné
                          {selectedBooks.length > 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => {
                            if (isPageFullySelected) {
                              setSelectedBooks((prev) =>
                                prev.filter(
                                  (isbn) => !collectionPageIsbns.includes(isbn)
                                )
                              );
                            } else {
                              setSelectedBooks((prev) =>
                                Array.from(
                                  new Set([...prev, ...collectionPageIsbns])
                                )
                              );
                            }
                          }}
                          className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {isPageFullySelected
                            ? "Tout désélectionner"
                            : "Tout sélectionner"}
                        </button>
                        <button
                          onClick={() => {
                            setSelectionMode(false);
                            setSelectedBooks([]);
                          }}
                          className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md cursor-pointer transition-colors"
                        >
                          Annuler
                        </button>
                        {selectedBooks.length > 0 && (
                          <button
                            onClick={() => setShowBulkDeleteModal(true)}
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white rounded-md cursor-pointer transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                          >
                            <Trash size={16} weight="bold" />
                            <span className="hidden xs:inline">
                              Supprimer ({selectedBooks.length})
                            </span>
                            <span className="inline xs:hidden">
                              ({selectedBooks.length})
                            </span>
                          </button>
                        )}
                        {selectedBooks.length > 0 && userLibraries.length > 0 && (
                          <button
                            onClick={() => setShowBulkLibraryModal(true)}
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                          >
                            <FolderOpen size={16} weight="bold" />
                            <span className="hidden sm:inline">
                              Ajouter à bibliothèque(s)
                            </span>
                            <span className="inline sm:hidden">
                              Bibliothèques
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {displayedBooks.length === 0 ? (
                    <div className="text-center py-8 md:py-12 px-4">
                      <div className="text-gray-400 mb-4">
                        <MagnifyingGlass size={64} weight="regular" />
                      </div>
                      <h3 className="text-xl md:text-lg font-semibold text-gray-900 mb-2">
                        Aucun livre ne correspond aux filtres
                      </h3>
                      <p className="text-gray-600 mb-6 md:mb-6">
                        Modifiez vos filtres ou ajoutez plus de livres à votre
                        collection
                      </p>
                      <button
                        onClick={() =>
                          setFilters({
                            readingStatus: [],
                            bookType: [],
                            genre: [],
                            yearRange: [null, null],
                            pageRange: [null, null],
                            authors: [],
                            favorites: null,
                            libraries: [],
                          })
                        }
                        className="inline-flex items-center gap-2 px-6 py-3 md:px-6 md:py-3 w-full md:w-auto bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer text-center justify-center"
                      >
                        <ArrowsClockwise
                          size={16}
                          weight="regular"
                          className="inline mr-2"
                        />
                        Réinitialiser tous les filtres
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-5">
                        {collectionPageBooks.map((item) => (
                          <CompactBookCard
                            key={item.isbn}
                            book={item}
                            onClick={() => {
                              if (!selectionMode) {
                                setSelectedBook(item);
                              } else {
                                setSelectedBooks((prev) =>
                                  prev.includes(item.isbn)
                                    ? prev.filter((isbn) => isbn !== item.isbn)
                                    : [...prev, item.isbn]
                                );
                              }
                            }}
                            onLongPress={() => {
                              if (!selectionMode) {
                                setSelectionMode(true);
                              }
                              setSelectedBooks((prev) =>
                                prev.includes(item.isbn)
                                  ? prev
                                  : [...prev, item.isbn]
                              );
                            }}
                            isSelected={selectedBooks.includes(item.isbn)}
                            selectionMode={selectionMode}
                            userLibraries={userLibraries}
                          />
                        ))}
                      </div>

                      {collectionTotalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t">
                          <button
                            onClick={() => setCollectionPage(collectionPage - 1)}
                            disabled={collectionPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            Précédent
                          </button>

                          <div className="flex gap-1">
                            {[...Array(Math.min(collectionTotalPages, 5))].map(
                              (_, i) => {
                                let pageNum;
                                if (collectionTotalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (collectionPage <= 3) {
                                  pageNum = i + 1;
                                } else if (
                                  collectionPage >= collectionTotalPages - 2
                                ) {
                                  pageNum = collectionTotalPages - 4 + i;
                                } else {
                                  pageNum = collectionPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCollectionPage(pageNum)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                      collectionPage === pageNum
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          <button
                            onClick={() => setCollectionPage(collectionPage + 1)}
                            disabled={collectionPage === collectionTotalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            Suivant
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Bouton Retour en haut pour la modale */}
              <ModalScrollToTop containerRef={collectionModalScrollRef} />
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 max-md:p-0">
          <div
            ref={authModalRef}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto md:max-h-[90vh] md:rounded-lg max-md:rounded-none max-md:max-h-full max-md:h-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <button
              onClick={closeAuthModal}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <X size={24} weight="bold" />
            </button>
            <div className="p-6">
              <Login onLogin={closeAuthModal} />
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 max-md:p-0">
          <div
            ref={manualAddModalRef}
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto md:max-h-[90vh] md:rounded-lg max-md:rounded-none max-md:max-h-full max-md:h-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-add-title"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 id="manual-add-title" className="text-2xl font-bold text-gray-900">
                <PencilSimple size={16} weight="regular" /> Ajouter un livre
                manuellement
              </h2>
              <button
                onClick={closeManualAdd}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all cursor-pointer"
                aria-label="Fermer"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonne gauche - Informations */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="manual-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Titre * (obligatoire)
                    </label>
                    <input
                      id="manual-title"
                      type="text"
                      value={manualBook.title}
                      onChange={(e) =>
                        setManualBook((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Titre du livre"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-authors" className="block text-sm font-medium text-gray-700 mb-2">
                      Auteur(s) (séparés par des virgules)
                    </label>
                    <input
                      id="manual-authors"
                      type="text"
                      value={manualBook.authors}
                      onChange={(e) =>
                        setManualBook((prev) => ({
                          ...prev,
                          authors: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Auteur 1, Auteur 2"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-publisher" className="block text-sm font-medium text-gray-700 mb-2">
                      Éditeur
                    </label>
                    <input
                      id="manual-publisher"
                      type="text"
                      value={manualBook.publisher}
                      onChange={(e) =>
                        setManualBook((prev) => ({
                          ...prev,
                          publisher: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Nom de l'éditeur"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-published-date" className="block text-sm font-medium text-gray-700 mb-2">
                        Année
                      </label>
                      <input
                        id="manual-published-date"
                        type="text"
                        value={manualBook.publishedDate}
                        onChange={(e) =>
                          setManualBook((prev) => ({
                            ...prev,
                            publishedDate: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="2024"
                      />
                    </div>

                    <div>
                      <label htmlFor="manual-page-count" className="block text-sm font-medium text-gray-700 mb-2">
                        Pages
                      </label>
                      <input
                        id="manual-page-count"
                        type="number"
                        value={manualBook.pageCount}
                        onChange={(e) =>
                          setManualBook((prev) => ({
                            ...prev,
                            pageCount: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="250"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="manual-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="manual-description"
                      value={manualBook.description}
                      onChange={(e) =>
                        setManualBook((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Résumé du livre..."
                    />
                  </div>
                </div>

                {/* Colonne droite - Couverture */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couverture personnalisée
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {manualBook.customCoverUrl ? (
                        <div className="relative">
                          <img
                            src={manualBook.customCoverUrl}
                            alt="Aperçu couverture"
                            className="w-32 h-48 object-cover mx-auto rounded"
                          />
                          <button
                            onClick={() =>
                              setManualBook((prev) => ({
                                ...prev,
                                customCoverUrl: "",
                              }))
                            }
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            aria-label="Supprimer la couverture"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-gray-400 mb-2">
                            <Books size={64} weight="regular" />
                          </div>
                          <p className="text-gray-600 text-sm mb-3">
                            Aucune couverture
                          </p>
                        </div>
                      )}

                      <label className="inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer transition-colors cursor-pointer">
                        {manualBook.customCoverUrl ? "Changer" : "Ajouter"} une
                        image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleManualCoverUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={closeManualAdd}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleManualBookSubmit}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors cursor-pointer"
                >
                  Créer le livre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {bookToEdit && (
        <EditBookModal
          book={bookToEdit}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setBookToEdit(null);
          }}
          onSave={handleSaveEditedBook}
          userLibraries={userLibraries}
          onCreateLibrary={createUserLibrary}
        />
      )}

      {/* Library Manager Modal */}
      <LibraryManager
        libraries={userLibraries}
        onCreateLibrary={createUserLibrary}
        onUpdateLibrary={updateUserLibrary}
        onDeleteLibrary={deleteUserLibrary}
        isOpen={showLibraryManager}
        onClose={() => setShowLibraryManager(false)}
      />

      {/* Announcement Manager Modal */}
      <AnnouncementManager
        isOpen={showAnnouncementManager}
        onClose={() => setShowAnnouncementManager(false)}
        currentUser={user ? { uid: user.uid, role: "admin" } : undefined}
      />

      {/* User Management Modal */}
      {showUserManagement && (
        <div
          ref={userManagementModalRef}
          className="fixed inset-0 bg-white z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-management-title"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 id="user-management-title" className="text-xl font-bold text-gray-900">
              Gestion des Utilisateurs
            </h2>
            <button
              onClick={closeUserManagementModal}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
          </div>
          <UserManagement />
        </div>
      )}

      {/* Post-Scan Confirmation Modal */}
      {showPostScanConfirm && scannedBookData && (
        <PostScanConfirm
          isbn={scannedBookData.isbn}
          title={scannedBookData.title}
          authors={scannedBookData.authors}
          publisher={scannedBookData.publisher}
          coverUrl={scannedBookData.coverUrl}
          onConfirm={handlePostScanConfirm}
          onCancel={handlePostScanCancel}
          userLibraries={userLibraries}
          selectedLibraries={selectedLibrariesForAdd}
          onLibrarySelectionChange={setSelectedLibrariesForAdd}
        />
      )}

      {/* Bulk Add Confirmation Modal */}
      <BulkAddConfirmModal
        isbns={bulkScannedIsbns}
        isOpen={showBulkConfirmModal}
        onConfirm={handleBulkAddConfirm}
        onCancel={handleBulkAddCancel}
        userLibraries={userLibraries}
      />

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={bulkDeleteModalRef}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-title"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Warning size={24} weight="bold" className="text-red-600" />
              </div>
              <div className="flex-1">
                <h2 id="bulk-delete-title" className="text-xl font-bold text-red-600 mb-2">
                  ⚠️ Supprimer définitivement ?
                </h2>
                <p className="text-gray-700">
                  Vous êtes sur le point de supprimer{" "}
                  <strong className="text-red-600">{selectedBooks.length}</strong> livre
                  {selectedBooks.length > 1 ? "s" : ""} de votre collection.
                </p>
                <p className="text-sm font-semibold text-red-600 mt-2">
                  Cette action est irréversible et ne peut pas être annulée.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeBulkDeleteModal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!user) return;

                    // Supprimer tous les livres sélectionnés
                    await Promise.all(
                      selectedBooks.map((isbn) =>
                        deleteDoc(doc(db, `users/${user.uid}/collection`, isbn))
                      )
                    );

                    // Recharger la collection
                    const collectionRef = collection(
                      db,
                      `users/${user.uid}/collection`
                    );
                    const snapshot = await getDocs(collectionRef);
                    const books = snapshot.docs.map(
                      (docSnap) => ({ ...docSnap.data() } as CollectionBook)
                    );
                    setCollectionBooks(books);

                    // Feedback
                    setAddMessage({
                      text: `${selectedBooks.length} livre${
                        selectedBooks.length > 1 ? "s" : ""
                      } supprimé${
                        selectedBooks.length > 1 ? "s" : ""
                      } avec succès`,
                      type: "success",
                    });

                    // Réinitialiser
                    setSelectedBooks([]);
                    setSelectionMode(false);
                    setShowBulkDeleteModal(false);
                  } catch (error) {
                    console.error(
                      "Erreur lors de la suppression groupée:",
                      error
                    );
                    setAddMessage({
                      text: "Erreur lors de la suppression des livres",
                      type: "error",
                    });
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash size={16} weight="bold" />
                Supprimer {selectedBooks.length} livre
                {selectedBooks.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add to Libraries Modal */}
      {showBulkLibraryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-library-title"
          >
            <h2 id="bulk-library-title" className="text-xl font-bold text-gray-900 mb-4">
              Ajouter à une ou plusieurs bibliothèques
            </h2>

            <p className="text-sm text-gray-600 mb-4">
              {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''} sélectionné{selectedBooks.length > 1 ? 's' : ''}
            </p>

            <div className="mb-6">
              <LibrarySelector
                libraries={userLibraries}
                selectedLibraries={bulkLibrarySelection}
                onSelectionChange={setBulkLibrarySelection}
                title="Sélectionnez les bibliothèques"
                emptyMessage="Aucune bibliothèque disponible"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkLibraryModal(false);
                  setBulkLibrarySelection([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkAddToLibraries}
                disabled={bulkLibrarySelection.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Ajouter à {bulkLibrarySelection.length} bibliothèque{bulkLibrarySelection.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Notifications + Gestion du compte) */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={settingsModalRef}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900">
                Paramètres
              </h2>
              <button
                onClick={closeSettingsModal}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all cursor-pointer"
                aria-label="Fermer"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Notifications */}
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell size={20} weight="bold" />
                Notifications
              </h3>
              <NotificationSettings
                userId={user?.uid || null}
                userName={user?.displayName}
                isAdmin={isAdmin}
              />
            </div>

            {/* Gestion du compte */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Warning size={20} weight="bold" className="text-red-600" />
                Gestion du compte
              </h3>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  Supprimer mon compte
                </h4>
                <p className="text-sm text-red-700 mb-4">
                  Cette action est irréversible. Toutes vos données (livres,
                  bibliothèques, notes) seront définitivement supprimées.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer"
                >
                  <Trash size={18} weight="bold" />
                  Supprimer définitivement mon compte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Toast Notification */}
      <Toast
        message={addMessage?.text || ""}
        type={addMessage?.type || "info"}
        isVisible={!!addMessage}
        onClose={() => setAddMessage(null)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
