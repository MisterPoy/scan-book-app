import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { enableMultiTabIndexedDbPersistence, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Erreur persistance Firebase:', error);
});

provider.setCustomParameters({ prompt: 'select_account' });

if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((error: { code?: string }) => {
    if (error.code === 'failed-precondition') {
      console.warn('Persistance Firestore désactivée : plusieurs onglets sont ouverts.');
    } else if (error.code === 'unimplemented') {
      console.warn("La persistance Firestore n'est pas prise en charge par ce navigateur.");
    } else {
      console.error('Erreur de persistance Firestore:', error);
    }
  });
}

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string,
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
};

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const resizeImage = (
  file: File,
  maxDimension = 480,
  initialQuality = 0.82,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const ratio = Math.min(1, maxDimension / image.width, maxDimension / image.height);
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);

      let quality = initialQuality;
      let encodedImage = canvas.toDataURL('image/jpeg', quality);
      while (encodedImage.length > 600_000 && quality > 0.45) {
        quality -= 0.08;
        encodedImage = canvas.toDataURL('image/jpeg', quality);
      }

      URL.revokeObjectURL(objectUrl);
      if (encodedImage.length > 700_000) {
        reject(new Error("L'image reste trop volumineuse après compression."));
        return;
      }
      resolve(encodedImage);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("L'image n'a pas pu être lue."));
    };
    image.src = objectUrl;
  });
