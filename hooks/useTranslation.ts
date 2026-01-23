/**
 * useTranslation Hook
 * Hook para usar traducciones en componentes
 */

import { useState, useEffect } from 'react';
import i18n from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@app_language';

export const useTranslation = () => {
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        i18n.locale = savedLanguage;
        setLocale(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLocale: string) => {
    try {
      i18n.locale = newLocale;
      setLocale(newLocale);
      await AsyncStorage.setItem(LANGUAGE_KEY, newLocale);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string, params?: Record<string, any>) => {
    return i18n.t(key, params);
  };

  return {
    t,
    locale,
    changeLanguage,
    isSpanish: locale.startsWith('es'),
    isEnglish: locale.startsWith('en'),
  };
};
