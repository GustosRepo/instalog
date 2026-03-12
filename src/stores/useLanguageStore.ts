import {create} from 'zustand';
import i18n from '../i18n';
import {storage} from '../storage/mmkv';

const LANGUAGE_KEY = '@instalog/language';

export type AppLanguage = 'en' | 'es' | 'th';
export const SUPPORTED_LANGUAGES: {code: AppLanguage; label: string; nativeLabel: string}[] = [
  {code: 'en', label: 'English', nativeLabel: 'English'},
  {code: 'es', label: 'Spanish', nativeLabel: 'Español'},
  {code: 'th', label: 'Thai', nativeLabel: 'ภาษาไทย'},
];

interface LanguageState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  loadSavedLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: (i18n.language as AppLanguage) ?? 'en',

  setLanguage: (lang: AppLanguage) => {
    storage.setString(LANGUAGE_KEY, lang);
    i18n.changeLanguage(lang);
    set({language: lang});
  },

  loadSavedLanguage: () => {
    const saved = storage.getString(LANGUAGE_KEY) as AppLanguage | undefined;
    if (saved && ['en', 'es', 'th'].includes(saved)) {
      i18n.changeLanguage(saved);
      set({language: saved});
    }
  },
}));
