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

interface CollectionBook {
  isbn: string;
  title: string;
  authors: string[];
  addedAt: string;
  isRead: boolean;
}

// Composant vue compacte pour la grille
function CompactBookCard({ book, onClick, onToggleRead }: { book: CollectionBook; onClick: () => void; onToggleRead: () => void }) {
  const [coverSrc, setCoverSrc] = useState('');
  
  useEffect(() => {
    const testImage = new Image();
    const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-S.jpg`;
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
  }, [book.isbn]);

  return (
    <div 
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
    >
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
        <img 
          src={coverSrc} 
          alt={book.title}
          className="w-full h-full object-cover"
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
  );
}

// Composant vue détaillée (version actuelle)
function CollectionBookCard({ book, onRemove, onToggleRead }: { book: CollectionBook; onRemove: () => void; onToggleRead: () => void }) {
  const [coverSrc, setCoverSrc] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [bookDetails, setBookDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  useEffect(() => {
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
  }, [book.isbn]);

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

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
        <img 
          src={coverSrc} 
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        {/* Badge de lecture en overlay */}
        <button
          onClick={onToggleRead}
          className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full transition-all ${
            book.isRead 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title={book.isRead ? "Marquer comme non lu" : "Marquer comme lu"}
        >
          {book.isRead ? "✓ Lu" : "◯ Non lu"}
        </button>
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

  const addToCollection = async () => {
    if (!user || !book) return;
    
    setAddingToCollection(true);
    setAddMessage(null);
    
    try {
      const ref = doc(db, `users/${user.uid}/collection`, book.isbn);
      await setDoc(ref, {
        title: book.title,
        authors: book.authors || [],
        isbn: book.isbn,
        addedAt: new Date().toISOString(),
        isRead: false,
      });
      
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
            </div>
          ) : (
            <ISBNScanner 
              onDetected={handleDetected} 
              onClose={() => setScanning(false)}
            />
          )}
        </div>

        {/* Book Result */}
        {book && (
          <div className="bg-white rounded-xl shadow-md border p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center">
              <BookCard
                title={book.title}
                authors={book.authors}
                isbn={book.isbn}
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
                    onToggleRead={() => toggleReadStatus(selectedBook.isbn)}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
    </div>
  );
}

export default App;
