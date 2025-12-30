import { Link } from 'react-router-dom';
import { FileText, Shield, GithubLogo, LinkedinLogo, InstagramLogo, Globe } from 'phosphor-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: "Instagram",
      url: "https://www.instagram.com/gregdevweb/",
      icon: InstagramLogo,
      color: "hover:text-pink-600",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/",
      icon: LinkedinLogo,
      color: "hover:text-blue-600",
    },
    {
      name: "GitHub",
      url: "https://github.com/MisterPoy",
      icon: GithubLogo,
      color: "hover:text-gray-800",
    },
    {
      name: "Portfolio",
      url: "https://misterpoy.github.io/GregDev-PortFolio/",
      icon: Globe,
      color: "hover:text-green-600",
    },
  ];

  return (
    <footer className="mt-12 py-8 border-t-2 border-gray-200 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        {/* Crédits développeur */}
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-gray-700">
            Développé avec passion par{" "}
            <a
              href="https://misterpoy.github.io/GregDev-PortFolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              GregDev
            </a>
          </p>
        </div>

        {/* Liens sociaux */}
        <div className="flex justify-center gap-3 mb-6">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.name}
              className={`p-2.5 rounded-lg bg-white border-2 border-gray-200 text-gray-600 transition-all hover:scale-110 hover:shadow-md ${link.color}`}
              title={link.name}
            >
              <link.icon size={20} weight="bold" />
            </a>
          ))}
        </div>

        {/* Liens légaux */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-600 mb-4">
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

        {/* Copyright + Version */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {currentYear} Kodeks - Tous droits réservés
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Version 1.0.1 - PWA
          </p>
        </div>
      </div>
    </footer>
  );
}
