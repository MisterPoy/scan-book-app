import { useState, useEffect } from 'react';
import { Bell, BellSlash, Play, Warning, CheckCircle, TestTube } from 'phosphor-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationTest from './NotificationTest';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface NotificationSettingsProps {
  userId: string | null;
  userName?: string | null;
  isAdmin?: boolean;
}

export default function NotificationSettings({ userId, userName, isAdmin = false }: NotificationSettingsProps) {
  const [showTestPanel, setShowTestPanel] = useState(false);
  const testPanelRef = useFocusTrap<HTMLDivElement>(showTestPanel);

  useEffect(() => {
    if (!showTestPanel) return;
    const panel = testPanelRef.current;
    if (!panel) return;

    const handleCloseRequest = () => setShowTestPanel(false);
    panel.addEventListener('modal-close-request', handleCloseRequest);

    return () => {
      panel.removeEventListener('modal-close-request', handleCloseRequest);
    };
  }, [showTestPanel, testPanelRef]);

  const {
    supported,
    permission,
    enabled,
    loading,
    error,
    enableNotifications,
    disableNotifications,
    testNotification
  } = useNotifications(userId);

  if (!supported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <Warning size={20} />
          <div>
            <h4 className="font-medium">Notifications non supportées</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Votre navigateur ne supporte pas les notifications push.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { color: 'text-green-600', text: 'Autorisées' };
      case 'denied':
        return { color: 'text-red-600', text: 'Refusées' };
      default:
        return { color: 'text-gray-600', text: 'Non demandées' };
    }
  };

  const statusInfo = getPermissionStatus();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell size={24} weight="bold" className="text-blue-600" />
          ) : (
            <BellSlash size={24} weight="bold" className="text-gray-400" />
          )}
          <div>
            <h4 className="font-semibold text-gray-900">Notifications</h4>
            <p className="text-sm text-gray-600">
              Recevez des alertes pour les nouvelles annonces
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color} bg-opacity-10`}>
            {statusInfo.text}
          </span>
        </div>
      </div>

      {/* Status et contrôles */}
      <div className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <Warning size={16} className="text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">
              <strong>Erreur :</strong> {error}
            </div>
          </div>
        )}

        {enabled && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm text-green-700">
              Notifications actives pour {userName || 'votre compte'}
            </span>
          </div>
        )}

        {/* Boutons de contrôle */}
        <div className="flex flex-wrap gap-2">
          {!enabled ? (
            <button
              onClick={enableNotifications}
              disabled={loading || !userId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer flex items-center gap-2"
            >
              <Bell size={16} />
              {loading ? 'Activation...' : 'Activer les notifications'}
            </button>
          ) : (
            <button
              onClick={disableNotifications}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer flex items-center gap-2"
            >
              <BellSlash size={16} />
              {loading ? 'Désactivation...' : 'Désactiver'}
            </button>
          )}

          {enabled && isAdmin && (
            <>
              <button
                onClick={testNotification}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium cursor-pointer flex items-center gap-2"
              >
                <Play size={16} />
                Test rapide
              </button>

              <button
                onClick={() => setShowTestPanel(!showTestPanel)}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium cursor-pointer flex items-center gap-2"
              >
                <TestTube size={16} />
                Tests avancés
              </button>
            </>
          )}
        </div>

        {/* Informations supplémentaires */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Les notifications apparaissent même quand l'app est fermée</div>
          <div>• Vous pouvez modifier ces paramètres à tout moment</div>
          <div>• Les notifications sont uniquement pour les nouvelles annonces importantes</div>
        </div>
      </div>

      {/* Panneau de tests avancés */}
      {showTestPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={testPanelRef}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-tests-title"
          >
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 id="notification-tests-title" className="text-xl font-bold text-gray-900">
                Tests avancés de notifications
              </h2>
              <button
                onClick={() => setShowTestPanel(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <NotificationTest userId={userId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
