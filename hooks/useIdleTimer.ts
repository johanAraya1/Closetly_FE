/**
 * useIdleTimer Hook
 * Maneja auto-logout por inactividad:
 * - Detecta app en background > 5 min → logout al volver
 * - Detecta inactividad del usuario > 5 min → logout
 * - Resetea timer en cada interacción táctil
 *
 * 3 triggers:
 * 1. AppState: background → foreground con diferencia > IDLE_TIMEOUT
 * 2. Idle timer: sin interacción táctil por > IDLE_TIMEOUT
 * 3. AppState mount: arranca el timer al montar el hook
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/authStore';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutos
const IDLE_CHECK_INTERVAL = 30 * 1000; // Verificar cada 30s

export function useIdleTimer() {
  const [isAuthed, setIsAuthed] = useState(() => useAuthStore.getState().isAuthenticated);
  const lastActivity = useRef<number>(Date.now());
  const backgroundSince = useRef<number | null>(null);
  const idleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOut = useRef(false);

  // Suscribirse a cambios de isAuthenticated (Zustand)
  useEffect(() => {
    const unsub = useAuthStore.subscribe(
      (state) => state.isAuthenticated,
      (val) => setIsAuthed(val),
    );
    return unsub;
  }, []);

  const forcedLogout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    // Limpiar timer antes de logout
    if (idleInterval.current) {
      clearInterval(idleInterval.current);
      idleInterval.current = null;
    }

    const store = useAuthStore.getState();
    if (!store.isAuthenticated) {
      isLoggingOut.current = false;
      return;
    }

    try {
      // 1. Intentar refresh primero para cerrar sesión limpia en el backend
      //    Si falla, refreshToken() ya llama logout() internamente → salimos
      const refreshed = await store.refreshToken();
      if (!refreshed) {
        isLoggingOut.current = false;
        return;
      }

      // 2. Refresh OK → logout deliberado por inactividad
      await store.logout();
    } catch {
      useAuthStore.getState().logout();
    } finally {
      isLoggingOut.current = false;
    }
  }, []);

  // Resetear timer de inactividad
  const resetIdleTimer = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  // Iniciar el timer de chequeo de inactividad
  const startIdleTimer = useCallback(() => {
    if (idleInterval.current) {
      clearInterval(idleInterval.current);
    }

    idleInterval.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= IDLE_TIMEOUT) {
        forcedLogout();
      }
    }, IDLE_CHECK_INTERVAL);
  }, [forcedLogout]);

  // Detener el timer
  const stopIdleTimer = useCallback(() => {
    if (idleInterval.current) {
      clearInterval(idleInterval.current);
      idleInterval.current = null;
    }
  }, []);

  useEffect(() => {
    // Solo correr si hay sesión activa
    if (!isAuthed) return;

    // State change listener
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // App yéndose a background — guardar timestamp
        backgroundSince.current = Date.now();
        stopIdleTimer();
      } else if (nextState === 'active') {
        // App volviendo a foreground
        if (backgroundSince.current !== null) {
          const elapsed = Date.now() - backgroundSince.current;
          if (elapsed >= IDLE_TIMEOUT) {
            // Estuvo en background > 5 min → logout
            forcedLogout();
            backgroundSince.current = null;
            return;
          }
        }
        backgroundSince.current = null;
        // Resetear timer al volver
        resetIdleTimer();
        startIdleTimer();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    // Arrancar timer al montar
    startIdleTimer();

    return () => {
      appStateSub.remove();
      stopIdleTimer();
    };
  }, [forcedLogout, startIdleTimer, stopIdleTimer, resetIdleTimer, isAuthed]);

  return {
    resetIdleTimer,
    forcedLogout,
  };
}
