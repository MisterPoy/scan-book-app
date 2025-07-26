import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';



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
export const storage = getStorage(app);

// Fonctions d'authentification
export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
};

export const loginWithEmail = (email: string, password: string) => 
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) => 
  sendPasswordResetEmail(auth, email);

// Fonctions de gestion des images personnalisées
export const uploadCustomCover = async (file: File, userId: string, isbn: string): Promise<string> => {
  const storageRef = ref(storage, `covers/${userId}/${isbn}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const deleteCustomCover = async (userId: string, isbn: string): Promise<void> => {
  const storageRef = ref(storage, `covers/${userId}/${isbn}`);
  await deleteObject(storageRef);
};
