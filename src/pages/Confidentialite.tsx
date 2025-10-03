import { ArrowLeft, Database, Eye, Shield, Trash, UserCircle } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';

export default function Confidentialite() {
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
          <h1 className="text-3xl font-bold text-gray-900">Politique de Confidentialité</h1>
          <p className="text-gray-600 mt-2">Protection de vos données personnelles</p>
        </div>

        {/* Contenu */}
        <div className="space-y-6 text-gray-700">
          {/* Introduction */}
          <section>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
              <p className="text-blue-900">
                <Shield size={20} weight="bold" className="inline mr-2" />
                Kodeks respecte votre vie privée et s'engage à protéger vos données personnelles conformément au RGPD.
              </p>
            </div>
          </section>

          {/* Données collectées */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Database size={24} weight="bold" />
              Données collectées
            </h2>
            <div className="pl-8 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Lors de la création de votre compte :</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Adresse email</li>
                  <li>Identifiant unique (UID) généré par Firebase</li>
                  <li>Nom d'utilisateur (optionnel)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Lors de l'utilisation de l'application :</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Informations sur vos livres (titre, auteur, ISBN, couverture)</li>
                  <li>Vos bibliothèques personnalisées</li>
                  <li>Notes personnelles sur les livres</li>
                  <li>Statut de lecture (lu/non lu)</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-green-900">
                  <strong>Nous ne collectons AUCUNE donnée de navigation, de géolocalisation ou de publicité.</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Finalité */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Eye size={24} weight="bold" />
              Finalité du traitement
            </h2>
            <div className="pl-8 space-y-2">
              <p>Vos données sont collectées uniquement pour :</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Créer et gérer votre compte utilisateur</li>
                <li>Sauvegarder votre collection de livres de manière sécurisée</li>
                <li>Synchroniser vos données entre vos différents appareils</li>
                <li>Vous permettre de gérer vos bibliothèques personnelles</li>
              </ul>
              <p className="mt-4 font-semibold text-gray-900">Nous ne faisons AUCUN marketing, AUCUNE revente de données, AUCUN profilage.</p>
            </div>
          </section>

          {/* Hébergement et sécurité */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield size={24} weight="bold" />
              Hébergement et sécurité
            </h2>
            <div className="pl-8 space-y-2">
              <p><strong>Base de données :</strong> Firebase Firestore (Google Cloud Platform)</p>
              <p><strong>Authentification :</strong> Firebase Authentication</p>
              <p><strong>Frontend :</strong> Vercel (CDN global)</p>

              <div className="mt-4 space-y-2">
                <p className="font-semibold">Mesures de sécurité :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Connexion chiffrée HTTPS</li>
                  <li>Authentification sécurisée par email/mot de passe</li>
                  <li>Règles de sécurité Firestore (accès strictement personnel)</li>
                  <li>Aucune donnée accessible publiquement</li>
                </ul>
              </div>

              <p className="mt-4 text-sm text-gray-600">
                Firebase est certifié conforme aux normes ISO 27001, SOC 2/3 et respecte le RGPD.
              </p>
            </div>
          </section>

          {/* Vos droits */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserCircle size={24} weight="bold" />
              Vos droits RGPD
            </h2>
            <div className="pl-8 space-y-3">
              <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Droit d'accès</h3>
                  <p className="text-sm">Vous pouvez consulter toutes vos données depuis l'application.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit de rectification</h3>
                  <p className="text-sm">Vous pouvez modifier vos informations à tout moment.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Trash size={18} weight="bold" />
                    Droit à l'effacement (droit à l'oubli)
                  </h3>
                  <p className="text-sm">Vous pouvez supprimer définitivement votre compte et toutes vos données depuis les paramètres de l'application.</p>
                  <p className="text-sm text-red-600 mt-1"><strong>Cette action est irréversible.</strong></p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit de portabilité</h3>
                  <p className="text-sm">Vous pouvez exporter vos données au format CSV depuis l'application.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Durée de conservation */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Durée de conservation</h2>
            <div className="pl-8 space-y-2">
              <p>Vos données sont conservées tant que votre compte est actif.</p>
              <p>En cas de suppression de compte, toutes vos données sont définitivement effacées de nos serveurs sous 30 jours.</p>
            </div>
          </section>

          {/* Partage avec des tiers */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Partage avec des tiers</h2>
            <div className="pl-8 space-y-2">
              <p className="font-semibold">Nous ne partageons JAMAIS vos données personnelles avec des tiers à des fins commerciales.</p>
              <p className="mt-2">Les seules données partagées sont :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Requêtes anonymisées vers l'API Google Books (recherche de métadonnées de livres par ISBN)</li>
                <li>Hébergement technique via Firebase et Vercel (sous-traitants conformes RGPD)</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Cookies et traceurs</h2>
            <div className="pl-8 space-y-2">
              <p>Kodeks utilise uniquement des cookies strictement nécessaires au fonctionnement :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Cookies d'authentification Firebase (session utilisateur)</li>
                <li>Stockage local pour le cache PWA (fonctionnement hors ligne)</li>
              </ul>
              <p className="mt-2 font-semibold">Aucun cookie publicitaire ou de traçage tiers n'est utilisé.</p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <div className="pl-8 space-y-2">
              <p>Pour toute question concernant vos données personnelles, vous pouvez nous contacter à :</p>
              <p className="text-blue-600 font-medium">
                <a href="mailto:gregory.poupaux@hotmail.fr" className="underline">gregory.poupaux@hotmail.fr</a>
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Modifications de cette politique</h2>
            <div className="pl-8 space-y-2">
              <p>Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment.</p>
              <p>En cas de modification importante, vous serez informé par email ou via une notification dans l'application.</p>
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
