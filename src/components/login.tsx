// src/components/Login.tsx
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (err) {
      console.error("Erreur de connexion :", err);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="bg-green-600 text-white px-4 py-2 rounded"
    >
      Se connecter avec Google
    </button>
  );
}
