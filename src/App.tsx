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

function App() {
  const [isbn, setIsbn] = useState("");
  const [book, setBook] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [collectionBooks, setCollectionBooks] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    try {
      const ref = doc(db, `users/${user.uid}/collection`, book.isbn);
      await setDoc(ref, {
        title: book.title,
        authors: book.authors || [],
        isbn: book.isbn,
        addedAt: new Date().toISOString(),
      });
      fetchCollection(user.uid);
    } catch (err) {
      console.error("Erreur ajout Firestore:", err);
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
      }
    });
    
    return () => unsubscribe();
  }, []);

  const removeFromCollection = async (isbn: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/collection`, isbn));
      fetchCollection(user.uid); // refresh la liste
    } catch (err) {
      console.error("Erreur suppression Firestore:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">📚 Ma Bibliothèque</h1>
            <nav>
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 text-sm">Bonjour, {user.displayName}</span>
                  <button
                    onClick={() => signOut(auth)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Se connecter
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Découvrez et gérez votre collection de livres
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Scannez, recherchez et organisez vos livres préférés en quelques clics
          </p>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-xl shadow-md border p-8 mb-8">
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
          <div className="bg-white rounded-xl shadow-md border p-8 mb-8">
            <div className="text-center">
              <BookCard
                title={book.title}
                authors={book.authors}
                isbn={book.isbn}
              />
              <div className="mt-6">
                {user ? (
                  <button
                    onClick={addToCollection}
                    className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    📥 Ajouter à ma collection
                  </button>
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

        {/* Collection */}
        {user && collectionBooks.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">📚 Ma Collection</h2>
            <div className="space-y-4">
              {collectionBooks.map((item) => (
                <div
                  key={item.isbn}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.authors?.join(", ")}</p>
                  </div>
                  <button
                    onClick={() => removeFromCollection(item.isbn)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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
