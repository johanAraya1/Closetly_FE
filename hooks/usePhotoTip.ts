/**
 * usePhotoTip Hook
 * Muestra un tip sobre cómo tomar buenas fotos, máximo 3 veces por dispositivo.
 * Persiste con AsyncStorage, funciona en RN y web.
 */

import { useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from './useTranslation';

const PHOTO_TIP_KEY = '@photo_tip_count';
const MAX_TIPS = 3;

export const usePhotoTip = () => {
  const { t } = useTranslation();
  const lastShownRef = useRef(0);

  const showTip = useCallback(async (onProceed?: () => void) => {
    // Debounce: evitar mostrar el tip dos veces seguidas
    const now = Date.now();
    if (now - lastShownRef.current < 2000) {
      onProceed?.();
      return;
    }
    lastShownRef.current = now;

    try {
      const stored = await AsyncStorage.getItem(PHOTO_TIP_KEY);
      const count = stored ? parseInt(stored, 10) : 0;

      if (count >= MAX_TIPS) {
        // Ya se mostró el máximo de veces, continuar sin tip
        onProceed?.();
        return;
      }

      const newCount = count + 1;
      await AsyncStorage.setItem(PHOTO_TIP_KEY, String(newCount));

      if (Platform.OS === 'web') {
        // En web, window.alert es bloqueante. El callback de Alert.alert
        // no se ejecuta porque react-native-web usa window.alert nativo.
        alert(`${t('garments.create.photoTipTitle')}\n\n${t('garments.create.photoTipMessage')}`);
        onProceed?.();
      } else {
        // En mobile, Alert.alert es asíncrono y respeta los botones.
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
      }
    } catch {
      // Si falla AsyncStorage, no romper el flujo
      onProceed?.();
    }
  }, [t]);

  return { showTip };
};
