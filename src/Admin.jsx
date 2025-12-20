import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { availableLanguages } from './languages';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('server');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Server Settings State
  const [serverSettings, setServerSettings] = useState({
    serverUrl: '',
    port: '',
    accessCode: '',
    apiKey: '',
    defaultLanguage: 'tr'
  });

  // User Lines State
  const [userLines, setUserLines] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminServerSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Ensure defaultLanguage exists
      if (!parsed.defaultLanguage) {
        parsed.defaultLanguage = 'tr';
      }
      setServerSettings(parsed);
    }
  }, []);

  // Load users when switching to users tab and settings exist
  useEffect(() => {
    if (activeTab === 'users' && serverSettings.serverUrl && serverSettings.accessCode && serverSettings.apiKey) {
      loadUsersFromAPI();
    }
  }, [activeTab]);

  // Build API URL - Format: {protocol}://{server}:{port}/{accessCode}/
  const buildApiUrl = () => {
    const { serverUrl, port, accessCode } = serverSettings;

    // In development, use proxy to avoid CORS issues
    if (import.meta.env.DEV) {
      // Use local proxy: /api/{accessCode}/
      return `/api/${accessCode}/`;
    }

    // In production, check for proxy needs
    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    // Support relative URLs (starting with /) for proxy setup
    if (baseUrl.startsWith('/')) {
      // Relative URL - use as-is for proxy
      return `${baseUrl}/${accessCode}/`;
    }

    // Add protocol if missing
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    // AUTOMATIC PROXY: If site is HTTPS but server is HTTP, use /api/ proxy
    const isPageHttps = window.location.protocol === 'https:';
    const isServerHttp = baseUrl.startsWith('http://');

    if (isPageHttps && isServerHttp) {
      // Use proxy to avoid Mixed Content error
      console.log('🔒 HTTPS detected - using /api/ proxy for HTTP server');
      return `/api/${accessCode}/`;
    }

    // Build full URL
    const fullUrl = port ? `${baseUrl}:${port}/${accessCode}/` : `${baseUrl}/${accessCode}/`;
    return fullUrl;
  };

  // Save Server Settings
  const handleSaveServerSettings = () => {
    if (!serverSettings.serverUrl || !serverSettings.accessCode || !serverSettings.apiKey) {
      alert('Bitte alle Felder ausfüllen!');
      return;
    }
    localStorage.setItem('adminServerSettings', JSON.stringify(serverSettings));
    setConnectionStatus({ type: 'success', message: 'Server-Einstellungen gespeichert!' });
    setTimeout(() => setConnectionStatus(null), 3000);
  };

  // Save Settings (Language)
  const handleSaveSettings = () => {
    localStorage.setItem('adminServerSettings', JSON.stringify(serverSettings));
    setConnectionStatus({ type: 'success', message: '✓ Einstellungen gespeichert!' });
    setTimeout(() => setConnectionStatus(null), 3000);
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!serverSettings.serverUrl || !serverSettings.accessCode || !serverSettings.apiKey) {
      alert('Bitte alle Felder ausfüllen!');
      return;
    }

    setIsLoading(true);
    setConnectionStatus(null);

    try {
      const apiUrl = buildApiUrl();

      // XuiOne API Test Endpoint - Format: {url}?api_key={key}&action={action}
      const response = await axios.get(apiUrl, {
        params: {
          api_key: serverSettings.apiKey,
          action: 'get_users'
        },
        timeout: 10000
      });

      console.log('API Response:', response.data);

      if (response.data && response.data.status === 'STATUS_SUCCESS') {
        setConnectionStatus({
          type: 'success',
          message: `✓ Verbindung erfolgreich! Server ist erreichbar. (${response.data.recordsTotal || 0} Administratoren gefunden)`
        });

        // Automatically switch to users tab and load users after successful connection
        setTimeout(() => {
          setActiveTab('users');
          setTimeout(() => {
            loadUsersFromAPI();
          }, 100);
        }, 1000);
      } else if (response.data && response.data.status === 'STATUS_FAILURE') {
        setConnectionStatus({
          type: 'error',
          message: `✗ Verbindung fehlgeschlagen: ${response.data.error || 'Unbekannter Fehler'}`
        });
      } else {
        setConnectionStatus({
          type: 'error',
          message: '✗ Verbindung fehlgeschlagen: Ungültige Antwort vom Server'
        });
      }
    } catch (error) {
      let errorMessage = 'Verbindungsfehler: ';
      if (error.response) {
        errorMessage += `Server antwortete mit Status ${error.response.status}`;
      } else if (error.request) {
        errorMessage += 'Keine Antwort vom Server. Bitte URL und Port prüfen.';
      } else {
        errorMessage += error.message;
      }

      setConnectionStatus({
        type: 'error',
        message: '✗ ' + errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load Users from API
  const loadUsersFromAPI = async () => {
    if (!serverSettings.serverUrl || !serverSettings.accessCode || !serverSettings.apiKey) {
      alert('Bitte zuerst Server-Einstellungen konfigurieren und speichern!');
      return;
    }

    setIsLoadingUsers(true);

    try {
      const apiUrl = buildApiUrl();

      // XuiOne API Get Lines - Format: {url}?api_key={key}&action={action}
      const response = await axios.get(apiUrl, {
        params: {
          api_key: serverSettings.apiKey,
          action: 'get_lines'
        },
        timeout: 15000
      });

      console.log('Lines API Response:', response.data);

      if (response.data && response.data.status === 'STATUS_SUCCESS' && response.data.data) {
        // Transform API data to our format
        const users = response.data.data.map(user => ({
          id: user.id,
          username: user.username,
          password: user.password,
          maxConnections: parseInt(user.max_connections) || 1,
          expiryDate: user.exp_date,
          status: user.enabled === '1' ? 'active' : 'inactive',
          createdAt: user.created_at || new Date().toISOString(),
          activeConnections: parseInt(user.active_connections) || 0,
          isTrial: user.is_trial === '1',
          isRestreamer: user.is_restreamer === '1',
          ownerName: user.owner_name,
          adminNotes: user.admin_notes,
          resellerNotes: user.reseller_notes
        }));

        setUserLines(users);
      } else if (response.data && response.data.status === 'STATUS_FAILURE') {
        alert(`Fehler beim Laden: ${response.data.error || 'Unbekannter Fehler'}`);
      } else {
        alert('Keine Benutzer gefunden oder ungültiges Datenformat');
      }
    } catch (error) {
      let errorMessage = 'Fehler beim Laden der Benutzer: ';
      if (error.response) {
        errorMessage += `Server antwortete mit Status ${error.response.status}`;
      } else if (error.request) {
        errorMessage += 'Keine Antwort vom Server';
      } else {
        errorMessage += error.message;
      }
      alert(errorMessage);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] overflow-hidden">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-500/20 to-orange-600/20 border border-red-500/30 rounded-xl p-6 mb-4">
        <h1 className="text-3xl font-bold flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
          <span className="text-4xl mr-3">⚙️</span>
          Admin Panel
        </h1>
        <p className="text-slate-400 mt-2">Server-Einstellungen und Benutzer-Verwaltung</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('server')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'server'
              ? 'bg-red-500/20 text-white border border-red-500/30'
              : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          🖥️ Server-Einstellungen
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'users'
              ? 'bg-red-500/20 text-white border border-red-500/30'
              : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          👥 Benutzer-Lines ({userLines.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'settings'
              ? 'bg-red-500/20 text-white border border-red-500/30'
              : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          ⚙️ Einstellungen
        </button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {activeTab === 'server' ? (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <span className="text-2xl mr-2">🌐</span>
              XuiOne Panel-Verbindung
            </h2>

            <div className="space-y-4 max-w-2xl">
              {/* Server URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Server-URL / IP-Adresse
                </label>
                <input
                  type="text"
                  value={serverSettings.serverUrl}
                  onChange={(e) => setServerSettings({...serverSettings, serverUrl: e.target.value})}
                  placeholder="z.B. http://example.com oder 192.168.1.100"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Port
                </label>
                <input
                  type="text"
                  value={serverSettings.port}
                  onChange={(e) => setServerSettings({...serverSettings, port: e.target.value})}
                  placeholder="z.B. 8080, 25461"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                />
              </div>

              {/* Access Code */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={serverSettings.accessCode}
                  onChange={(e) => setServerSettings({...serverSettings, accessCode: e.target.value})}
                  placeholder="XuiOne Access Code"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API-KEY
                </label>
                <input
                  type="password"
                  value={serverSettings.apiKey}
                  onChange={(e) => setServerSettings({...serverSettings, apiKey: e.target.value})}
                  placeholder="XuiOne API-KEY"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveServerSettings}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-red-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Einstellungen Speichern
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="flex-1 bg-slate-800/50 border border-slate-700/50 text-white font-semibold py-3 px-6 rounded-lg hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳ Teste...' : '🔌 Verbindung Testen'}
                </button>
              </div>

              {/* Connection Status */}
              {connectionStatus && (
                <div className={`mt-4 rounded-lg p-4 ${
                  connectionStatus.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  <p className={`text-sm font-medium ${
                    connectionStatus.type === 'success' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {connectionStatus.message}
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <span className="font-bold">ℹ️ Hinweis:</span> Diese Einstellungen werden lokal gespeichert.
                  Die Server-URL sollte im Format "http://domain.com" oder "http://IP-Adresse" eingegeben werden.
                  Access Code und API-KEY erhalten Sie von Ihrem XuiOne Panel-Administrator.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-4">
            {/* Load Users Section */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <span className="text-2xl mr-2">🔄</span>
                  Benutzer von API Laden
                </h2>
                <button
                  onClick={loadUsersFromAPI}
                  disabled={isLoadingUsers}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingUsers ? '⏳ Laden...' : '🔄 Benutzer Aktualisieren'}
                </button>
              </div>
              <p className="text-sm text-slate-400">
                Lädt alle Benutzer-Lines vom konfigurierten XuiOne Panel-Server
              </p>
            </div>

            {/* User List */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                Benutzer-Liste ({userLines.length})
              </h2>

              {isLoadingUsers ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-red-500 mb-4"></div>
                  <p className="font-medium text-lg">Lade Benutzer von API...</p>
                </div>
              ) : userLines.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="font-medium text-lg">Keine Benutzer vorhanden</p>
                  <p className="text-sm mt-2">Klicken Sie auf "Benutzer Aktualisieren" um Daten von der API zu laden</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userLines.map((user) => (
                    <div
                      key={user.id}
                      className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 hover:border-red-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">{user.username}</h3>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              user.status === 'active'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {user.status === 'active' ? '✓ Aktiv' : '✗ Inaktiv'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-slate-400">
                            <div>
                              <span className="text-slate-500">Passwort:</span>
                              <span className="ml-2 font-mono">{'•'.repeat(8)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Max. Verbindungen:</span>
                              <span className="ml-2 font-semibold text-white">{user.maxConnections}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Aktive Verbindungen:</span>
                              <span className="ml-2 font-semibold text-green-400">{user.activeConnections || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Ablaufdatum:</span>
                              <span className="ml-2 font-semibold text-white">
                                {user.expiryDate ? new Date(user.expiryDate * 1000).toLocaleDateString('de-DE') : 'Unbegrenzt'}
                              </span>
                            </div>
                            <div>
                              {user.isTrial && (
                                <span className="inline-block bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-500/30">
                                  🎁 TRIAL
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-medium hover:bg-blue-500/30 transition-all"
                            title="Details anzeigen"
                          >
                            ℹ️ Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <span className="text-2xl mr-2">🌐</span>
              Allgemeine Einstellungen
            </h2>

            <div className="space-y-6 max-w-2xl">
              {/* Default Language */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Standard-Sprache für Benutzer
                </label>
                <div className="relative">
                  <select
                    value={serverSettings.defaultLanguage}
                    onChange={(e) => setServerSettings({ ...serverSettings, defaultLanguage: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {availableLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Diese Sprache wird für alle Benutzer als Standard verwendet. Benutzer können ihre eigene Sprache später selbst ändern.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-green-500/25"
                >
                  💾 Einstellungen Speichern
                </button>
              </div>

              {/* Status Message */}
              {connectionStatus && (
                <div className={`p-4 rounded-lg border ${
                  connectionStatus.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <p className="font-medium">{connectionStatus.message}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">Hinweis</p>
                    <p>Die Standard-Sprache wird allen neuen Benutzern beim ersten Login angezeigt. Benutzer können ihre Sprache jederzeit im Header über das Sprach-Dropdown ändern.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-b border-slate-800/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="text-3xl">👤</span>
                    {selectedUser.username}
                  </h2>
                  <p className="text-slate-400 mt-1">Benutzer-Details</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <span className="text-xl mr-2">📋</span>
                  Grundinformationen
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">Username</p>
                    <p className="text-white font-semibold">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Passwort</p>
                    <p className="text-white font-mono">{selectedUser.password}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">User ID</p>
                    <p className="text-white font-semibold">#{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Status</p>
                    <span className={`inline-block text-xs px-3 py-1 rounded-full font-semibold ${
                      selectedUser.status === 'active'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {selectedUser.status === 'active' ? '✓ Aktiv' : '✗ Inaktiv'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connection Info */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <span className="text-xl mr-2">🔌</span>
                  Verbindungsinformationen
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">Max. Verbindungen</p>
                    <p className="text-white font-semibold text-2xl">{selectedUser.maxConnections}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Aktive Verbindungen</p>
                    <p className="text-green-400 font-semibold text-2xl">{selectedUser.activeConnections}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Ablaufdatum</p>
                    <p className="text-white font-semibold">
                      {selectedUser.expiryDate ? new Date(selectedUser.expiryDate * 1000).toLocaleDateString('de-DE') : '♾️ Unbegrenzt'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Typ</p>
                    <div className="flex gap-2">
                      {selectedUser.isTrial && (
                        <span className="inline-block bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-500/30">
                          🎁 TRIAL
                        </span>
                      )}
                      {selectedUser.isRestreamer && (
                        <span className="inline-block bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded border border-purple-500/30">
                          🔄 RESTREAMER
                        </span>
                      )}
                      {!selectedUser.isTrial && !selectedUser.isRestreamer && (
                        <span className="text-slate-500">Standard</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              {selectedUser.ownerName && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <h3 className="text-lg font-bold mb-4 flex items-center">
                    <span className="text-xl mr-2">👨‍💼</span>
                    Besitzer
                  </h3>
                  <p className="text-white font-semibold">{selectedUser.ownerName}</p>
                </div>
              )}

              {/* Notes */}
              {(selectedUser.adminNotes || selectedUser.resellerNotes) && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <h3 className="text-lg font-bold mb-4 flex items-center">
                    <span className="text-xl mr-2">📝</span>
                    Notizen
                  </h3>
                  {selectedUser.adminNotes && (
                    <div className="mb-3">
                      <p className="text-slate-500 text-sm mb-1">Admin-Notizen:</p>
                      <p className="text-white bg-slate-900/50 p-3 rounded-lg">{selectedUser.adminNotes}</p>
                    </div>
                  )}
                  {selectedUser.resellerNotes && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Reseller-Notizen:</p>
                      <p className="text-white bg-slate-900/50 p-3 rounded-lg whitespace-pre-wrap">{selectedUser.resellerNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800/50 p-4 bg-slate-900/50">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white font-semibold py-3 px-6 rounded-lg hover:bg-slate-700/50 transition-all"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgb(51 65 85);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgb(71 85 105);
        }
      `}</style>
    </div>
  );
}
