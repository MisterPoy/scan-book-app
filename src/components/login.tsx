// src/components/Login.tsx
import { useEffect, useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth, provider, registerWithEmail, loginWithEmail } from "../firebase";

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth <= 768;
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleGoogleLogin = async () => {
    try {
      if (isMobile) {
        console.log("📱 isMobile =", isMobile);
        await signInWithRedirect(auth, provider);
      } else {
        console.log("🪟 Tentative de popup...");
        const result = await signInWithPopup(auth, provider);
        onLogin(result.user);
      }
    } catch (err) {
      console.error("Erreur de connexion Google :", err);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const result = isRegister 
        ? await registerWithEmail(email, password)
        : await loginWithEmail(email, password);
      
      onLogin(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {isRegister ? "Créer un compte" : "Se connecter"}
      </h2>
      
      {/* Formulaire Email/Password */}
      <form onSubmit={handleEmailAuth} className="mb-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-2"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-2"
          required
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Chargement..." : (isRegister ? "S'inscrire" : "Se connecter")}
        </button>
      </form>

      {/* Toggle Inscription/Connexion */}
      <p className="text-center mb-4">
        {isRegister ? "Déjà un compte ?" : "Pas encore de compte ? "}
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="text-blue-600 hover:underline"
        >
          {isRegister ? "Se connecter" : "S'inscrire"}
        </button>
      </p>

      {/* Séparateur */}
      <div className="flex items-center mb-4">
        <hr className="flex-1" />
        <span className="px-2 text-gray-500">ou</span>
        <hr className="flex-1" />
      </div>

      {/* Connexion Google */}
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
      >
        Se connecter avec Google
      </button>
    </div>
  );
}
