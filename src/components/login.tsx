// src/components/Login.tsx
import { useEffect } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth, provider } from "../firebase";

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth <= 768;

  // 🌀 Gérer le retour après redirection (mobile)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        console.log("🔄 Redirect result:", result);
        if (result?.user) {
          console.log("✅ Utilisateur trouvé:", result.user.displayName);
          onLogin(result.user);
        } else {
          console.log("ℹ️ Pas de résultat de redirection");
        }
      })
      .catch((err) => {
        console.error("❌ Erreur de redirection Google :", err);
      });
  }, [onLogin]);

  const handleLogin = async () => {
    try {
      if (isMobile) {
        console.log("📱 isMobile =", isMobile);
        // ✅ Sur mobile, redirection (plus fiable)
        await signInWithRedirect(auth, provider);
      } else {
        console.log("🪟 Tentative de popup...");
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
