/**
 * usePhotoTip Hook
 * Muestra un tip sobre cómo tomar buenas fotos, máximo 3 veces por dispositivo.
 * Usa el Modal de la app para una experiencia consistente en web y mobile.
 */

import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from './useTranslation';
import type { ModalType } from '@/components/Modal';

const PHOTO_TIP_KEY = '@photo_tip_count_v3';
const MAX_TIPS = 3;

export const usePhotoTip = () => {
  const { t } = useTranslation();
  const lastShownRef = useRef(0);
  const onProceedRef = useRef<(() => void) | undefined>(undefined);

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

      // Guardar el callback y mostrar el modal
      onProceedRef.current = onProceed;
      setTipTitle(t('garments.create.photoTipTitle'));
      setTipMessage(t('garments.create.photoTipMessage'));
      setTipVisible(true);
    } catch {
      // Si falla AsyncStorage, no romper el flujo
      onProceed?.();
    }
  }, [t]);

  const dismissTip = useCallback(() => {
    setTipVisible(false);
    // Ejecutar la acción pendiente después de cerrar el modal
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
