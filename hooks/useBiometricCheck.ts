/**
 * useBiometricCheck Hook
 * Hook para verificar biometría al cargar la sesión.
 *
 * Flujo:
 * 1. loadSession restaura sesión + flag biometricEnabled
 * 2. Si biometricEnabled → verificar hardware + enrolled
 * 3. Si todo ok → prompt biometric
 * 4. Si éxito → dejar pasar (isAuthenticated = true)
 * 5. Si falla → logout + redirect a login
 *
 * En web siempre retorna true (no hay biometría).
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '@/store/authStore';

interface BiometricCheckResult {
  success: boolean;
  reason?: string;
}

/**
 * Verifica si el dispositivo soporta biometría, si hay datos registrados,
 * y autentica al usuario. Retorna { success: boolean }.
 */
export async function checkBiometric(): Promise<BiometricCheckResult> {
  // Web no soporta biometría
  if (Platform.OS === 'web') {
    return { success: true };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: true };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      // El usuario tiene el flag activado pero no registró huella/Face ID
      await useAuthStore.getState().disableBiometric();
      return { success: true };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea Closetly',
      cancelLabel: 'Usar contraseña',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Usuario canceló o falló la autenticación
    return {
      success: false,
      reason: result.error,
    };
  } catch (error) {
    // Error inesperado (ej: Face ID no configurado en simulator)
    console.warn('Biometric check error:', error);
    return { success: true }; // Dejar pasar en caso de error
  }
}

/**
 * Hook que expone la función de verificación biométrica.
 * Útil si se necesita desde un componente con estado local.
 */
export function useBiometricCheck() {
  const checked = useRef(false);

  const authenticate = useCallback(async (): Promise<BiometricCheckResult> => {
    if (checked.current) {
      return { success: true };
    }
    checked.current = true;
    return await checkBiometric();
  }, []);

  const reset = useCallback(() => {
    checked.current = false;
  }, []);

  return { authenticate, reset };
}
