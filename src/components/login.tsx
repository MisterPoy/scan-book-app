// src/components/Login.tsx
import { useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth, provider, registerWithEmail, loginWithEmail, resetPassword } from "../firebase";
import { Key, Envelope } from "phosphor-react";
import type { User } from "firebase/auth";

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
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
      try {
        const result = await signInWithPopup(auth, provider);
        onLogin(result.user);
        return;
      } catch (err) {
        const error = err as { code?: string };
        const shouldFallbackToRedirect =
          isMobile ||
          error.code === "auth/popup-blocked" ||
          error.code === "auth/popup-closed-by-user" ||
          error.code === "auth/operation-not-supported-in-this-environment";

        if (shouldFallbackToRedirect) {
          await signInWithRedirect(auth, provider);
          return;
        }

        console.error("Erreur de connexion Google :", err);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
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
      setResetMessage("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.");
    } catch (err) {
      setError("Erreur : " + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">
          <Key size={16} weight="regular" className="inline mr-2" />
          Réinitialiser le mot de passe
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
          
          {error && <p className="text-red-500 text-sm mb-3" aria-live="polite">{error}</p>}
          {resetMessage && <p className="text-green-600 text-sm mb-3" aria-live="polite">{resetMessage}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-3"
          >
            {loading ? "Envoi en cours..." : (
              <>
                <Envelope size={16} weight="regular" className="inline mr-2" />
                Envoyer le lien
              </>
            )}
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
          className="w-full text-gray-600 hover:text-gray-800 text-sm cursor-pointer"
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
        {error && <p className="text-red-500 text-sm mb-2" aria-live="polite">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Chargement..." : (isRegister ? "S'inscrire" : "Se connecter")}
        </button>
      </form>

      {/* Texte de consentement RGPD - uniquement en mode inscription */}
      {isRegister && (
        <p className="text-xs text-gray-600 mt-3 mb-3 text-center">
          En créant un compte, vous acceptez la{" "}
          <a href="/confidentialite" target="_blank" className="underline text-blue-600">
            politique de confidentialité
          </a>{" "}
          et les{" "}
          <a href="/mentions-legales" target="_blank" className="underline text-blue-600">
            mentions légales
          </a>.
        </p>
      )}

      {/* Mot de passe oublié - seulement en mode connexion */}
      {!isRegister && (
        <p className="text-center mb-3">
          <button
            onClick={() => setShowResetForm(true)}
            className="text-blue-600 hover:underline text-sm cursor-pointer"
          >
            <Key size={16} weight="regular" className="inline mr-2" />
            Mot de passe oublié ?
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
          className="text-blue-600 hover:underline cursor-pointer"
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
        className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 cursor-pointer"
      >
        Se connecter avec Google
      </button>
    </div>
  );
}
