import { useEffect, useState } from "react";
import ISBNScanner from "./components/ISBNScanner";
import BookCard from "./components/BookCard";
import Login from "./components/login";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchCollection(u.uid);
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
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">📚 Ajoute un livre</h1>

      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <div className="mb-4 flex flex-col items-center gap-2">
          <p>Bienvenue, {user.displayName}</p>
          <button
            onClick={() => signOut(auth)}
            className="bg-red-500 text-white px-4 py-1 rounded"
          >
            Se déconnecter
          </button>
        </div>
      )}

      {!scanning ? (
        <button
          onClick={() => setScanning(true)}
          className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Scanner un livre
        </button>
      ) : (
        <ISBNScanner onDetected={handleDetected} />
      )}

      <input
        value={isbn}
        onChange={(e) => setIsbn(e.target.value)}
        placeholder="Entrer un ISBN manuellement"
        className="border p-2 rounded w-64 mb-2"
      />

      <button
        onClick={() => handleSearch(isbn)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Rechercher
      </button>

      {book && (
        <div className="mb-4">
          <BookCard
            title={book.title}
            authors={book.authors}
            isbn={book.isbn}
          />
          {user && (
            <button
              onClick={addToCollection}
              className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
            >
              📥 Ajouter à ma collection
            </button>
          )}
        </div>
      )}

      {user && collectionBooks.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold mt-8 mb-2">📚 Ma collection</h2>
          <ul className="list-disc pl-5">
            {collectionBooks.map((item) => (
              <li
                key={item.isbn}
                className="mb-1 flex justify-between items-center"
              >
                <span>
                  {item.title} – {item.authors?.join(", ")}
                </span>
                <button
                  onClick={() => removeFromCollection(item.isbn)}
                  className="ml-2 text-red-500 hover:text-red-700"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
