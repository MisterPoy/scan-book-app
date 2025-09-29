import { useState, useEffect } from 'react';
import {
  DeviceMobile,
  Desktop,
  Globe,
  CheckCircle,
  XCircle,
  Warning,
  Bell,
  Copy,
  Play
} from 'phosphor-react';
import { useNotifications } from '../hooks/useNotifications';
import { sendTestPushNotification } from '../services/messaging';

interface NotificationTestProps {
  userId: string | null;
}

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  timestamp?: string;
}

export default function NotificationTest({ userId }: NotificationTestProps) {
  const {
    supported,
    permission,
    enabled,
    token,
    enableNotifications,
    testNotification
  } = useNotifications(userId);

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    platform: string;
    browser: string;
    version: string;
    mobile: boolean;
  } | null>(null);

  useEffect(() => {
    // Détecter les informations de l'appareil et du navigateur
    const ua = navigator.userAgent;
    const mobile = /Mobi|Android/i.test(ua);

    let browser = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      const match = ua.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }

    const platform = navigator.platform || 'Unknown';

    setDeviceInfo({
      platform,
      browser,
      version,
      mobile
    });

    // Tests automatiques initiaux
    runInitialTests();
  }, [supported, permission, enabled]);

  const runInitialTests = () => {
    const results: TestResult[] = [];

    // Test 1: Support des notifications
    results.push({
      test: 'Support des notifications push',
      status: supported ? 'success' : 'error',
      message: supported
        ? 'Les notifications sont supportées par ce navigateur'
        : 'Ce navigateur ne supporte pas les notifications push',
      timestamp: new Date().toLocaleTimeString()
    });

    // Test 2: Permissions
    results.push({
      test: 'Permissions de notification',
      status: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
      message: permission === 'granted'
        ? 'Permissions accordées'
        : permission === 'denied'
        ? 'Permissions refusées - impossible d\'envoyer des notifications'
        : 'Permissions non demandées - cliquer sur "Activer" pour demander',
      timestamp: new Date().toLocaleTimeString()
    });

    // Test 3: Service Worker
    results.push({
      test: 'Service Worker',
      status: 'serviceWorker' in navigator ? 'success' : 'error',
      message: 'serviceWorker' in navigator
        ? 'Service Worker supporté'
        : 'Service Worker non supporté - les notifications en arrière-plan ne fonctionneront pas',
      timestamp: new Date().toLocaleTimeString()
    });

    // Test 4: HTTPS/Sécurité
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    results.push({
      test: 'Connexion sécurisée',
      status: isSecure ? 'success' : 'error',
      message: isSecure
        ? 'Connexion HTTPS - les notifications fonctionneront'
        : 'Connexion non sécurisée - les notifications peuvent ne pas fonctionner',
      timestamp: new Date().toLocaleTimeString()
    });

    setTestResults(results);
  };

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, { ...result, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testLocalNotification = () => {
    const success = testNotification();
    addTestResult({
      test: 'Notification locale',
      status: success ? 'success' : 'error',
      message: success
        ? 'Notification locale envoyée avec succès'
        : 'Échec envoi notification locale - vérifiez les permissions'
    });
  };

  const testPushNotification = async () => {
    if (!userId || !token) {
      addTestResult({
        test: 'Notification push',
        status: 'error',
        message: 'Token FCM manquant - assurez-vous que les notifications sont activées'
      });
      return;
    }

    setIsTestingPush(true);
    try {
      await sendTestPushNotification(userId);
      addTestResult({
        test: 'Notification push',
        status: 'success',
        message: 'Notification push envoyée avec succès'
      });
    } catch (error) {
      addTestResult({
        test: 'Notification push',
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur envoi notification push'
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  const copyDeviceInfo = () => {
    if (!deviceInfo) return;

    const info = [
      `Plateforme: ${deviceInfo.platform}`,
      `Navigateur: ${deviceInfo.browser} ${deviceInfo.version}`,
      `Mobile: ${deviceInfo.mobile ? 'Oui' : 'Non'}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Support notifications: ${supported ? 'Oui' : 'Non'}`,
      `Permissions: ${permission}`,
      `Token FCM: ${token ? 'Présent' : 'Absent'}`,
      `Service Worker: ${'serviceWorker' in navigator ? 'Supporté' : 'Non supporté'}`,
      `HTTPS: ${location.protocol === 'https:' ? 'Oui' : 'Non'}`
    ].join('\n');

    navigator.clipboard.writeText(info).then(() => {
      addTestResult({
        test: 'Copie informations',
        status: 'success',
        message: 'Informations de l\'appareil copiées dans le presse-papiers'
      });
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'error':
        return <XCircle size={16} className="text-red-600" />;
      case 'warning':
        return <Warning size={16} className="text-yellow-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Informations de l'appareil */}
      {deviceInfo && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {deviceInfo.mobile ? (
                <DeviceMobile size={24} className="text-blue-600" />
              ) : (
                <Desktop size={24} className="text-blue-600" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">Informations de l'appareil</h3>
            </div>
            <button
              onClick={copyDeviceInfo}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Copy size={16} />
              Copier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Plateforme:</span>
              <span className="ml-2 text-gray-900">{deviceInfo.platform}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Navigateur:</span>
              <span className="ml-2 text-gray-900">{deviceInfo.browser} {deviceInfo.version}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Type:</span>
              <span className="ml-2 text-gray-900">{deviceInfo.mobile ? 'Mobile' : 'Desktop'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">HTTPS:</span>
              <span className="ml-2 text-gray-900">{location.protocol === 'https:' ? 'Oui' : 'Non'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Boutons de test */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Play size={24} className="text-green-600" />
          Tests de notifications
        </h3>

        <div className="space-y-3">
          {!enabled ? (
            <button
              onClick={enableNotifications}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              1. Activer les notifications
            </button>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-green-800 font-medium">Notifications activées</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={testLocalNotification}
              disabled={!enabled}
              className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              2. Test notification locale
            </button>

            <button
              onClick={testPushNotification}
              disabled={!enabled || !userId || !token || isTestingPush}
              className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isTestingPush ? 'Test en cours...' : '3. Test notification push'}
            </button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <div>• La notification locale apparaît immédiatement sur cet appareil</div>
            <div>• La notification push teste le système complet via Firebase</div>
            <div>• Testez sur différents navigateurs et appareils pour valider la compatibilité</div>
          </div>
        </div>
      </div>

      {/* Résultats des tests */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe size={24} className="text-blue-600" />
          Résultats des tests
        </h3>

        <div className="space-y-3">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium text-gray-900">{result.test}</div>
                    <div className="text-sm text-gray-700 mt-1">{result.message}</div>
                  </div>
                </div>
                {result.timestamp && (
                  <div className="text-xs text-gray-500">{result.timestamp}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {testResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Les résultats des tests apparaîtront ici
          </div>
        )}
      </div>

      {/* Guide de test multi-appareils */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Guide de test multi-appareils</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div><strong>1. Desktop:</strong> Chrome, Firefox, Safari, Edge</div>
          <div><strong>2. Mobile:</strong> Chrome Mobile, Safari iOS, Firefox Mobile</div>
          <div><strong>3. Conditions:</strong> WiFi, données mobiles, mode avion → WiFi</div>
          <div><strong>4. États:</strong> App ouverte, app en arrière-plan, app fermée</div>
          <div><strong>5. Systèmes:</strong> Windows, macOS, Linux, Android, iOS</div>
        </div>
      </div>
    </div>
  );
}