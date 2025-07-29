import { useEffect, useState } from "react";
import ISBNScanner from "./components/ISBNScanner";
import BookCard from "./components/BookCard";
import Login from "./components/login";
import { auth, db } from "./firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { resizeImage } from "./firebase";

interface CollectionBook {
  isbn: string;
  title: string;
  authors: string[];
  addedAt: string;
  isRead: boolean;
  customCoverUrl?: string;
}

// Composant vue compacte pour la grille
function CompactBookCard({ book, onClick, onToggleRead }: { book: CollectionBook; onClick: () => void; onToggleRead: () => void }) {
  const [coverSrc, setCoverSrc] = useState('');
  
  useEffect(() => {
    // Si image personnalisée, l'utiliser en priorité
    if (book.customCoverUrl) {
      setCoverSrc(book.customCoverUrl);
      return;
    }

    const testImage = new Image();
    const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;
    const fallback = '/img/default-cover.png';

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

  return (
    <div 
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
    >
      {/* Desktop : Layout vertical */}
      <div className="hidden sm:block">
        <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
          <img 
            src={coverSrc} 
            alt={book.title}
            className="w-full h-full object-contain"
          />
          {/* Badge de lecture en overlay */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead();
            }}
            className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs font-medium rounded-full transition-all ${
              book.isRead 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            title={book.isRead ? "Marquer comme non lu" : "Marquer comme lu"}
          >
            {book.isRead ? "✓" : "◯"}
          </button>
        </div>
        <div className="p-2">
          <h3 className="font-semibold text-gray-900 text-xs mb-1 line-clamp-2 leading-tight">
            {book.title}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-1">
            {book.authors?.join(", ") || "Auteur inconnu"}
          </p>
        </div>
      </div>

      {/* Mobile : Layout horizontal */}
      <div className="flex sm:hidden items-center p-3 relative">
        <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 mr-3">
          <img 
            src={coverSrc} 
            alt={book.title}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
            {book.title}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-1">
            {book.authors?.join(", ") || "Auteur inconnu"}
          </p>
        </div>
        {/* Badge de lecture mobile avec texte */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead();
          }}
          className={`ml-2 px-2 py-1 text-xs font-medium rounded-md transition-all flex-shrink-0 ${
            book.isRead 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title={book.isRead ? "Marquer comme non lu" : "Marquer comme lu"}
        >
          {book.isRead ? "Lu" : "Non lu"}
        </button>
      </div>
    </div>
  );
}

// Composant vue détaillée (version actuelle)
function CollectionBookCard({ book, onRemove, onToggleRead, onUpdateCover }: { 
  book: CollectionBook; 
  onRemove: () => void; 
  onToggleRead: () => void; 
  onUpdateCover?: (newCoverUrl: string | null) => void;
}) {
  const [coverSrc, setCoverSrc] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [bookDetails, setBookDetails] = useState<any>(null);
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
    const fallback = '/img/default-cover.png';

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
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}`);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUpdateCover) return;

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB max
      alert('Le fichier doit faire moins de 5MB');
      return;
    }

    setUploadingCover(true);
    try {
      // Redimensionner et convertir en base64 (gratuit!)
      const base64Image = await resizeImage(file, 400, 0.8);
      onUpdateCover(base64Image);
    } catch (error) {
      console.error('Erreur traitement image:', error);
      alert('Erreur lors du traitement de l\'image');
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
          className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full transition-all ${
            book.isRead 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title={book.isRead ? "Marquer comme non lu" : "Marquer comme lu"}
        >
          {book.isRead ? "✓ Lu" : "◯ Non lu"}
        </button>

        {/* Boutons de gestion de couverture */}
        {onUpdateCover && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            <label className={`px-2 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
              uploadingCover 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}>
              {uploadingCover ? "⏳" : "📷"}
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
                className="px-2 py-1 text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 rounded transition-all"
                title="Restaurer l'image originale"
              >
                🔄
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
            Ajouté le {new Date(book.addedAt).toLocaleDateString('fr-FR')}
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleExpandToggle}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title={expanded ? "Masquer les détails" : "Voir les détails"}
            >
              {expanded ? "🔼" : "🔽"}
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Supprimer de la collection"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Collapse Details */}
        <div className={`overflow-hidden transition-all duration-300 ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="border-t pt-3 mt-2">
            {loadingDetails ? (
              <div className="text-center py-4">
                <div className="text-blue-600">⏳ Chargement des détails...</div>
              </div>
            ) : bookDetails ? (
              <div className="space-y-3">
                {bookDetails.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">📖 Résumé</h4>
                    <div className={`${
                      showFullDescription 
                        ? 'max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400' 
                        : 'max-h-none'
                    }`}>
                      <p className={`text-xs text-gray-600 leading-relaxed ${
                        showFullDescription ? '' : 'line-clamp-4'
                      }`}>
                        {bookDetails.description.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                    {bookDetails.description.length > 200 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-blue-600 hover:text-blue-700 text-xs mt-2 font-medium inline-flex items-center gap-1"
                      >
                        {showFullDescription ? (
                          <>📖 Lire moins</>
                        ) : (
                          <>📖 Lire plus</>
                        )}
                      </button>
                    )}
                  </div>
                )}
                
                {bookDetails.publishedDate && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">📅 Publication</h4>
                    <p className="text-xs text-gray-600">{bookDetails.publishedDate}</p>
                  </div>
                )}
                
                {bookDetails.publisher && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">🏢 Éditeur</h4>
                    <p className="text-xs text-gray-600">{bookDetails.publisher}</p>
                  </div>
                )}
                
                {bookDetails.pageCount && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">📄 Pages</h4>
                    <p className="text-xs text-gray-600">{bookDetails.pageCount} pages</p>
                  </div>
                )}
                
                {bookDetails.categories && bookDetails.categories.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-xs mb-1">🏷️ Catégories</h4>
                    <div className="flex flex-wrap gap-1">
                      {bookDetails.categories.slice(0, 3).map((category: string, index: number) => (
                        <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {category.split('/')[0]}
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

function App() {
  const [isbn, setIsbn] = useState("");
  const [book, setBook] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [collectionBooks, setCollectionBooks] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [addMessage, setAddMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [authMessage, setAuthMessage] = useState<{text: string, type: 'success' | 'info'} | null>(null);
  const [selectedBook, setSelectedBook] = useState<CollectionBook | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const resultsPerPage = 10;
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualBook, setManualBook] = useState({
    title: "",
    authors: "",
    publisher: "",
    publishedDate: "",
    description: "",
    pageCount: "",
    customCoverUrl: ""
  });

  const handleDetected = (code: string) => {
    setIsbn(code);
    setScanning(false);
    handleSearch(code);
  };

  const handleSearch = async (code: string) => {
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
    
    setIsSearching(true);
    setCurrentPage(1); // Reset à la première page
    let allBooks: any[] = [];
    
    try {
      // 1. Recherche Google Books
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`
      );
      const googleData = await googleRes.json();
      const googleBooks = googleData.items?.map((item: any) => ({
        ...item.volumeInfo,
        isbn: item.volumeInfo?.industryIdentifiers?.find((id: any) => 
          id.type === 'ISBN_13' || id.type === 'ISBN_10'
        )?.identifier || `temp_google_${Date.now()}_${Math.random()}`,
        source: 'Google Books'
      })) || [];
      
      allBooks = [...googleBooks];
      
      // 2. Si pas assez de résultats, essayer OpenLibrary
      if (allBooks.length < 5) {
        try {
          const openLibRes = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=40`
          );
          const openLibData = await openLibRes.json();
          const openLibBooks = openLibData.docs?.map((doc: any) => ({
            title: doc.title,
            authors: doc.author_name || [],
            publishedDate: doc.first_publish_year?.toString(),
            publisher: doc.publisher?.[0],
            isbn: doc.isbn?.[0] || `temp_openlib_${Date.now()}_${Math.random()}`,
            imageLinks: doc.cover_i ? {
              thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            } : undefined,
            source: 'Open Library'
          })).filter((book: any) => book.title) || [];
          
          // Éviter les doublons basés sur le titre et l'auteur
          const uniqueOpenLibBooks = openLibBooks.filter((olBook: any) => 
            !allBooks.some(gBook => 
              gBook.title?.toLowerCase() === olBook.title?.toLowerCase() &&
              gBook.authors?.[0]?.toLowerCase() === olBook.authors?.[0]?.toLowerCase()
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
  const currentResults = searchResults.slice(startIndex, startIndex + resultsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll vers le haut des résultats
    const resultsElement = document.getElementById('search-results');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleManualBookSubmit = () => {
    if (!manualBook.title.trim()) {
      alert("Le titre est obligatoire");
      return;
    }
    
    const book = {
      title: manualBook.title,
      authors: manualBook.authors ? manualBook.authors.split(',').map(a => a.trim()) : [],
      publisher: manualBook.publisher || undefined,
      publishedDate: manualBook.publishedDate || undefined,
      description: manualBook.description || undefined,
      pageCount: manualBook.pageCount ? parseInt(manualBook.pageCount) : undefined,
      isbn: `manual_${Date.now()}_${Math.random()}`,
      customCoverUrl: manualBook.customCoverUrl || undefined
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
      customCoverUrl: ""
    });
  };

  const handleManualCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier doit faire moins de 5MB');
      return;
    }

    try {
      const base64Image = await resizeImage(file, 400, 0.8);
      setManualBook(prev => ({ ...prev, customCoverUrl: base64Image }));
    } catch (error) {
      console.error('Erreur traitement image:', error);
      alert('Erreur lors du traitement de l\'image');
    }
  };

  const addToCollection = async () => {
    if (!user || !book) return;
    
    setAddingToCollection(true);
    setAddMessage(null);
    
    try {
      const ref = doc(db, `users/${user.uid}/collection`, book.isbn);
      const docData: any = {
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
      
      await setDoc(ref, docData);
      
      await fetchCollection(user.uid);
      
      setAddMessage({ text: "✅ Livre ajouté à votre collection !", type: 'success' });
      
      // Auto-fermeture après 2 secondes
      setTimeout(() => {
        setBook(null);
        setIsbn("");
        setAddMessage(null);
      }, 2000);
      
    } catch (err) {
      console.error("Erreur ajout Firestore:", err);
      setAddMessage({ text: "❌ Erreur lors de l'ajout du livre", type: 'error' });
    } finally {
      setAddingToCollection(false);
    }
  };

  const fetchCollection = async (uid: string) => {
    try {
      const snapshot = await getDocs(collection(db, `users/${uid}/collection`));
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCollectionBooks(list);
    } catch (err) {
      console.error("Erreur récupération collection:", err);
    }
  };

  useEffect(() => {
    const isChromeMobile = /Chrome/.test(navigator.userAgent) && 
      (/Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth <= 768);
    
    console.log("🔍 Chrome Mobile detected:", isChromeMobile);

    // 🌀 Gérer le retour de redirection avec retry pour Chrome mobile
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        console.log("🔄 App - Redirect result:", result);
        
        if (result?.user) {
          console.log("✅ App - Utilisateur trouvé via redirect:", result.user.displayName);
          return;
        }
        
        // Chrome mobile fallback - forcer la vérification de l'état auth
        if (isChromeMobile) {
          console.log("📱 Chrome mobile - Fallback avec multiple checks...");
          
          // Check immédiat
          setTimeout(() => {
            console.log("🔄 Chrome mobile check 1 - currentUser:", auth.currentUser);
            if (auth.currentUser) {
              console.log("✅ Chrome mobile success via currentUser!");
            }
          }, 100);
          
          // Check après 1 seconde
          setTimeout(() => {
            console.log("🔄 Chrome mobile check 2 - currentUser:", auth.currentUser);
            if (auth.currentUser) {
              console.log("✅ Chrome mobile success via currentUser (delayed)!");
            }
          }, 1000);
          
          // Check après 2 secondes
          setTimeout(() => {
            console.log("🔄 Chrome mobile check 3 - currentUser:", auth.currentUser);
            if (auth.currentUser) {
              console.log("✅ Chrome mobile success via currentUser (final)!");
            }
          }, 2000);
        }
      } catch (err) {
        console.error("❌ App - Erreur de redirection:", err);
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("🔄 Auth state changed:", u ? u.displayName : "Déconnecté");
      setUser(u);
      if (u) {
        console.log("📚 Récupération collection pour:", u.displayName);
        fetchCollection(u.uid);
        setAuthMessage({ text: `✅ Connecté en tant que ${u.displayName}`, type: 'success' });
        setTimeout(() => setAuthMessage(null), 3000);
      } else {
        setAuthMessage({ text: "👋 Vous êtes déconnecté", type: 'info' });
        setTimeout(() => setAuthMessage(null), 3000);
      }
    });
    
    return () => unsubscribe();
  }, []);

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
      const bookToUpdate = collectionBooks.find(book => book.isbn === isbn);
      if (!bookToUpdate) return;

      const ref = doc(db, `users/${user.uid}/collection`, isbn);
      await setDoc(ref, {
        ...bookToUpdate,
        isRead: !bookToUpdate.isRead
      });
      
      fetchCollection(user.uid);
    } catch (err) {
      console.error("Erreur mise à jour statut lecture:", err);
    }
  };

  const updateBookCover = async (isbn: string, newCoverUrl: string | null | undefined) => {
    if (!user) return;
    
    try {
      const bookToUpdate = collectionBooks.find(book => book.isbn === isbn);
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">📚 Ma Bibliothèque</h1>
            <nav className="flex-shrink-0">
              {user ? (
                <div className="flex items-center gap-1 sm:gap-4">
                  <button
                    onClick={() => setShowCollectionModal(true)}
                    className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 sm:gap-2"
                  >
                    <span className="hidden sm:inline">📚 Ma Collection</span>
                    <span className="sm:hidden">📚</span>
                    {collectionBooks.length > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                        {collectionBooks.length}
                      </span>
                    )}
                  </button>
                  <span className="text-gray-600 text-xs sm:text-sm hidden md:block truncate max-w-24 lg:max-w-none">
                    Bonjour, {user.displayName}
                  </span>
                  <button
                    onClick={() => signOut(auth)}
                    className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    title="Se déconnecter"
                  >
                    <span className="hidden sm:inline">Se déconnecter</span>
                    <span className="sm:hidden">🚪</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <span className="hidden sm:inline">Se connecter</span>
                  <span className="sm:hidden">Connexion</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Auth Message */}
      {authMessage && (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 pt-4">
          <div className={`p-3 rounded-lg text-sm font-medium text-center ${
            authMessage.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
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
            Scannez, recherchez et organisez vos livres préférés en quelques clics
          </p>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8">
          {!scanning ? (
            <div className="flex flex-col items-center space-y-6">
              <button
                onClick={() => setScanning(true)}
                className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                📷 Scanner un livre
              </button>
              
              <div className="flex items-center w-full max-w-sm">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-4 text-sm text-gray-500 bg-white">ou</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <input
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="Saisir un ISBN manuellement"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleSearch(isbn)}
                  className="px-6 py-3 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Rechercher
                </button>
              </div>

              <div className="flex items-center w-full max-w-sm mt-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-4 text-sm text-gray-500 bg-white">ou rechercher par titre/auteur</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre ou auteur..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isSearching) {
                      handleTextSearch(searchQuery);
                      setShowSearchResults(true);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    handleTextSearch(searchQuery);
                    setShowSearchResults(true);
                  }}
                  disabled={isSearching}
                  className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSearching ? "⏳ Recherche..." : "Rechercher"}
                </button>
              </div>

              <div className="flex items-center w-full max-w-sm mt-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-4 text-sm text-gray-500 bg-white">ou ajouter manuellement</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              <button
                onClick={() => setShowManualAdd(true)}
                className="px-8 py-3 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-md"
              >
                ✏️ Ajouter un livre manuellement
              </button>
            </div>
          ) : (
            <ISBNScanner 
              onDetected={handleDetected} 
              onClose={() => setScanning(false)}
            />
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div id="search-results" className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                📚 Résultats de recherche {searchResults.length > 0 && `(${searchResults.length})`}
              </h3>
              <button
                onClick={() => {
                  setShowSearchResults(false);
                  setSearchResults([]);
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ✕ Fermer
              </button>
            </div>

            {isSearching ? (
              <div className="text-center py-12">
                <div className="text-blue-600 text-4xl mb-4">⏳</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recherche en cours...</h3>
                <p className="text-gray-600">Interrogation de Google Books et OpenLibrary</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun résultat</h3>
                <p className="text-gray-600">Essayez avec d'autres mots-clés</p>
              </div>
            ) : (
              <>
                {/* Pagination info */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                    <span>
                      Page {currentPage} sur {totalPages} • {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                    </span>
                    <span>
                      Affichage {startIndex + 1}-{Math.min(startIndex + resultsPerPage, searchResults.length)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentResults.map((searchBook, index) => (
                <div
                  key={index}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setBook(searchBook);
                    setShowSearchResults(false);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                >
                  <div className="text-center">
                    <div className="mb-3">
                      <img
                        src={searchBook.imageLinks?.thumbnail || '/img/default-cover.png'}
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
                  ))}
                </div>

                {/* Pagination Navigation */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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
                                ? 'bg-green-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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
          <div className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center">
              <BookCard
                title={book.title}
                authors={book.authors}
                isbn={book.isbn}
                customCoverUrl={book.customCoverUrl}
                imageLinks={book.imageLinks}
              />
              <div className="mt-6">
                {user ? (
                  <>
                    <button
                      onClick={addToCollection}
                      disabled={addingToCollection}
                      className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                      {addingToCollection ? "⏳ Ajout en cours..." : "📥 Ajouter à ma collection"}
                    </button>
                    
                    {addMessage && (
                      <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                        addMessage.type === 'success' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
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
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header avec navigation */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">📚 Ma Collection</h2>
                {selectedBook && (
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    ← Retour à la grille
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setSelectedBook(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-6">
              {collectionBooks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun livre pour le moment</h3>
                  <p className="text-gray-600">Commencez par scanner ou rechercher votre premier livre !</p>
                </div>
              ) : selectedBook ? (
                /* Vue détaillée d'un livre */
                <div className="max-w-2xl mx-auto">
                  <CollectionBookCard
                    book={selectedBook}
                    onRemove={() => {
                      removeFromCollection(selectedBook.isbn);
                      setSelectedBook(null);
                    }}
                    onToggleRead={() => {
                      toggleReadStatus(selectedBook.isbn);
                      // Mettre à jour selectedBook avec le nouveau statut
                      setSelectedBook({...selectedBook, isRead: !selectedBook.isRead});
                    }}
                    onUpdateCover={(newCoverUrl) => updateBookCover(selectedBook.isbn, newCoverUrl)}
                  />
                </div>
              ) : (
                /* Vue grille compacte */
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-600">
                      {collectionBooks.length} livre{collectionBooks.length > 1 ? 's' : ''} dans votre collection
                    </p>
                    <div className="text-sm text-gray-500">
                      Cliquez sur un livre pour voir les détails
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {collectionBooks.map((item) => (
                      <CompactBookCard
                        key={item.isbn}
                        book={item}
                        onClick={() => setSelectedBook(item)}
                        onToggleRead={() => toggleReadStatus(item.isbn)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
            <div className="p-6">
              <Login onLogin={() => setShowAuthModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">✏️ Ajouter un livre manuellement</h2>
              <button
                onClick={() => {
                  setShowManualAdd(false);
                  setManualBook({
                    title: "",
                    authors: "",
                    publisher: "",
                    publishedDate: "",
                    description: "",
                    pageCount: "",
                    customCoverUrl: ""
                  });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonne gauche - Informations */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre * (obligatoire)
                    </label>
                    <input
                      type="text"
                      value={manualBook.title}
                      onChange={(e) => setManualBook(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Titre du livre"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auteur(s) (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      value={manualBook.authors}
                      onChange={(e) => setManualBook(prev => ({ ...prev, authors: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Auteur 1, Auteur 2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Éditeur
                    </label>
                    <input
                      type="text"
                      value={manualBook.publisher}
                      onChange={(e) => setManualBook(prev => ({ ...prev, publisher: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Nom de l'éditeur"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Année
                      </label>
                      <input
                        type="text"
                        value={manualBook.publishedDate}
                        onChange={(e) => setManualBook(prev => ({ ...prev, publishedDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="2024"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pages
                      </label>
                      <input
                        type="number"
                        value={manualBook.pageCount}
                        onChange={(e) => setManualBook(prev => ({ ...prev, pageCount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="250"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={manualBook.description}
                      onChange={(e) => setManualBook(prev => ({ ...prev, description: e.target.value }))}
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
                            onClick={() => setManualBook(prev => ({ ...prev, customCoverUrl: "" }))}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-gray-400 text-4xl mb-2">📚</div>
                          <p className="text-gray-600 text-sm mb-3">Aucune couverture</p>
                        </div>
                      )}
                      
                      <label className="inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer transition-colors">
                        {manualBook.customCoverUrl ? "Changer" : "Ajouter"} une image
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
                  onClick={() => {
                    setShowManualAdd(false);
                    setManualBook({
                      title: "",
                      authors: "",
                      publisher: "",
                      publishedDate: "",
                      description: "",
                      pageCount: "",
                      customCoverUrl: ""
                    });
                  }}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleManualBookSubmit}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Créer le livre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
