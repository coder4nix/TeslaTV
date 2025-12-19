import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import Login from './Login';
import Header from './Header';
import LiveTV from './LiveTV';
import Movies from './Movies';
import Series from './Series';

export default function App() {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('live');

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
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    const fullUrl = port ? `${baseUrl}:${port}/${accessCode}/` : `${baseUrl}/${accessCode}/`;
    return fullUrl;
  };

  // Check for saved credentials on mount and auto-login
  useEffect(() => {
    const savedCredentials = localStorage.getItem('tesla_tv_credentials');
    if (savedCredentials) {
      try {
        const { username, password } = JSON.parse(savedCredentials);

        // Re-authenticate with API to get full user data
        const autoLogin = async () => {
          try {
            const apiUrl = buildApiUrl();
            if (!apiUrl) {
              console.error('Server not configured');
              localStorage.removeItem('tesla_tv_credentials');
              return;
            }

            const serverSettings = JSON.parse(localStorage.getItem('adminServerSettings'));

            const response = await axios.get(apiUrl, {
              params: {
                api_key: serverSettings.apiKey,
                action: 'get_lines'
              },
              timeout: 10000
            });

            if (response.data && response.data.status === 'STATUS_SUCCESS' && response.data.data) {
              const userLine = response.data.data.find(
                line => line.username === username && line.password === password
              );

              if (userLine) {
                const fullUserData = {
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

                setUserData(fullUserData);
                setIsLoggedIn(true);
              } else {
                // Invalid credentials, clear saved data
                localStorage.removeItem('tesla_tv_credentials');
              }
            }
          } catch (error) {
            console.error('Auto-login failed:', error);
            localStorage.removeItem('tesla_tv_credentials');
          }
        };

        autoLogin();
      } catch (error) {
        console.error('Error loading saved credentials:', error);
        localStorage.removeItem('tesla_tv_credentials');
      }
    }
  }, []);

  const handleLogin = (credentials) => {
    setUserData(credentials);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    localStorage.removeItem('tesla_tv_credentials');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header userData={userData} onLogout={handleLogout} />

      {/* Main Navigation */}
      <nav className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/30 sticky top-[73px] z-40">
        <div className="container mx-auto px-6">
          <div className="flex space-x-2">
            {[
              { id: 'live', label: t.nav.liveTV, icon: '📡' },
              { id: 'movies', label: t.nav.movies, icon: '🎬' },
              { id: 'series', label: t.nav.series, icon: '📺' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-semibold transition-all duration-300 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-white bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span style={{fontFamily: 'Outfit, sans-serif'}}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'live' && <LiveTV userData={userData} />}
        {activeTab === 'movies' && <Movies userData={userData} />}
        {activeTab === 'series' && <Series userData={userData} />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}
