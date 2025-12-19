import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './contexts/LanguageContext';
import { availableLanguages } from './languages';

export default function Header({ userData, onLogout }) {
  const { t, currentLanguage, setUserLanguage } = useLanguage();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <svg className="w-6 h-6 text-white relative z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4V17c0 4.52-3.13 8.75-8 9.92-4.87-1.17-8-5.4-8-9.92V8.18l8-4zM11 10v6h2v-6h-2zm-3 0v6h2v-6H8zm6 0v6h2v-6h-2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em'}}>
              TESLA TV
            </h1>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-slate-400">{t.header.welcome} </span>
                <span className="font-semibold text-white">{userData?.username}</span>
              </div>

              <span className={`px-2.5 py-1 text-xs rounded-full ${
                userData?.status === 'active'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {userData?.status === 'active' ? t.header.statusActive : t.header.statusInactive}
              </span>

              <div className="text-xs text-slate-400">
                {t.header.password}: <span className="text-slate-300">{maskPassword(userData?.password)}</span>
              </div>

              <div className="text-xs text-slate-400">
                {t.header.maxConnections}: <span className="text-slate-300">{userData?.maxConnections || 0}</span>
              </div>

              <div className="text-xs text-slate-400">
                {t.header.activeConnections}: <span className="text-slate-300">{userData?.activeConnections || 0}</span>
              </div>

              <div className="text-xs text-slate-400">
                {t.header.expiryDate}: <span className="text-slate-300">{formatExpiryDate(userData?.expiryDate)}</span>
              </div>
            </div>

            {/* Language Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-800 rounded-lg transition-colors"
                title={t.common.language}
              >
                <span className="text-xl">{currentLangInfo.flag}</span>
                <span className="text-xs text-slate-300">{currentLangInfo.code.toUpperCase()}</span>
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

            <button
              onClick={onLogout}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors group"
              title={t.header.logout}
            >
              <svg className="w-6 h-6 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
