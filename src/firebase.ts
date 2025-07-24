import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';



const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Force la persistance locale (important pour Chrome mobile)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Erreur persistance Firebase:', error);
});

export const provider = new GoogleAuthProvider();

// Configuration pour mobile
provider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);

// Fonctions d'authentification
export const registerWithEmail = (email: string, password: string) => 
  createUserWithEmailAndPassword(auth, email, password);

export const loginWithEmail = (email: string, password: string) => 
  signInWithEmailAndPassword(auth, email, password);
