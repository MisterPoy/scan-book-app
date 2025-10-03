import { ArrowLeft, Buildings, Envelope, Globe } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';

export default function MentionsLegales() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        {/* Header avec bouton retour */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 cursor-pointer"
          >
            <ArrowLeft size={20} weight="bold" />
            Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mentions Légales</h1>
          <p className="text-gray-600 mt-2">Informations légales sur Kodeks</p>
        </div>

        {/* Contenu */}
        <div className="space-y-6 text-gray-700">
          {/* Éditeur de l'application */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Buildings size={24} weight="bold" />
              Éditeur de l'application
            </h2>
            <div className="pl-8 space-y-2">
              <p><strong>Nom de l'application :</strong> Kodeks</p>
              <p><strong>Responsable de publication :</strong> GregDev</p>
              <p className="flex items-center gap-2">
                <Envelope size={16} weight="bold" />
                <strong>Contact :</strong> <a href="mailto:gregory.poupaux@hotmail.fr" className="text-blue-600 underline">gregory.poupaux@hotmail.fr</a>
              </p>
            </div>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Globe size={24} weight="bold" />
              Hébergement
            </h2>
            <div className="pl-8 space-y-2">
              <p><strong>Frontend :</strong> Vercel Inc.</p>
              <p>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
              <p className="text-sm text-gray-600">Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">vercel.com</a></p>

              <p className="mt-4"><strong>Base de données :</strong> Firebase (Google LLC)</p>
              <p>1600 Amphitheatre Parkway, Mountain View, CA 94043, États-Unis</p>
              <p className="text-sm text-gray-600">Site web : <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">firebase.google.com</a></p>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Propriété intellectuelle</h2>
            <div className="pl-8 space-y-2">
              <p>L'ensemble du contenu de cette application (structure, textes, logos, icônes) est la propriété exclusive de son éditeur, sauf mention contraire.</p>
              <p>Toute reproduction, distribution ou utilisation sans autorisation préalable est interdite.</p>
              <p className="mt-4 text-sm text-gray-600">
                <strong>Icônes :</strong> Phosphor Icons (Licence MIT) - <a href="https://phosphoricons.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">phosphoricons.com</a>
              </p>
            </div>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Données personnelles</h2>
            <div className="pl-8 space-y-2">
              <p>Pour en savoir plus sur la collecte et le traitement de vos données personnelles, consultez notre <a href="/confidentialite" className="text-blue-600 underline font-medium">Politique de confidentialité</a>.</p>
            </div>
          </section>

          {/* Limitation de responsabilité */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Limitation de responsabilité</h2>
            <div className="pl-8 space-y-2">
              <p>Kodeks est fourni "tel quel" sans garantie d'aucune sorte.</p>
              <p>L'éditeur ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation de cette application.</p>
              <p>Les informations sur les livres proviennent de l'API Google Books et peuvent contenir des erreurs ou être incomplètes.</p>
            </div>
          </section>

          {/* Loi applicable */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Loi applicable</h2>
            <div className="pl-8 space-y-2">
              <p>Les présentes mentions légales sont régies par le droit français.</p>
              <p>En cas de litige, les tribunaux français seront seuls compétents.</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Dernière mise à jour : Octobre 2025
          </p>
        </div>
      </div>
    </div>
  );
}
