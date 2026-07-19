import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// English translations
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enHome from '../locales/en/home.json';
import enProfile from '../locales/en/profile.json';
import enProgress from '../locales/en/progress.json';
import enTopics from '../locales/en/topics.json';

// Spanish translations
import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esHome from '../locales/es/home.json';
import esProfile from '../locales/es/profile.json';
import esProgress from '../locales/es/progress.json';
import esTopics from '../locales/es/topics.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    home: enHome,
    profile: enProfile,
    progress: enProgress,
    topics: enTopics,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    home: esHome,
    profile: esProfile,
    progress: esProgress,
    topics: esTopics,
  },
};

// Detect device language
const deviceLanguage = getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage, // Fallback to 'es' is handled by the ternary operator
    fallbackLng: 'en', // If a string is missing in 'es', fallback to 'en'
    interpolation: {
      escapeValue: false, // React already safe from xss
    },
    defaultNS: 'common',
    ns: ['common', 'auth', 'home', 'profile', 'progress', 'topics'],
  });

export default i18n;
