/**
 * usePhotoTip Hook
 * Muestra un tip sobre cómo tomar buenas fotos, máximo 3 veces por dispositivo.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from './useTranslation';

const PHOTO_TIP_KEY = '@photo_tip_count';
const MAX_TIPS = 3;

export const usePhotoTip = () => {
  const { t } = useTranslation();
  const [remainingTips, setRemainingTips] = useState(MAX_TIPS);
  const [loaded, setLoaded] = useState(false);
  const lastShownRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PHOTO_TIP_KEY);
        const count = stored ? parseInt(stored, 10) : 0;
        setRemainingTips(Math.max(0, MAX_TIPS - count));
      } catch {
        // Si falla AsyncStorage, asumimos que quedan tips
        setRemainingTips(MAX_TIPS);
      }
      setLoaded(true);
    })();
  }, []);

  const incrementCount = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PHOTO_TIP_KEY);
      const count = stored ? parseInt(stored, 10) : 0;
      const newCount = count + 1;
      await AsyncStorage.setItem(PHOTO_TIP_KEY, String(newCount));
      setRemainingTips(Math.max(0, MAX_TIPS - newCount));
    } catch {
      // Si falla, no romper el flujo
    }
  }, []);

  const showTip = useCallback(async (onProceed?: () => void) => {
    if (!loaded) return;

    const stored = await AsyncStorage.getItem(PHOTO_TIP_KEY);
    const count = stored ? parseInt(stored, 10) : 0;

    if (count >= MAX_TIPS) {
      // Ya se mostró el máximo de veces, continuar sin tip
      onProceed?.();
      return;
    }

    // Debounce: evitar mostrar el tip dos veces seguidas
    const now = Date.now();
    if (now - lastShownRef.current < 2000) {
      onProceed?.();
      return;
    }
    lastShownRef.current = now;

    const newCount = count + 1;
    await AsyncStorage.setItem(PHOTO_TIP_KEY, String(newCount));
    setRemainingTips(Math.max(0, MAX_TIPS - newCount));

    Alert.alert(
      t('garments.create.photoTipTitle'),
      t('garments.create.photoTipMessage'),
      [
        {
          text: t('garments.create.photoTipGotIt'),
          onPress: () => onProceed?.(),
        },
      ],
    );
  }, [loaded, t]);

  return {
    showTip,
    remainingTips,
    loaded,
  };
};
