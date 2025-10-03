import { Link } from 'react-router-dom';
import { FileText, Shield } from 'phosphor-react';

export default function Footer() {
  return (
    <footer className="mt-12 py-6 border-t border-gray-200 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-600">
          <Link
            to="/mentions-legales"
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <FileText size={16} weight="regular" />
            Mentions légales
          </Link>
          <span className="hidden md:inline text-gray-400">|</span>
          <Link
            to="/confidentialite"
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <Shield size={16} weight="regular" />
            Politique de confidentialité
          </Link>
        </div>
        <div className="text-center mt-3 text-xs text-gray-500">
          Kodeks - {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
