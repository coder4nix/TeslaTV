import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import { availableLanguages } from './languages';

export default function Login({ onLogin }) {
  const { t, currentLanguage, setUserLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Build API URL
  const buildApiUrl = () => {
    const serverSettings = localStorage.getItem('adminServerSettings');
    if (!serverSettings) {
      return null;
    }

    const { serverUrl, port, accessCode } = JSON.parse(serverSettings);

    if (import.meta.env.DEV) {
      return `/api/${accessCode}/`;
    }

    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    // Support relative URLs (starting with /) for proxy setup
    if (baseUrl.startsWith('/')) {
      return `${baseUrl}/${accessCode}/`;
    }

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
      console.log(`🔒 [Login] ${reason} detected - using /api/ proxy for ${serverOrigin}`);
      return `/api/${accessCode}/`;
    }

    const fullUrl = port ? `${baseUrl}:${port}/${accessCode}/` : `${baseUrl}/${accessCode}/`;
    return fullUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setLoginError(t.login.errorMissingFields);
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const apiUrl = buildApiUrl();
      if (!apiUrl) {
        setLoginError(t.login.errorServerNotConfigured);
        setIsLoggingIn(false);
        return;
      }

      const serverSettings = JSON.parse(localStorage.getItem('adminServerSettings'));

      // XuiOne API Login - get_lines
      const response = await axios.get(apiUrl, {
        params: {
          api_key: serverSettings.apiKey,
          action: 'get_lines'
        },
        timeout: 10000
      });

      if (response.data && response.data.status === 'STATUS_SUCCESS' && response.data.data) {
        // Find user in lines
        const userLine = response.data.data.find(
          line => line.username === username && line.password === password
        );

        if (userLine) {
          // Successful login
          const userData = {
            id: userLine.id,
            username: userLine.username,
            password: userLine.password,
            maxConnections: parseInt(userLine.max_connections) || 1,
            activeConnections: parseInt(userLine.active_connections) || 0,
            expiryDate: userLine.exp_date,
            status: userLine.enabled === '1' ? 'active' : 'inactive',
            isTrial: userLine.is_trial === '1',
            isRestreamer: userLine.is_restreamer === '1',
            ownerName: userLine.owner_name
          };

          // Save credentials if "remember me" is checked
          if (rememberMe) {
            localStorage.setItem('tesla_tv_credentials', JSON.stringify({
              username,
              password,
              timestamp: Date.now()
            }));
          }

          onLogin(userData);
        } else {
          setLoginError(t.login.errorInvalidCredentials);
        }
      } else {
        setLoginError(t.login.errorLoadingData);
      }
    } catch (error) {
      let errorMessage = t.login.errorConnection;
      if (error.response) {
        errorMessage += t.login.errorServerStatus + error.response.status;
      } else if (error.request) {
        errorMessage += t.login.errorNoResponse;
      } else {
        errorMessage += error.message;
      }
      setLoginError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Login Box */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 shadow-2xl p-8">
          {/* Logo Area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 rounded-2xl mb-4 shadow-lg shadow-red-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <svg className="w-12 h-12 text-white relative z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4V17c0 4.52-3.13 8.75-8 9.92-4.87-1.17-8-5.4-8-9.92V8.18l8-4zM11 10v6h2v-6h-2zm-3 0v6h2v-6H8zm6 0v6h2v-6h-2z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight" style={{fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em'}}>
              TESLA TV
            </h1>

            {/* Language Selector */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setUserLanguage(lang.code)}
                  className={`text-3xl transition-all duration-200 hover:scale-110 ${
                    currentLanguage === lang.code
                      ? 'scale-110 drop-shadow-lg'
                      : 'opacity-50 hover:opacity-100'
                  }`}
                  title={lang.name}
                >
                  {lang.flag}
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t.login.username}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.login.username}
                required
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t.login.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.login.password}
                required
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800/50 text-red-500 focus:ring-red-500/50 focus:ring-offset-0"
              />
              <label htmlFor="remember" className="ml-3 text-sm text-slate-300">
                {t.login.rememberMe}
              </label>
            </div>

            {/* Login Error */}
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-300">{loginError}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoggingIn ? t.login.loggingIn : t.login.loginButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
