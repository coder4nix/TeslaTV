import tr from './tr';
import de from './de';
import en from './en';

// All available languages
export const languages = {
  tr,
  de,
  en
};

// List of available language codes
export const availableLanguages = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

// Default language
export const defaultLanguage = 'tr';

// Get language by code
export const getLanguage = (code) => {
  return languages[code] || languages[defaultLanguage];
};
