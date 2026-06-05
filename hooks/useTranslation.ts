/**
 * useTranslation Hook
 * Hook para usar traducciones en componentes con actualización INMEDIATA en toda la app
 */

import { useState, useEffect, useCallback } from 'react';
import i18n, { subscribeToLanguageChanges, notifyLanguageChange } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@app_language';

export const useTranslation = () => {
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    // Cargar idioma guardado al montar
    loadSavedLanguage();
    // Suscribirse a cambios de idioma desde CUALQUIER componente
    return subscribeToLanguageChanges(() => {
      setLocale(i18n.locale);
    });
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && savedLanguage !== i18n.locale) {
        i18n.locale = savedLanguage;
        setLocale(savedLanguage);
        notifyLanguageChange();
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = useCallback(async (newLocale: string) => {
    try {
      i18n.locale = newLocale;
      await AsyncStorage.setItem(LANGUAGE_KEY, newLocale);
      // Notificar a TODOS los componentes suscriptos
      notifyLanguageChange();
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, any>) => {
    return i18n.t(key, params);
  }, []);

  return {
    t,
    locale,
    changeLanguage,
    isSpanish: locale.startsWith('es'),
    isEnglish: locale.startsWith('en'),
  };
};
