import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguage, defaultLanguage as defaultLangCode } from '../languages';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(defaultLangCode);
  const [translations, setTranslations] = useState(getLanguage(defaultLangCode));

  // Load language preference on mount
  useEffect(() => {
    // First check for user preference
    const userLanguage = localStorage.getItem('userLanguage');
    if (userLanguage) {
      changeLanguage(userLanguage);
      return;
    }

    // Then check for admin default language
    const adminSettings = localStorage.getItem('adminServerSettings');
    if (adminSettings) {
      try {
        const { defaultLanguage } = JSON.parse(adminSettings);
        if (defaultLanguage) {
          changeLanguage(defaultLanguage);
          return;
        }
      } catch (error) {
        console.error('Error loading admin language settings:', error);
      }
    }

    // Fall back to default
    changeLanguage(defaultLangCode);
  }, []);

  const changeLanguage = (langCode) => {
    const newTranslations = getLanguage(langCode);
    setCurrentLanguage(langCode);
    setTranslations(newTranslations);
  };

  const setUserLanguage = (langCode) => {
    localStorage.setItem('userLanguage', langCode);
    changeLanguage(langCode);
  };

  const value = {
    currentLanguage,
    translations,
    t: translations, // Shorthand for translations
    changeLanguage,
    setUserLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
