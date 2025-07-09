// src/components/Login.tsx
import { useEffect } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth, provider } from '../firebase';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 🌀 Gérer le retour après redirection (mobile)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          onLogin(result.user);
        }
      })
      .catch((err) => {
        console.error("Erreur de redirection Google :", err);
      });
  }, []);

  const handleLogin = async () => {
    try {
      if (isMobile) {
        // ✅ Sur mobile, redirection (plus fiable)
        await signInWithRedirect(auth, provider);
      } else {
        // ✅ Sur desktop, popup classique
        const result = await signInWithPopup(auth, provider);
        onLogin(result.user);
      }
    } catch (err) {
      console.error("Erreur de connexion Google :", err);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      Se connecter avec Google
    </button>
  );
}
