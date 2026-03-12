import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {getLocales} from 'expo-localization';
import en from './en';
import es from './es';
import th from './th';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

// Map full locale codes to our supported languages
const supportedLanguages = ['en', 'es', 'th'];
const fallbackLng = 'en';
const detectedLng = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : fallbackLng;

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: {translation: en},
    es: {translation: es},
    th: {translation: th},
  },
  lng: detectedLng,
  fallbackLng,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
