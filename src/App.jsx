import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import Login from './Login';
import Header from './Header';
import Home from './Home';
import LiveTV from './LiveTV';
import Movies from './Movies';
import Series from './Series';

export default function App() {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedSeriesId, setSelectedSeriesId] = useState(null);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMovieCategory, setSelectedMovieCategory] = useState(null);
  const [selectedSeriesCategory, setSelectedSeriesCategory] = useState(null);

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

  const handleNavigateToSeries = (seriesId) => {
    setSelectedSeriesId(seriesId);
    setActiveTab('series');
  };

  const handleNavigateToMovie = (movieId) => {
    setSelectedMovieId(movieId);
    setActiveTab('movies');
  };

  // Handle navigation from Profile (watchlist)
  const handleProfileNavigation = (type, itemId) => {
    if (type === 'movies') {
      handleNavigateToMovie(itemId);
    } else if (type === 'series') {
      handleNavigateToSeries(itemId);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear selected items when changing tabs
    if (tab !== 'series') {
      setSelectedSeriesId(null);
      setSelectedSeriesCategory(null);
    }
    if (tab !== 'movies') {
      setSelectedMovieId(null);
      setSelectedMovieCategory(null);
    }
  };

  const handleCategorySelect = (tabType, categoryId) => {
    console.log('[App] Category selected:', tabType, categoryId);
    if (tabType === 'movies') {
      setSelectedMovieCategory(categoryId);
    } else if (tabType === 'series') {
      setSelectedSeriesCategory(categoryId);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header
        userData={userData}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onProfileNavigation={handleProfileNavigation}
        onCategorySelect={handleCategorySelect}
      />

      {/* Breadcrumb Container - Always visible below header */}
      <div className="bg-slate-950 border-b border-slate-800/30">
        <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-3">
          {/* Breadcrumb will be rendered here by each page component */}
          <div id="breadcrumb-container"></div>
        </div>
      </div>

      {/* Content Area */}
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'home' && <Home userData={userData} isActive={activeTab === 'home'} onTabChange={handleTabChange} onNavigateToSeries={handleNavigateToSeries} onNavigateToMovie={handleNavigateToMovie} />}
        {activeTab === 'live' && <LiveTV userData={userData} isActive={activeTab === 'live'} onTabChange={handleTabChange} />}
        {activeTab === 'movies' && <Movies userData={userData} isActive={activeTab === 'movies'} initialSelectedMovieId={selectedMovieId} initialSelectedCategory={selectedMovieCategory} onTabChange={handleTabChange} />}
        {activeTab === 'series' && <Series userData={userData} isActive={activeTab === 'series'} initialSelectedSeriesId={selectedSeriesId} initialSelectedCategory={selectedSeriesCategory} onTabChange={handleTabChange} />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}
