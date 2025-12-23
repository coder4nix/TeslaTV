import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import { availableLanguages } from './languages';
import Profile from './components/Profile';

export default function Header({ userData, onLogout, activeTab, onTabChange, onProfileNavigation, onCategorySelect }) {
  const { t, currentLanguage, setUserLanguage } = useLanguage();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [seriesCategories, setSeriesCategories] = useState([]);
  const [moviesCategories, setMoviesCategories] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef(null);
  const menuTimeoutRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      console.log('[Header] loadCategories called');
      if (!userData) {
        console.log('[Header] No user data, skipping');
        return;
      }

      try {
        const serverSettings = localStorage.getItem('adminServerSettings');
        console.log('[Header] Server settings:', serverSettings ? 'found' : 'not found');
        if (!serverSettings) return;

        const { serverUrl, port, accessCode, apiKey } = JSON.parse(serverSettings);
        const apiUrl = `/api/${accessCode}/`;
        console.log('[Header] API URL:', apiUrl, 'API Key:', apiKey ? 'present' : 'missing');

        // Load series categories from API
        console.log('[Header] Fetching series categories from API...');

        // Try XStreamCodes player_api.php format
        try {
          const playerApiUrl = '/api/player_api.php';
          const seriesRes = await axios.get(playerApiUrl, {
            params: {
              username: userData.username,
              password: userData.password,
              action: 'get_series_categories'
            }
          });
          console.log('[Header] Series API (player_api) response:', Array.isArray(seriesRes.data) ? `Array with ${seriesRes.data.length} items` : seriesRes.data);

          // XStreamCodes returns array directly for categories
          if (Array.isArray(seriesRes.data)) {
            console.log('[Header] Loaded series categories from player_api:', seriesRes.data.length);
            setSeriesCategories(seriesRes.data);
          } else if (seriesRes.data?.status === 'STATUS_SUCCESS') {
            const categories = seriesRes.data.data || [];
            console.log('[Header] Loaded series categories from API:', categories.length);
            setSeriesCategories(categories);
          } else {
            console.error('[Header] Series API failed:', seriesRes.data);
          }
        } catch (err) {
          console.error('[Header] Error loading series categories:', err.message);
        }

        // Load movies categories from API (same as Movies.jsx)
        console.log('[Header] Fetching movies categories from API...');
        try {
          const playerApiUrl = '/api/player_api.php';
          const moviesRes = await axios.get(playerApiUrl, {
            params: {
              username: userData.username,
              password: userData.password,
              action: 'get_vod_categories'
            }
          });
          console.log('[Header] Movies API (player_api) response:', Array.isArray(moviesRes.data) ? `Array with ${moviesRes.data.length} items` : moviesRes.data);

          // XStreamCodes returns array directly for categories
          if (Array.isArray(moviesRes.data)) {
            console.log('[Header] Loaded movies categories from player_api:', moviesRes.data.length);
            setMoviesCategories(moviesRes.data);
          } else if (moviesRes.data?.status === 'STATUS_SUCCESS') {
            const categories = moviesRes.data.data || [];
            console.log('[Header] Loaded movies categories from API:', categories.length);
            setMoviesCategories(categories);
          } else {
            console.error('[Header] Movies API failed:', moviesRes.data);
          }
        } catch (err) {
          console.error('[Header] Error loading movies categories:', err.message);
        }
      } catch (error) {
        console.error('[Header] Error in loadCategories:', error);
      }
    };

    loadCategories();
  }, [userData]);

  // Menu hover handlers
  const handleMenuEnter = (menuId) => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    console.log('[Header] Menu entered:', menuId, 'Categories count:', getCategories(menuId).length);
    setActiveMenu(menuId);
  };

  const handleMenuLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 200);
  };

  // Format expiry date
  const formatExpiryDate = (expDate) => {
    if (!expDate || expDate === null || expDate === '0') {
      return t.header.unlimited;
    }
    const date = new Date(parseInt(expDate) * 1000);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Mask password
  const maskPassword = (password) => {
    return '•'.repeat(password?.length || 8);
  };

  // Get current language info
  const currentLangInfo = availableLanguages.find(lang => lang.code === currentLanguage) || availableLanguages[0];

  const navItems = [
    { id: 'series', label: t.nav.series, icon: null, hasDropdown: true },
    { id: 'movies', label: t.nav.movies, icon: null, hasDropdown: true },
    { id: 'live', label: t.nav.liveTV, icon: null, hasDropdown: false }
  ];

  const getCategories = (menuId) => {
    const allCategory = {
      category_id: null,
      category_name: menuId === 'series' ? t.nav.allSeries || 'Alle Serien' : t.nav.allMovies || 'Alle Filme'
    };

    if (menuId === 'series') return [allCategory, ...seriesCategories];
    if (menuId === 'movies') return [allCategory, ...moviesCategories];
    return [];
  };

  return (
    <>
      <header className="bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            {/* Logo */}
            <button
              onClick={() => onTabChange?.('home')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4V17c0 4.52-3.13 8.75-8 9.92-4.87-1.17-8-5.4-8-9.92V8.18l8-4zM11 10v6h2v-6h-2zm-3 0v6h2v-6H8zm6 0v6h2v-6h-2z"/>
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-black" style={{fontFamily: 'Outfit, sans-serif'}}>
                TV<span className="text-red-500">+</span>
              </h1>
            </button>

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-1 relative">
              {navItems.map((item) => (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => item.hasDropdown && handleMenuEnter(item.id)}
                  onMouseLeave={() => item.hasDropdown && handleMenuLeave()}
                >
                  <button
                    onClick={() => {
                      onTabChange?.(item.id);
                      // Clear category selection when clicking main menu
                      onCategorySelect?.(item.id, null);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center space-x-1 ${
                      activeTab === item.id
                        ? 'text-white bg-slate-800/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                    style={{fontFamily: 'Outfit, sans-serif'}}
                  >
                    <span>{item.label}</span>
                    {item.hasDropdown && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Megamenu Dropdown */}
                  {item.hasDropdown && activeMenu === item.id && getCategories(item.id).length > 0 && (() => {
                    const categories = getCategories(item.id);
                    const itemsPerColumn = 7;
                    const columnCount = Math.ceil(categories.length / itemsPerColumn);
                    const columns = [];

                    // Split categories into columns
                    for (let i = 0; i < columnCount; i++) {
                      columns.push(categories.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
                    }

                    return (
                      <div
                        className="absolute top-full left-0 mt-1 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-2 z-50"
                        style={{ width: columnCount > 1 ? `${columnCount * 16}rem` : '16rem' }}
                      >
                        <div className="flex">
                          {columns.map((columnCategories, columnIndex) => (
                            <div
                              key={columnIndex}
                              className="flex-1 min-w-64"
                              style={{ borderRight: columnIndex < columns.length - 1 ? '1px solid rgb(51 65 85 / 0.5)' : 'none' }}
                            >
                              {columnCategories.map((category) => (
                                <button
                                  key={category.category_id ?? 'all'}
                                  onClick={() => {
                                    onTabChange?.(item.id);
                                    onCategorySelect?.(item.id, category.category_id);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                                >
                                  {category.category_name}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </nav>
          </div>

          {/* Right side: Search & User Info */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Bar - Hidden on mobile */}
            <div className="relative hidden lg:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.header.searchPlaceholder}
                className="w-64 xl:w-80 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* User Avatar */}
            <button
              onClick={() => setShowProfile(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-slate-900 hover:scale-110 transition-transform cursor-pointer"
              title={t.profile.title}
            >
              {userData?.username?.charAt(0).toUpperCase()}
            </button>

            {/* Language Selector - Hidden on small mobile */}
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center space-x-1 px-2 py-1 hover:bg-slate-800 rounded-lg transition-colors"
                title={t.common.language}
              >
                <span className="text-lg">{currentLangInfo.flag}</span>
              </button>

              {showLanguageDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setUserLanguage(lang.code);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-700 transition-colors ${
                        currentLanguage === lang.code ? 'bg-slate-700/50' : ''
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-sm text-white">{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <svg className="w-4 h-4 ml-auto text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logout Button - Hidden on mobile */}
            <button
              onClick={onLogout}
              className="hidden sm:block p-2 hover:bg-slate-800 rounded-lg transition-colors group"
              title={t.header.logout}
            >
              <svg className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            {/* Hamburger Menu Button - Mobile only */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      </header>

      {/* Mobile Menu Slideout */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMobileMenu(false)}>
          <div
            className="absolute right-0 top-0 h-full w-64 bg-slate-900 shadow-2xl transform transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-4">
              {/* Close button */}
              <div className="flex justify-end">
                <button onClick={() => setShowMobileMenu(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange?.(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Divider */}
              <div className="border-t border-slate-800"></div>

              {/* Language Selector */}
              <div>
                <p className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">{t.common.language || 'Sprache'}</p>
                <div className="space-y-1">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setUserLanguage(lang.code);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                        currentLanguage === lang.code
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-sm flex-1 text-left">{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-800"></div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  onLogout();
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t.header.logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <Profile
          userData={userData}
          onClose={() => setShowProfile(false)}
          onNavigate={onProfileNavigation}
        />
      )}
    </>
  );
}
