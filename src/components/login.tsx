// src/components/Login.tsx
import { useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth, provider, registerWithEmail, loginWithEmail, resetPassword } from "../firebase";

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth <= 768;
  const [isRegister, setIsRegister] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // La gestion de redirection est maintenant dans App.tsx via onAuthStateChanged

  const handleGoogleLogin = async () => {
    try {
      const isChromeMobile = /Chrome/.test(navigator.userAgent) && isMobile;
      
      if (isChromeMobile) {
        console.log("📱 Chrome mobile - Forcer popup au lieu de redirect");
        try {
          const result = await signInWithPopup(auth, provider);
          console.log("✅ Chrome mobile popup success:", result.user.displayName);
          onLogin(result.user);
        } catch (popupErr) {
          console.log("❌ Popup échoué, fallback vers redirect:", popupErr);
          await signInWithRedirect(auth, provider);
        }
      } else if (isMobile) {
        console.log("📱 Autre mobile - redirect standard");
        await signInWithRedirect(auth, provider);
      } else {
        console.log("🪟 Desktop - popup standard");
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
        ? await registerWithEmail(email, password, displayName)
        : await loginWithEmail(email, password);
      
      onLogin(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetMessage("");
    
    try {
      await resetPassword(resetEmail);
      setResetMessage("📧 Email de réinitialisation envoyé ! Vérifiez votre boîte mail.");
    } catch (err: any) {
      setError("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">
          🔑 Réinitialiser le mot de passe
        </h2>
        <p className="text-gray-600 text-sm mb-4 text-center">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
        
        {/* Formulaire Reset */}
        <form onSubmit={handlePasswordReset} className="mb-4">
          <input
            type="email"
            placeholder="Votre adresse email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {resetMessage && <p className="text-green-600 text-sm mb-3">{resetMessage}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-3"
          >
            {loading ? "Envoi en cours..." : "📧 Envoyer le lien"}
          </button>
        </form>

        {/* Retour vers connexion */}
        <button
          onClick={() => {
            setShowResetForm(false);
            setError("");
            setResetMessage("");
            setResetEmail("");
          }}
          className="w-full text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {isRegister ? "Créer un compte" : "Se connecter"}
      </h2>
      
      {/* Formulaire Email/Password */}
      <form onSubmit={handleEmailAuth} className="mb-4">
        {isRegister && (
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Mot de passe oublié - seulement en mode connexion */}
      {!isRegister && (
        <p className="text-center mb-3">
          <button
            onClick={() => setShowResetForm(true)}
            className="text-blue-600 hover:underline text-sm"
          >
            🔑 Mot de passe oublié ?
          </button>
        </p>
      )}

      {/* Toggle Inscription/Connexion */}
      <p className="text-center mb-4">
        {isRegister ? "Déjà un compte ?" : "Pas encore de compte ? "}
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setDisplayName("");
          }}
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
