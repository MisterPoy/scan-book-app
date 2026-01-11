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
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';



const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);

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

if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    const error = err as { code?: string };
    if (error.code === 'failed-precondition') {
      console.warn('Firestore persistence disabled: multiple tabs open');
    } else if (error.code === 'unimplemented') {
      console.warn('Firestore persistence not supported by this browser');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });
}
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

// Fonctions de gestion des images personnalisées (base64 - gratuit!)
export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const resizeImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculer les nouvelles dimensions en gardant le ratio
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Dessiner l'image redimensionnée
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convertir en base64 avec compression
      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Nouvelle fonction pour uploader vers Firebase Storage
export const uploadImageToStorage = async (file: File, userId: string): Promise<string> => {
  // Redimensionner d'abord l'image
  const resizedBase64 = await resizeImage(file, 400, 0.8);

  // Convertir base64 en blob
  const response = await fetch(resizedBase64);
  const blob = await response.blob();

  // Créer une référence unique dans Firebase Storage
  const timestamp = Date.now();
  const storageRef = ref(storage, `covers/${userId}/${timestamp}.jpg`);

  // Uploader le fichier
  await uploadBytes(storageRef, blob);

  // Récupérer l'URL de téléchargement
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};
