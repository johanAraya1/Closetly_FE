/**
 * usePhotoTip Hook
 * Muestra un tip sobre cómo tomar buenas fotos, máximo 3 veces por dispositivo.
 * En mobile usa Alert.alert nativo (confiable). En web usa Modal de la app.
 */

import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from './useTranslation';
import type { ModalType } from '@/components/Modal';

const PHOTO_TIP_KEY = '@photo_tip_count_v4';
const MAX_TIPS = 3;

export const usePhotoTip = () => {
  const { t } = useTranslation();
  const lastShownRef = useRef(0);
  const onProceedRef = useRef<(() => void) | undefined>(undefined);

  // Solo para web: estado del Modal
  const isWeb = Platform.OS === 'web';
  const [tipVisible, setTipVisible] = useState(false);
  const [tipTitle, setTipTitle] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [tipType] = useState<ModalType>('info');

  const showTip = useCallback(async (onProceed?: () => void) => {
    // Debounce
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
        onProceed?.();
        return;
      }

      const newCount = count + 1;
      await AsyncStorage.setItem(PHOTO_TIP_KEY, String(newCount));

      if (isWeb) {
        // Web: guardar callback y mostrar Modal de la app
        onProceedRef.current = onProceed;
        setTipTitle(t('garments.create.photoTipTitle'));
        setTipMessage(t('garments.create.photoTipMessage'));
        setTipVisible(true);
      } else {
        // Mobile: Alert.alert nativo (soporta callbacks correctamente)
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
      onProceed?.();
    }
  }, [t, isWeb]);

  const dismissTip = useCallback(() => {
    setTipVisible(false);
    const proceed = onProceedRef.current;
    onProceedRef.current = undefined;
    proceed?.();
  }, []);

  return {
    showTip,
    dismissTip,
    tipVisible,
    tipTitle,
    tipMessage,
    tipType,
  };
};
