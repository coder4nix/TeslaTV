import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { availableLanguages } from './languages';
import Admin from './Admin';

export default function AdminArea() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Server Settings
  const [serverSettings, setServerSettings] = useState({
    serverUrl: '',
    port: '',
    accessCode: '',
    apiKey: '',
    defaultLanguage: 'tr'
  });

  // Setup Flow States
  const [setupStep, setSetupStep] = useState('server'); // 'server' or 'admin-user'
  const [connectionTested, setConnectionTested] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Local Admin User Creation
  const [localAdminCredentials, setLocalAdminCredentials] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(null);

  // Login States
  const [loginCredentials, setLoginCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Check if setup is already complete
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminServerSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Ensure defaultLanguage exists, default to 'tr' if not set
      if (!parsed.defaultLanguage) {
        parsed.defaultLanguage = 'tr';
      }
      setServerSettings(parsed);
      setSetupComplete(true);
    }

    // Check if admin is already logged in
    const savedAdminUser = sessionStorage.getItem('adminUser');
    if (savedAdminUser) {
      setAdminUser(JSON.parse(savedAdminUser));
      setIsAdminLoggedIn(true);
    }
  }, []);

  // Validation Functions
  const validateUsername = (username) => {
    if (username.length < 12) {
      return 'Benutzername muss mindestens 12 Zeichen lang sein';
    }
    return null;
  };

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 12) {
      errors.push('Mindestens 12 Zeichen');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Mindestens 1 Kleinbuchstabe');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Mindestens 1 Großbuchstabe');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Mindestens 1 Sonderzeichen');
    }

    return errors.length > 0 ? errors : null;
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;

    if (password.length >= 12) strength += 25;
    if (password.length >= 16) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15;

    if (strength <= 40) return { level: 'weak', color: 'red', label: 'Schwach' };
    if (strength <= 70) return { level: 'medium', color: 'yellow', label: 'Mittel' };
    return { level: 'strong', color: 'green', label: 'Stark' };
  };

  // Simple hash function for password storage
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Build API URL
  const buildApiUrl = () => {
    const { serverUrl, port, accessCode } = serverSettings;

    if (import.meta.env.DEV) {
      return `/api/${accessCode}/`;
    }

    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    // Support relative URLs (starting with /) for proxy setup
    if (baseUrl.startsWith('/')) {
      // Relative URL - don't add http://
      const fullUrl = `${baseUrl}/${accessCode}/`;
      return fullUrl;
    }

    // Absolute URL - add http:// if missing
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    // AUTOMATIC PROXY: Use proxy for cross-origin requests or Mixed Content
    const isPageHttps = window.location.protocol === 'https:';
    const isServerHttp = baseUrl.startsWith('http://');

    // Check if server is on different origin (domain/port)
    const serverUrlObj = new URL(port ? `${baseUrl}:${port}` : baseUrl);
    const currentOrigin = window.location.origin;
    const serverOrigin = serverUrlObj.origin;
    const isCrossOrigin = currentOrigin !== serverOrigin;

    // Use proxy if: (1) HTTPS→HTTP (Mixed Content) OR (2) Cross-Origin (CORS)
    if ((isPageHttps && isServerHttp) || isCrossOrigin) {
      const reason = isPageHttps && isServerHttp ? 'Mixed Content' : 'CORS';
      console.log(`🔒 ${reason} detected - using /api/ proxy for ${serverOrigin}`);
      return `/api/${accessCode}/`;
    }

    const fullUrl = port ? `${baseUrl}:${port}/${accessCode}/` : `${baseUrl}/${accessCode}/`;
    return fullUrl;
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!serverSettings.serverUrl || !serverSettings.accessCode || !serverSettings.apiKey) {
      alert('Bitte alle Felder ausfüllen!');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      const apiUrl = buildApiUrl();

      const response = await axios.get(apiUrl, {
        params: {
          api_key: serverSettings.apiKey,
          action: 'get_users'
        },
        timeout: 10000
      });

      if (response.data && response.data.status === 'STATUS_SUCCESS') {
        setConnectionStatus({
          type: 'success',
          message: '✓ Verbindung erfolgreich! Server ist erreichbar.'
        });
        setConnectionTested(true);
      } else if (response.data && response.data.status === 'STATUS_FAILURE') {
        setConnectionStatus({
          type: 'error',
          message: `✗ Fehler: ${response.data.error || 'Unbekannter Fehler'}`
        });
        setConnectionTested(false);
      } else {
        setConnectionStatus({
          type: 'error',
          message: '✗ Ungültige Antwort vom Server'
        });
        setConnectionTested(false);
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
      setConnectionTested(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save Settings and proceed to admin user creation
  const handleSaveSettings = () => {
    localStorage.setItem('adminServerSettings', JSON.stringify(serverSettings));
    setSetupStep('admin-user');
    setConnectionStatus(null);
  };

  // Create Local Admin User
  const handleCreateAdminUser = async () => {
    // Validate
    const errors = {};

    const usernameError = validateUsername(localAdminCredentials.username);
    if (usernameError) {
      errors.username = usernameError;
    }

    const passwordErrors = validatePassword(localAdminCredentials.password);
    if (passwordErrors) {
      errors.password = passwordErrors;
    }

    if (localAdminCredentials.password !== localAdminCredentials.confirmPassword) {
      errors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Hash password and save
    const hashedPassword = await hashPassword(localAdminCredentials.password);
    const adminUser = {
      username: localAdminCredentials.username,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('localAdminUser', JSON.stringify(adminUser));
    setSetupComplete(true);
  };

  // Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();

    if (!loginCredentials.username || !loginCredentials.password) {
      setLoginError('Bitte Username und Passwort eingeben');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      // Get local admin user
      const localAdmin = localStorage.getItem('localAdminUser');
      if (!localAdmin) {
        setLoginError('Kein Admin-Benutzer gefunden. Bitte Setup erneut durchführen.');
        setIsLoggingIn(false);
        return;
      }

      const adminData = JSON.parse(localAdmin);

      // Hash the entered password and compare
      const enteredPasswordHash = await hashPassword(loginCredentials.password);

      if (adminData.username === loginCredentials.username && adminData.passwordHash === enteredPasswordHash) {
        // Successful login
        const userData = {
          username: adminData.username,
          isLocalAdmin: true,
          createdAt: adminData.createdAt
        };

        setAdminUser(userData);
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('adminUser', JSON.stringify(userData));
      } else {
        setLoginError('Ungültige Anmeldedaten');
      }
    } catch (error) {
      setLoginError('Login-Fehler: ' + error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminUser(null);
    sessionStorage.removeItem('adminUser');
    setLoginCredentials({ username: '', password: '' });
  };

  // If admin is logged in, show Admin Dashboard
  if (isAdminLoggedIn && adminUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Admin Header */}
        <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/30 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <a href="/" className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-600 text-transparent bg-clip-text">
                  TESLA TV
                </a>
                <span className="text-slate-600">|</span>
                <span className="text-lg font-semibold text-slate-400">Admin Panel</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-400">Angemeldet als</p>
                  <p className="font-semibold">{adminUser.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Dashboard */}
        <main className="container mx-auto px-6 py-8">
          <Admin />
        </main>
      </div>
    );
  }

  // If setup is complete, show Login
  if (setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-600 text-transparent bg-clip-text mb-2">
              TESLA TV
            </h1>
            <p className="text-slate-400">Admin Panel Login</p>
          </div>

          {/* Login Form */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/30 p-8">
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Username
                </label>
                <input
                  type="text"
                  value={loginCredentials.username}
                  onChange={(e) => setLoginCredentials({ ...loginCredentials, username: e.target.value })}
                  placeholder="Admin Username"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                  disabled={isLoggingIn}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Passwort
                </label>
                <input
                  type="password"
                  value={loginCredentials.password}
                  onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                  placeholder="Admin Passwort"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                  disabled={isLoggingIn}
                />
              </div>

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-300">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-red-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? '⏳ Login läuft...' : '🔐 Als Admin Einloggen'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin User Creation Step
  if (setupStep === 'admin-user') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-600 text-transparent bg-clip-text mb-2">
              TESLA TV
            </h1>
            <p className="text-slate-400">Admin-Benutzer erstellen</p>
          </div>

          {/* Admin User Creation Form */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/30 p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <span className="text-3xl mr-3">👤</span>
              Lokaler Admin-Benutzer
            </h2>

            <p className="text-slate-400 mb-6">
              Erstellen Sie einen sicheren Admin-Benutzer für den Zugriff auf das Tesla TV Admin-Panel:
            </p>

            <div className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Benutzername <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={localAdminCredentials.username}
                  onChange={(e) => {
                    setLocalAdminCredentials({ ...localAdminCredentials, username: e.target.value });
                    setValidationErrors({ ...validationErrors, username: null });
                  }}
                  placeholder="Mindestens 12 Zeichen"
                  className={`w-full bg-slate-800/50 border ${validationErrors.username ? 'border-red-500/50' : 'border-slate-700/50'} rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all`}
                />
                {validationErrors.username && (
                  <p className="mt-2 text-sm text-red-400">⚠️ {validationErrors.username}</p>
                )}
                {localAdminCredentials.username.length > 0 && !validationErrors.username && localAdminCredentials.username.length >= 12 && (
                  <p className="mt-2 text-sm text-green-400">✓ Benutzername ist gültig</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Passwort <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={localAdminCredentials.password}
                  onChange={(e) => {
                    setLocalAdminCredentials({ ...localAdminCredentials, password: e.target.value });
                    setValidationErrors({ ...validationErrors, password: null });
                    if (e.target.value.length > 0) {
                      setPasswordStrength(calculatePasswordStrength(e.target.value));
                    } else {
                      setPasswordStrength(null);
                    }
                  }}
                  placeholder="Min. 12 Zeichen, Groß-/Kleinbuchstaben, Sonderzeichen"
                  className={`w-full bg-slate-800/50 border ${validationErrors.password ? 'border-red-500/50' : 'border-slate-700/50'} rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all`}
                />

                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-400">Passwortstärke:</span>
                      <span className={`font-semibold ${
                        passwordStrength.level === 'strong' ? 'text-green-400' :
                        passwordStrength.level === 'medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          passwordStrength.level === 'strong' ? 'bg-green-500 w-full' :
                          passwordStrength.level === 'medium' ? 'bg-yellow-500 w-2/3' : 'bg-red-500 w-1/3'
                        }`}
                      ></div>
                    </div>
                  </div>
                )}

                {validationErrors.password && (
                  <div className="mt-2 text-sm text-red-400">
                    <p className="font-semibold mb-1">⚠️ Passwort erfüllt nicht die Anforderungen:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.password.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Passwort bestätigen <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={localAdminCredentials.confirmPassword}
                  onChange={(e) => {
                    setLocalAdminCredentials({ ...localAdminCredentials, confirmPassword: e.target.value });
                    setValidationErrors({ ...validationErrors, confirmPassword: null });
                  }}
                  placeholder="Passwort wiederholen"
                  className={`w-full bg-slate-800/50 border ${validationErrors.confirmPassword ? 'border-red-500/50' : 'border-slate-700/50'} rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all`}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-400">⚠️ {validationErrors.confirmPassword}</p>
                )}
                {localAdminCredentials.confirmPassword.length > 0 && localAdminCredentials.password === localAdminCredentials.confirmPassword && (
                  <p className="mt-2 text-sm text-green-400">✓ Passwörter stimmen überein</p>
                )}
              </div>

              {/* Security Requirements Info */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-300 mb-2">🔒 Sicherheitsanforderungen:</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Benutzername: Mindestens 12 Zeichen</li>
                  <li>• Passwort: Mindestens 12 Zeichen</li>
                  <li>• Mindestens 1 Großbuchstabe (A-Z)</li>
                  <li>• Mindestens 1 Kleinbuchstabe (a-z)</li>
                  <li>• Mindestens 1 Sonderzeichen (!@#$%...)</li>
                </ul>
              </div>

              {/* Create Admin Button */}
              <button
                onClick={handleCreateAdminUser}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-green-500/20"
              >
                ✅ Admin-Benutzer Erstellen
              </button>

              {/* Back Button */}
              <button
                onClick={() => setSetupStep('server')}
                className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-300 font-semibold py-3 px-6 rounded-lg hover:bg-slate-700/50 transition-all"
              >
                ← Zurück zu Server-Einstellungen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial Setup
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-600 text-transparent bg-clip-text mb-2">
            TESLA TV
          </h1>
          <p className="text-slate-400">Admin Panel Setup</p>
        </div>

        {/* Setup Form */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/30 p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="text-3xl mr-3">🛠️</span>
            Ersteinrichtung
          </h2>

          <p className="text-slate-400 mb-6">
            Bitte geben Sie die Verbindungsdaten zu Ihrem XuiOne Panel ein:
          </p>

          <div className="space-y-4">
            {/* Server URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Server-URL / IP-Adresse
              </label>
              <input
                type="text"
                value={serverSettings.serverUrl}
                onChange={(e) => setServerSettings({ ...serverSettings, serverUrl: e.target.value })}
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
                onChange={(e) => setServerSettings({ ...serverSettings, port: e.target.value })}
                placeholder="z.B. 80, 8080, 25461"
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
                onChange={(e) => setServerSettings({ ...serverSettings, accessCode: e.target.value })}
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
                onChange={(e) => setServerSettings({ ...serverSettings, apiKey: e.target.value })}
                placeholder="XuiOne API-KEY"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
              />
            </div>

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

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-semibold py-3 px-6 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? '⏳ Teste Verbindung...' : '🔌 Verbindung Testen'}
            </button>

            {/* Connection Status */}
            {connectionStatus && (
              <div className={`rounded-lg p-4 ${
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

            {/* Save Settings Button (only shown after successful test) */}
            {connectionTested && (
              <button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-red-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-red-500/20"
              >
                Weiter zur Admin-Benutzer-Erstellung →
              </button>
            )}
          </div>

          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <span className="font-bold">ℹ️ Hinweis:</span> Im nächsten Schritt erstellen Sie einen lokalen Admin-Benutzer für Tesla TV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
